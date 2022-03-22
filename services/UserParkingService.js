import util from 'util';
import async from 'async';
import config from 'nconf';
import i18next from 'i18next';
import request from 'request';
import moment from 'moment';
import logger from '../config/log';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import deviceHistoryModel from '../models/deviceHistoryModel';
import approvedDeviceModel from '../models/approvedDeviceModel'
import UserParkingModel from '../models/userParkingModel'
import DeviceStatusType from '../models/type/DeviceStatusType'
import DeviceType from '../models/type/DeviceType'
import ParkingFeeStatusType from '../models/type/ParkingFeeStatusType'
import mongoose from 'mongoose';
import { getApprovedDeviceId, calculateParkingFee, calculateStandardParkingFee} from '../utils/parkingUtil';
import { filterSortDistance, circleGroupCoordinate, lineGroupCoordinate } from '../utils/geoUtil';
import { generateOutTradeId } from '../utils/stringUtil';

let {Types: {ObjectId}} = mongoose;

const PARKINGFEE_TIMERANG_MINS = 15;
const PARKINGCOST_DEFAULT = 60;
export const SELECT_DEVICE = {nodeId:1,name:1,desc:1,longitude:1,latitude:1,parkingFeeCost:1,onlineStatus:1,batteryVoltage:1,temperature:1,parkingDetect:1,geotagId:1,power:1};

export function getParking(bean, req, res, cb) {
  console.log('[getParking] req.body.user: ', req.body.user);
  let {input, output} = bean;
  let allParkingResult, nearbyParkingResult;
  async.series({
    getAllParking: function(callback) {
      let aggregateArray = [];
      aggregateArray.push({
        $match:{
          'valid': true,
          'deviceType': DeviceType.PARKINGSENSOR.value,
        }
      });
      if (!req.body.user.code || req.body.user.code != 'compal_adm') {
        aggregateArray.push({
          $match:{
            'levelOneId': ObjectId(req.body.user.levelOneId),
          }
        });
      }
      if (req.body.user.levelTwoId) {
        aggregateArray.push({
          $match:{
            'levelTwoId': ObjectId(req.body.user.levelTwoId),
          }
        });
      }
      aggregateArray.push({
        $lookup: {
          'from': 'GeoTag',
          'localField': 'geotagId',
          'foreignField': '_id',
          'as': 'geotagId',
        }
      }),
      aggregateArray.push({
        $unwind: {
          path: '$geotagId',
          preserveNullAndEmptyArrays: true,
        }
      }),
      aggregateArray.push({
        $project: {
          '_id': 0,
          ...SELECT_DEVICE,
        }
      });
      approvedDeviceModel.aggregate(aggregateArray, (err, results) => {
        if (err) {
          return cb && cb(err);
        } else if ((results && results.length > 0) || input.status || input.deviceType){
          allParkingResult = results || [];
          return callback(null);
        } else {
          return cb && cb({name: 'NodeIdNotFound'});
        }
      });
    },
    checkNearbyParking: function(callback) {
      if (input.maxDistance){
        let userCoordinate =  {"longitude": input.longitude, "latitude": input.latitude};
        let parkingList = filterSortDistance(userCoordinate, allParkingResult, input.maxDistance);      
        nearbyParkingResult = {
          "pointGroupList": parkingList,
          "lineGroupList": lineGroupCoordinate(parkingList),
          "circleGroupList": circleGroupCoordinate(parkingList, input.maxDistance)
        }
      }else{
        nearbyParkingResult = allParkingResult;
      }
      callback(null);      
    }
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    } 
    input.parkingData = nearbyParkingResult;
    cb && cb(null);
  });
}

export function getLatestUserParkingHistory(bean, req, res, cb) {
  let {input, output} = bean;
  let where = {
    'valid': true,
    'customerId': req.body.user._id
  };
  UserParkingModel.find(where)
  .sort({'modifyTime':-1})
  .limit(1)
  .populate({
    path: 'approvedDeviceId',
    select: '_id name desc parkingFeeCost longitude latitude parkingFeeStandardId',
    match: {'valid': true},
  })
  .populate({
    path: 'customerId',
    select: '_id name',
    match: {'valid': true},
  })
  .exec(function(err, result) {
    //console.log('[getLatestUserParkingHistory] result: ', result);
    let response;
    if (err) return cb && cb(err);
    if (!result || !result.length) return cb && cb({name: 'UserParkingDataNotFound'});
    let data = JSON.parse(JSON.stringify(result[0]));
    if (data.parkingFeeStatus == ParkingFeeStatusType.NORMAL.value){
      
    }else if (data.parkingFeeStatus == ParkingFeeStatusType.UNFINISHED.value){
      let startTime;
      if (data.deviceStartParkTime){
        startTime = compareDate(data.userStartParkTime, data.deviceStartParkTime, 'max');
      }else{
        startTime = data.userStartParkTime;
      }
      data.startParkTimeForFee = startTime;
      data.endParkTimeForFee = new Date();
      data.sumParkingTime = minsTimeDifference(new Date(startTime), data.endParkTimeForFee)
    }
    data.parkingFeeCost = PARKINGCOST_DEFAULT;

    delete data.valid;
    delete data.deviceStartParkTime;
    delete data.deviceEndParkTime;
    delete data.userStartParkTime;
    delete data.userEndParkTime;

    if(data.approvedDeviceId){
      calculateStandardParkingFee(data.approvedDeviceId, data.startParkTimeForFee, data.endParkTimeForFee, 
      function(err2, result2){
        if (err2) return cb && cb(err2);
        if (result2 =='No parkingFeeStandardId'){
          data.sumParkingFee = calculateParkingFee(PARKINGCOST_DEFAULT, data.sumParkingTime);
        }else{
          data.sumParkingFee = result2;
        }
          
        input.latestResult = data;
        return cb && cb(null);   
      });
    }
  });
}

export function syncUserParkingHistory(bean, req, res, cb) {
  let {input, output} = bean;
  let where = {
    'valid': true,
    'modifyTime': {'$gt': input.timeStamp},
    'customerId': req.body.user._id
  };
  UserParkingModel.find(where)
  .sort('modifyTime')
  .limit((input.counts > 10000) ? 10000 : input.counts)
  .populate({
    path: 'approvedDeviceId',
    select: '_id name desc parkingFeeCost longitude latitude',
    match: {'valid': true},
  })
  .populate({
    path: 'customerId',
    select: '_id name carId',
    match: {'valid': true},
  })
  .exec(function(err, result) {
    console.log('[syncUserParkingHistory] result: ', result);
    let response;
    if (err) return cb && cb(err);
    if (result.length != 0){
      response = {
        "timeStamp" : result[result.length - 1].modifyTime,
        "userParkingHistory" : result
      }
      input.syncResult = response;
      return cb && cb(null);
    }else {
      response = {
        "timeStamp" : new Date(),
        "userParkingHistory" : result
      }
      input.syncResult = response;
      return cb && cb(null);
    }
  });
}

export function startParking(bean, req, res, cb) {
  console.log('[startParking] req.body.user: ', req.body.user);
  let {input, output} = bean;
  console.log('[startParking] input: ', input);
  let latestParkingId = null;
  let saveDataResult;
  async.series({
    checkNodeLastParkingStatus: function(callback) {
      let where = {
        'valid': true,
        'nodeId': input.nodeId
      };
      UserParkingModel.find(where)
      .sort({'modifyTime': -1})
      .limit(1)
      .exec(function(err, result) {
        let data;
        if (err) return cb && cb(err);
        if(!result || !result.length){
          console.log('[startParking] No data, nodeId: ', input.nodeId);
          return callback(null);
        }
        result = result[0];
        if(result.parkingFeeStatus == '0' && !result.userStartParkTime && result.deviceStartParkTime && !result.deviceEndParkTime){
          latestParkingId = result._id;
          console.log('[startParking] latestParkingId: ', latestParkingId);
        }
        callback(null);
      });
    },
    saveStartParkingTime: function(callback) {
      if(latestParkingId){
        let updateData = {
          'outTradeId': generateOutTradeId(req.body.user.code),
          'customerId': req.body.user._id,
          'carId': req.body.user.carId[0],
          'userStartParkTime': new Date()//input.startParkingTime
        };
        UserParkingModel.findOneAndUpdate({'_id': latestParkingId, 'valid': true},
        updateData, {new: true}, function(err, result) {
          if (err) return cb && cb(err); 
          if (!result) {
            return cb && cb({name: 'UserParkingDataNotFound'});  
          }
          console.log('[startParking] Update data done, nodeId: ', input.nodeId);
          saveDataResult = result;
          callback(null);
        });
      }else{
        getApprovedDeviceId(input.nodeId, (err, idResult)=>{
          if (err) return cb && cb(err); 
          if(!req.body.user || !req.body.user._id || !req.body.user.carId || !req.body.user.carId.length){
            return cb && cb({name: 'CreateError'});  
          }
          let saveData = {
            'outTradeId': generateOutTradeId(req.body.user.code),
            'approvedDeviceId': idResult,
            'customerId': req.body.user._id,
            'carId': req.body.user.carId[0],
            'nodeId': input.nodeId,
            'userStartParkTime': new Date()//input.startParkingTime
          }
          let db = new UserParkingModel(saveData);
          db.save((err2, resdata)=>{
            if (err2) cb && cb(err2);
            console.log('[startParking] saveData result:', resdata);
            saveDataResult = resdata;
            callback(null);
          });
        }); 
      }
    }
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    } 
    input.saveResult = saveDataResult;
    cb && cb(null);
  });
}

export function endParking(bean, req, res, cb) {
  let {input, output} = bean;
  let latestParkingId = null;
  let parkingResult, sumResult;
  let update = {};
  async.series({
    updateEndParkingTime: function(callback) {
      let updateData = {
        'userEndParkTime': new Date()//input.endParkingTime
      };
      UserParkingModel.findOneAndUpdate({'_id': input._id, 'parkingFeeStatus': "0", 'valid': true},
      updateData, {new: true}, function(err, result) {
        if (err) return cb && cb(err) 
        if (!result) {
          return cb && cb({name: 'UserParkingDataNotFound'});   
        }
        console.log('[saveStartParkingTime] Update data done 1, result: ', result);
        parkingResult = result;
        callback(null);
      });
    },
    sumParkingFee: function(callback) { 
      if(parkingResult.userStartParkTime || parkingResult.deviceStartParkTime){
        update.startParkTimeForFee = compareDate(parkingResult.userStartParkTime, parkingResult.deviceStartParkTime, 'max');
      }else{
        return cb && cb({name: 'UserParkingTimeNotComplete'});   
      }
      if(parkingResult.userEndParkTime || parkingResult.deviceEndParkTime){
        update.endParkTimeForFee = compareDate(parkingResult.userEndParkTime, parkingResult.deviceEndParkTime, 'min');
      }else{
        return cb && cb({name: 'UserParkingTimeNotComplete'});   
      }
      update.sumParkingTime = minsTimeDifference(update.startParkTimeForFee, update.endParkTimeForFee);
      //update.sumParkingFee = calculateParkingFee(PARKINGCOST_DEFAULT, update.sumParkingTime);
      update.parkingFeeStatus = "1";
      if(parkingResult.approvedDeviceId){
        calculateStandardParkingFee(parkingResult.approvedDeviceId, update.startParkTimeForFee, update.endParkTimeForFee, 
        function(err, result){
          if (err) return cb && cb(err);
          if (result =='No parkingFeeStandardId'){
            update.sumParkingFee = calculateParkingFee(PARKINGCOST_DEFAULT, update.sumParkingTime);
          }else{
            update.sumParkingFee = result;
          }      
          console.log('[sumParkingFee] Update data: ', update);   
          callback(null);   
        });
      }
    },
    updateUserParking: function(callback) {
      UserParkingModel.findOneAndUpdate({'_id': input._id, 'parkingFeeStatus': "0", 'valid': true},
      update, {new: true}, function(err, result) {
        if (err) return cb && cb(err)
        if (!result) {
          return cb && cb({name: 'UserParkingDataNotFound'});   
        }
        console.log('[sumParkingFee] Update data done 2, result: ', result);
        sumResult = result;
        callback(null);
      });
    }
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    } 
    input.sumResult = sumResult;
    cb && cb(null);
  });  
}

function compareDate(time1, time2, Maxmin){
  console.log('[checkNodeLastParkingStatus] time1: ', time1 );
  console.log('[checkNodeLastParkingStatus] time2: ', time2 );
  if (!time1) time1 = 0;
  if (!time2) time2 = 0;
  if (Maxmin == 'max') {
    let maxTime = Math.max(new Date(time1), new Date(time2));
    return new Date(maxTime);
  }else{
    if(!time1 || !time2){
      return new Date(Math.max(new Date(time1), new Date(time2)));
    }
    let minTime = Math.min(new Date(time1), new Date(time2));
    return new Date(minTime);
  }
}

// function endParking(bean, req, res, cb) {
//   let userParkingResult, deviceStatusResult, updateData, updateResult;
//   let {input, output} = bean;
//   async.series({
//     getUserParkingHistory: function(callback) {
//       let where = {
//         'valid': true, 
//         '_id': input.parkingId
//       };
//       UserParkingModel.find(where)
//       .exec(function(err, results) {
//         if (err){
//           return cb && cb(err);
//         }
//         if(!results || !results.length){
//           return cb && cb({name: 'ParkingIdNotFound'});
//         }else{
        	
//           userParkingResult = results[0];
//           console.log('[getUserParkingHistory] userParkingResult: ', userParkingResult );
//           callback(null)
//         }
//       });
//     },
//     getDeviceStatusHistory: function(callback) {
//     	let userStartParkDate = new Date(userParkingResult.userStartParkTime);
//     	let startDate = new Date(userStartParkDate).setDate(userStartParkDate.getDate()-PARKINGFEE_TIMERANG_MINS);
//       let userEndParkDate = new Date(input.userEndParkTime);
//     	let endDate = new Date(userEndParkDate).setDate(userEndParkDate.getDate()+PARKINGFEE_TIMERANG_MINS);
//       console.log('[getDeviceStatusHistory] startDate: ', new Date(startDate) );
//       console.log('[getDeviceStatusHistory] endDate: ', new Date(endDate) );

//       let where = {
//         'valid': true, 
//         'nodeId': userParkingResult.nodeId,
//         'timestamp': {'$gte': startDate, '$lt': endDate}
//       };
//       deviceStatusHistoryModel.find(where)
//       .sort({'timestamp':1})
//       .exec(function(err, results) {
//         if (err){
//           return cb && cb(err);
//         }
//         if(!results || !results.length){
//           return cb && cb({name: 'nodeIdNotFound'});
//         }else{
//           deviceStatusResult = results;
//           callback(null)
//         }
//       });
//     },
//     calculateParkingTime: function(callback) {
//       let parkingHistory = [];
//       let data;
//       deviceStatusResult.forEach(function(element, i, array) {
//         //console.log('[getParkingStatus] i: ', i );
//         if (i>0 && deviceStatusResult[i-1].parkingDetect=="0" && element.parkingDetect=="1"){
//           data = {
//             'startParking': element.timestamp,
//             'startParkMessageId': element.messageId
//           }
//           parkingHistory.push(data);
//         } 
//         if (i>0 && deviceStatusResult[i-1].parkingDetect=="1" && element.parkingDetect=="0"){
//           data = {
//             'endParking': element.timestamp,
//             'endParkMessageId': element.messageId
//           }
//           if (parkingHistory.length > 0 && (parkingHistory[parkingHistory.length-1].startParking)){
//             data.timePeriod = minsTimeDifference(parkingHistory[parkingHistory.length-1].startParking, element.timestamp);
//           }
//           if (parkingHistory[parkingHistory.length-1] ){
//           	parkingHistory[parkingHistory.length-1].endParking = data.endParking;
//           	parkingHistory[parkingHistory.length-1].endParkMessageId = data.endParkMessageId;
//           	parkingHistory[parkingHistory.length-1].timePeriod = data.timePeriod;
//           }else{
//           	parkingHistory.push(data);
//           }   
//         } 
//       }); 
//       parkingHistory = filterAndSortTimePeriod(parkingHistory);
//       if (parkingHistory[0]){
//         updateData = {
//         	'startParkMessageId' : parkingHistory[0].startParkMessageId,
//           'endParkMessageId'   : parkingHistory[0].endParkMessageId,
//         	'userEndParkTime'    : input.userEndParkTime,
//         	'deviceStartParkTime': parkingHistory[0].startParking,
//           'deviceEndParkTime'  : parkingHistory[0].endParking,
//           'startParkTimeForFee': parkingHistory[0].startParking,
//           'endParkTimeForFee'  : parkingHistory[0].endParking,
//           'parkingTime'        : parkingHistory[0].timePeriod,
//           'parkingFeeStatus'   : "1"
//         }
//       }else{
//         updateData = {
//         	//'startParkMessageId' : parkingHistory[0].startParkMessageId,
//           //'endParkMessageId'   : parkingHistory[0].endParkMessageId,
//         	'userEndParkTime'    : input.userEndParkTime,
//         	//'deviceStartParkTime': ,
//           //'deviceEndParkTime'  : ,
//           'startParkTimeForFee': userParkingResult.userStartParkTime,
//           'endParkTimeForFee'  : input.userEndParkTime,
//           'parkingTime'        : minsTimeDifference(userParkingResult.userStartParkTime, input.userEndParkTime),
//           'parkingFeeStatus'   : "2"
//         }
//       }
//       callback(null);
//     },
//     updateUserParkingHistory: function(callback) {
//       let where = {
//         'valid': true, 
//         '_id': input.parkingId
//       };
//       UserParkingModel.findOneAndUpdate(where, {$set: updateData}, {new: true}
//       , function(err, result){    
//         if (err){
//           return cb && cb(err);
//         }
//         if(!result || !result.length){
//           return cb && cb({name: 'ParkingIdNotFound'});
//         }else{
//           updateResult = result;
//           callback(null)
//         }
//       });
//     },
//   }, function(err, results) {
//     // let response ={
//     //   'device': approvedDeviceResult,
//     //   'parkingHistory': parkingHistoryResult
//     // }
//     if (err) {
//       return cb && cb(err);
//     } 
//     input.parkingResult = updateResult;
//     return cb && cb(null);
//   });  

// }

function minsTimeDifference(startTime, endTime){
  console.log('[endTime.getTime(): ', endTime.getTime());
  console.log('[startTime.getTime(): ', startTime.getTime());
  return  (endTime.getTime()-startTime.getTime())/(1000*60);
}

function demandStartTimeDate(time, range){
  if (!time) {
  time = new Date();
  //console.log('queryDate = ', queryDate);
  }
  if (!range) {
    range = 0;
  }
  let timeDate = new Date(time);
  let startDate = new Date(timeDate).setDate(timeDate.getDate() - range);
  return startDate;
}

function filterAndSortTimePeriod(array) {
  array = array.filter(checkTimePeriod);
	function checkTimePeriod(parkingHistoryData) {
	    return parkingHistoryData.timePeriod >= 0;
	}
  return array.sort(function(a, b){return b.timePeriod-a.timePeriod});
}
