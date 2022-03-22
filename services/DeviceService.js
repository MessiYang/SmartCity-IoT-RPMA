import util from 'util';
import async from 'async';
import config from 'nconf';
import i18next from 'i18next';
import request from 'request';
import moment from 'moment';
import {soap} from 'strong-soap';
import {_} from 'underscore';
import fs from 'fs';
import path from 'path';
import csvToJson from 'csvtojson';
import excelToJson from 'node-excel-to-json';
import jsonToExcel from 'json2xls';
import logger from '../config/log';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import deviceHistoryModel from '../models/deviceHistoryModel';
import geoTagModel from '../models/geoTagModel';
import approvedDeviceModel from '../models/approvedDeviceModel';
import levelOneModel from '../models/levelOneModel';
import levelTwoModel from '../models/levelTwoModel';
import TagModel from '../models/tagModel';
import DeviceStatusType from '../models/type/DeviceStatusType';
import DeviceType from '../models/type/DeviceType';
import TagType from '../models/type/TagType';
import mongoose from 'mongoose';
let {Types: {ObjectId}} = mongoose;

export const SELECT_DEVICE = {nodeId:1,messageId:1,messageType:1,applicationId:1,name:1,desc:1,longitude:1,latitude:1,deviceStatus:1,deviceType:1,onlineStatus:1,batteryVoltage:1,temperature:1,humidity:1,parkingDetect:1,pm25:1,ch2o:1,co2:1,co:1,motionState:1,smokeState:1,gasState:1,sirenState:1,onOff:1,pwm:1,tagId:1,power:1,RTCSetting:1,isRTCClock:1,heartBeatRate:1,deviceTime:1,powerLevel:1,lightValue:1,countyId:1,districtId:1,villageId:1,geotagId:1,trackerData:1};
export const SELECT_HISTORY = {nodeId:1,messageId:1,messageType:1,applicationId:1,timestamp:1,batteryVoltage:1,temperature:1,humidity:1,parkingDetect:1,pm25:1,ch2o:1,co2:1,co:1,motionState:1,smokeState:1,gasState:1,sirenState:1};
export const SELECT_PAYLOADHISTORY = {nodeId:1,messageId:1,messageType:1,applicationId:1,timestamp:1,payload:1};
export const SELECT_TAGLIST = {name:1,createTime:1,modifyTime:1,tagType:1,devicesZone:1,levelOneId:1,levelTwoId:1};
const calculatParkingTimeHistory_TIMERANG = 5;
const getRawMessages_LIMIT_DAYS = 3;
const getRawMessages_MAX_DATACOUNTS = 400;

export function getCurrentStatus(bean, req, res, cb) {
  let {input, output} = bean;
  console.log('req.body.user: ', req.body.user);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
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
  if (input.deviceType) {
    aggregateArray.push({
      $match:{
        'deviceType': input.deviceType,
      }
    });
  }
  if (input.nodeId) {
    aggregateArray.push({
      $match:{
        'nodeId': input.nodeId,
      }
    });
  }
  if (input.countyId) {
    aggregateArray.push({
      $match:{
        'countyId': ObjectId(input.countyId),
      }
    });
  }
  if (input.districtId) {
    aggregateArray.push({
      $match:{
        'districtId': ObjectId(input.districtId),
      }
    });
  }
  if (input.villageId) {
    aggregateArray.push({
      $match:{
        'villageId': ObjectId(input.villageId),
      }
    });
  }
  if (input.geotagId) {
    aggregateArray.push({
      $match:{
        'geotagId': ObjectId(input.geotagId),
      }
    });
  }
  aggregateArray.push({
    $addFields: {
      deviceStatus: {$cond: [{$eq:  ['$onlineStatus',   '0']}, DeviceStatusType.OFFLINE.value,
                    {$cond: [{$lte: ['$batteryVoltage', 3.1]}, DeviceStatusType.LOWPOWER.value,
                    {$cond: [{$gt:  ['$temperature',     33]}, DeviceStatusType.OVERHEAT.value,
                                                               DeviceStatusType.NORMAL.value
                    ]}]}]},
      timestamp: '$lastHeartBeatTime',
    }
  });
  aggregateArray.push({
    $lookup: {
      'from': 'Tag',
      'localField': 'tagId',
      'foreignField': '_id',
      'as': 'tagId',
    }
  }),
  aggregateArray.push({
    $unwind: {
      path: '$tagId',
      preserveNullAndEmptyArrays: true,
    }
  }),
  aggregateArray.push({
    $project: {
      '_id': 0,
      ...SELECT_DEVICE,
    }
  });
  if (input.status) {
    if (Array.isArray(input.status)) {
        aggregateArray.push({
          $match:{
            'deviceStatus': {$in: input.status},
          }
        });
      } else {
        aggregateArray.push({
          $match:{
            'deviceStatus': {$in: [input.status]},
          }
        });
      }
  }
  approvedDeviceModel.aggregate(aggregateArray, (err, results) => {
    if (err) {
      return cb && cb(err);
    } else if ((results && results.length > 0) || input.status || input.deviceType){
      input.currentStatus = results || [];
      return cb && cb(null);
    } else {
      return cb && cb({name: 'NodeIdNotFound'});
    }
  });
}

export function getTagList(bean, req, res, cb) {
  let {input, output} = bean;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
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
  if (input.tagType) {
    aggregateArray.push({
      $match:{
        'tagType': input.tagType,
      }
    });
  }
  aggregateArray.push({
    $project: {
      '_id': 1,
      ...SELECT_TAGLIST,
    }
  });
  TagModel.aggregate(aggregateArray, (err, results) => {
    if (err) {
      return cb && cb(err);
    } else if (results && results.length > 0){
      input.tagList = results;
      return cb && cb(null);
    } else {
      return cb && cb({name: 'TagNotFound'});
    }
  });
}

export function getHistoryStatus(bean, req, res, cb) {
  let {input, output} = bean;
  let startTime = moment(input.startDate).startOf('day');
  let endTime = moment(input.endDate).endOf('day');
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'nodeId': input.nodeId,
      'timestamp': {'$gte': startTime.toDate(), '$lt': endTime.toDate()},
      'valid': true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$messageId',
      "batteryVoltage": {'$last': '$batteryVoltage'},
      "temperature": {'$last': '$temperature'},
      "parkingDetect": {'$last': '$parkingDetect'},
      "nodeId": {'$last': '$nodeId'},
      "messageId": {'$last': '$messageId'},
      "messageType": {'$last': '$messageType'},
      "applicationId": {'$last': '$applicationId'},
      "timestamp": {'$last': '$timestamp'},
      "humidity": {'$last': '$humidity'},
      "pm25": {'$last': '$PM25_Value'},
      "ch2o": {'$last': '$CH2O_Value'},
      "co2": {'$last': '$CO2_Value'},
      "co": {'$last': '$CO_Value'},
      "motionState": {'$last': '$motionState'},
      "smokeState": {'$last': '$smokeState'},
      "gasState": {'$last': '$gasState'},
      "sirenState": {'$last': '$sirenState'}
    }
  });
  aggregateArray.push({
    $sort: {
      'timestamp': 1
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      ...SELECT_HISTORY,
    }
  });
  deviceStatusHistoryModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    } else {
      results.forEach(function(element) {
        if (element.parkingDetect == null) delete element.parkingDetect;
        if (element.humidity == null) delete element.humidity;
        if (element.pm25 == null) delete element.pm25;
        if (element.ch2o == null) delete element.ch2o;
        if (element.co2 == null) delete element.co2;
        if (element.co == null) delete element.co;
        if (element.motionState == null) delete element.motionState;
        if (element.smokeState == null) delete element.smokeState;
        if (element.gasState == null) delete element.gasState;
        if (element.sirenState == null) delete element.sirenState;
      });
      input.historyStatus = results;
      return cb && cb(null);
    }
  });
}

export function getRawMessages(bean, req, res, cb) {
  let {input, output} = bean;
  //console.log('input: ', input);
  let approveNodeId = [];
  if(input.currentStatus && input.currentStatus.length){
    input.currentStatus.forEach(function(element) {
      approveNodeId.push(element.nodeId);
    });
  }
  console.log('approveNodeId: ', approveNodeId);
  let nowDate = new Date();
  let startTimeLimit = moment(nowDate).set('hour', moment(nowDate).get('hour') - getRawMessages_LIMIT_DAYS*24);
  let startTimeStampResult, rawMessagesResult;
  async.series({
    getTimeStamp: function(callback) {
      if(input.messageId){
        let where = {
          'messageId': input.messageId,
          'timestamp': {'$gte': startTimeLimit.toDate()},
          'valid': true,
        };
        deviceHistoryModel.findOne(where)
        .exec(function (err, result) {
          if (err) {
            return cb && cb(err);
          } else if (!result) {
            console.log('messageId not found');
            return cb && cb(new Error('approvedDevice not found'));
          } 
          startTimeStampResult = result.timestamp;
          console.log('startTimeStampResult: ', startTimeStampResult);
          callback(null);
        });
      }else{
  
        callback(null);               
      }
    },
    getPayload: function(callback) {
      let aggregateArray = [];
      aggregateArray.push({
        $match:{
          'nodeId': {'$in': approveNodeId},
          'timestamp': {'$gte': startTimeLimit.toDate()},
          'valid': true,
        }
      });
      aggregateArray.push({
        $sort: {
          'timestamp': 1
        }
      });
      if(startTimeStampResult){
        aggregateArray.push({
          $match:{
            'timestamp': {'$gt': startTimeStampResult},
          }
        });
      }
      if(input.counts && input.counts <= getRawMessages_MAX_DATACOUNTS){
        aggregateArray.push({
          $limit: input.counts
        });
      }else{
        aggregateArray.push({
          $limit: getRawMessages_MAX_DATACOUNTS
        });
      }
      aggregateArray.push({
        $project: {
          '_id': 0,
          ...SELECT_PAYLOADHISTORY,
        }
      });
      deviceHistoryModel.aggregate(aggregateArray, function(err, results){
        if (err) {
          return cb && cb(err);
        }
        rawMessagesResult = results;
        callback(null);    
      });
    },
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    } 
    input.rawMessagesResult = rawMessagesResult;
    cb && cb(null);
  });

}

export function getPayloadHistory(bean, req, res, cb) {
  let {input, output} = bean;
  console.log('req.body.user.code: ',req.body.user.code)
  if (!req.body.user.code || 
  !(req.body.user.code == 'compal_adm' || req.body.user.code == 'compalfactory_adm')) {
    return cb && cb({name: 'PermissionDeniedError'});
  }
  let startTime = moment(input.startDate).startOf('day');
  console.log('startTime',startTime);
  console.log('input',input);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'nodeId': input.nodeId,
      'valid': true,
    }
  });
  if (input.startDate){
    aggregateArray.push({
      $match:{
        'timestamp': {'$gte': startTime.toDate()},
      }
    });
  }
  aggregateArray.push({
    $sort: {
      'timestamp': 1
    }
  });
  aggregateArray.push({
    $limit: input.counts
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      ...SELECT_PAYLOADHISTORY,
    }
  });
  deviceHistoryModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    } else {
      input.payloadHistory = results;
      return cb && cb(null);
    }
  });
}

export function getGroupHistoryStatus(bean, req, res, cb) {
  let {input, output} = bean;
  let startTime = moment(input.startDate).startOf('day');
  let endTime = moment(input.endDate).endOf('day');
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      //'nodeId': input.nodeId,
      //'timestamp': {'$gte': startTime.toDate(), '$lt': endTime.toDate()},
      'valid': true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$messageId',
      'messageId_count': { $sum: 1 },
      "payload": {'$last': '$payload'},
      "messageId_Array": {'$push': '$messageId'},
      "modifyTime": {'$push': '$modifyTime'},
      "nodeId": {'$last': '$nodeId'},
      "messageType": {'$last': '$messageType'},
      "applicationId": {'$last': '$applicationId'},
      "timestamp": {'$last': '$timestamp'}
    }
  });
  aggregateArray.push({
    $sort: {
      'timestamp': 1
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      //...SELECT_HISTORY,
    }
  });
  deviceHistoryModel.aggregate(aggregateArray, function(err, results){
    let response = [];
    if (err) {
      return cb && cb(err);
    } else {
      for (let i = 0; i < results.length; i++) {
        if(results[i]){
          if(results[i].messageId_count > 1)  {
            response.push(results[i])
          }
        }
      }
      input.historyStatus = response;
      return cb && cb(null);
    }
  });
}

export function getLatestParkingTime(bean, req, res, cb) {
  let {input, output} = bean;
  let nodeIdResult, parkingTimeResult, parkingResult;
  async.series({
    parkingSensorNodeId: function(callback) {
      let aggregateArray = [];
      if (!req.body.user.code || req.body.user.code != 'compal_adm') {
        aggregateArray.push({
          $match:{
            'levelOneId': ObjectId(req.body.user.levelOneId),
          }
        });
      }
      aggregateArray.push({
        $match:{
          'deviceType': DeviceType.PARKINGSENSOR.value,
          'valid': true,
        }
      });
      if (req.body.user.levelTwoId) {
        aggregateArray.push({
          $match:{
            'levelTwoId': ObjectId(req.body.user.levelTwoId),
          }
        });
      }
      if (input.nodeId) {
        aggregateArray.push({
          $match:{
            'nodeId': input.nodeId,
          }
        });
      }
      aggregateArray.push({
        $project: {
          '_id': 0,
          'nodeId': 1,
          'lastStartParkingTime': 1,
          'lastEndParkingTime': 1,
          'nodeId': 1,
          'name' : 1,
          'desc': 1,
          'longitude': 1,
          'latitude': 1,
          'moveDetect': 1,
          'parkingDetect': 1,
          'lastHeartBeatTime': 1,
          'onlineStatus': 1,
          'batteryVoltage': 1,
          'temperature': 1,
          'deviceStatus': 1,
        }
      });
      approvedDeviceModel.aggregate(aggregateArray, (err, results) => {
        if (err) {
          return cb && cb(err);
        }
        if(!results || !results.length){
          return cb && cb({name: 'NodeIdNotFound'});
        }else{
          nodeIdResult = results;
          callback(null);
        }
      });

    },
    // calculateParkingTime: function(callback) {

    //   async.map(nodeIdResult, calculateParkingTimeByNodeId, (err, results)=>{
    //      parkingTimeResult = results;
    //      callback(null);
    //   });
    //   function calculateParkingTimeByNodeId(req, parkingCallback){
    //     calculatLatestParkingTime(req.nodeId, new Date(), calculatParkingTimeHistory_TIMERANG,
    //     (err, parkingResults)=>{
    //       if (err) {
    //         return parkingCallback(null, err);
    //       }
    //       if(!parkingResults){
    //         return parkingCallback(null, {name: 'NodeIdNotFound'});
    //       }
    //       return parkingCallback(null, parkingResults);
    //     });
    //   }
    // },
    calculateParkingTime: function(callback) {
      async.map(nodeIdResult, calculateParkingTimePerNodeId, (err, results)=>{
         parkingResult = results;
         callback(null);
      });
      function calculateParkingTimePerNodeId(req, parkingCallback2){
        let callbackResult = {};
        let parkingHistory = {};
        callbackResult.device = req;
        if(req.lastStartParkingTime && req.lastEndParkingTime){
          if(req.lastStartParkingTime.getTime() > req.lastEndParkingTime.getTime()){
            parkingHistory.timePeriod = minsTimeDifference(req.lastStartParkingTime, new Date());
            parkingHistory.startParking = req.lastStartParkingTime;
          }else{
            parkingHistory.timePeriod = minsTimeDifference(req.lastStartParkingTime, req.lastEndParkingTime);
            parkingHistory.startParking = req.lastStartParkingTime;
            parkingHistory.endParking = req.lastEndParkingTime;
          }
        }else if(req.lastStartParkingTime && !req.lastEndParkingTime){
          parkingHistory.timePeriod = minsTimeDifference(req.lastStartParkingTime, new Date());
          parkingHistory.startParking = req.lastStartParkingTime;
        }else{
          parkingHistory.endParking = req.lastEndParkingTime;
        }
        callbackResult.parkingHistory = parkingHistory;
        return parkingCallback2(null, callbackResult);
      }
    },
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    }
    input.historyStatus = parkingResult;
    return cb && cb(null);
  });
}



export function getParkingStatus(bean, req, res, cb) {
  console.log('Get Parking Status');
  let {input, output} = bean;
  console.log('[getParkingStatus] input: ', input );
  calculatParkingTimeHistory(input.nodeId, input.timestamp, input.timeRange, (err, results)=>{
    if (err) {
      return cb && cb(err);
    }
    input.historyStatus = results;
    return cb && cb(null);
  });
}

export function uploadDevices(bean, req, res, cb) {
  let {input, output} = bean;
  // * display api phrase * //
  if (input.action.toLowerCase() === 'add') {
    console.log('[Add Devices]');
  } else if (input.action.toLowerCase() === 'update') {
    console.log('[Update Devices]');
  } else {
    console.log('[uploadDevices] invalid manipulation');
    input.message = {'response': 'invalid manipulation'};
    return cb && cb(null);
  }
  // * check if or not dataFile exists * //
  if (!req.files.dataFile) {
    input.message = {'response': 'no file has been selected to be uploaded'};
    console.log(input.message);
    return cb && cb(null);
  }
  let fileName = req.files.dataFile.name;
  let filePath = req.files.dataFile.path;
  console.log('file ' + fileName + ' has been uploaded at the path ' + filePath);
  // * deviceRecords contains rows in json * //
  // * deviceTypeMap, levelOneMap, levelTwoMap and nodeIdToIdMap for field conversion * //
  let deviceRecords;
  const deviceTypeMap = {
    'others': DeviceType.OTHERS.value,
    'parking sensor': DeviceType.PARKINGSENSOR.value,
    'air sensor': DeviceType.AIRSENSOR.value,
    'smart lamp': DeviceType.SMARTLAMP.value,
  };
  let levelOneMap, levelTwoMap, nodeIdToIdMap, groupIdMap;
  async.series({
    decodeFile: function (callback) {
      // * process file based on ext name * //
      if (path.extname(filePath) === '.csv') {
        convertCsvToJsonArray(filePath, function (jsonArray) {
          deviceRecords = jsonArray;
          callback(null, null);
        });
      } else if (path.extname(filePath) === '.xls' || path.extname(filePath) === '.xlsx') {
        convertExcelToJsonArray(filePath, function (jsonArray) {
          deviceRecords = jsonArray;
          callback(null, null);
        });
      } else {
        input.message = {'response': 'file type of ' + fileName + ' is not csv, xls or xlsx'};
        console.log(input.message);
        return cb && cb(null);
      }
    },
    setlevelOneMap: function (callback) {
      createCodeToIdMap(levelOneModel, function (err, results) {
        if (err){
          callback(err);
        }
        levelOneMap = results;
        callback(null);
      });
    },
    setLevelTwoMap: function (callback) {
      createCodeToIdMap(levelTwoModel, function (err, results) {
        if (err){
          callback(err);
        }
        levelTwoMap = results;
        callback(null);
      });
    },
    setNodeIdToIdMap: function (callback) {
      createNodeIdToIdMap(function (err, results) {
        if (err){
          callback(err);
        }
        nodeIdToIdMap = results;
        callback(null);
      });
    },
    setGroupIdMap: function (callback) {
      createGroupIdMap(function (err, results) {
        if (err){
          callback(err);
        }
        groupIdMap = results;
        // input.message = results;
        // return cb && cb(null);
        callback(null);
      });
    },
    insertDeviceRecords: function (callback) {
      // * check if or not deviceRecords contains rows * //
      if (!deviceRecords || deviceRecords.length == 0) {
        input.message = {'response': 'no devices found from ' + fileName};
        console.log(input.message);
        return cb && cb(null);
      }
      // * use approvedDevice models to add or update * //
      let addedDevices = [], updatedDevices = [], discardedDevices = [];
      async.map(deviceRecords, function (deviceRecord, callback) {
        let nodeId = deviceRecord.nodeId;
        let deviceType = deviceTypeMap[deviceRecord.deviceType.toLowerCase()];
        let levelOneId = (!deviceRecord.siCode) ? req.body.user.levelOneId : levelOneMap[deviceRecord.siCode];
        let levelTwoId = (!deviceRecord.orgCode) ? req.body.user.levelTwoId : levelTwoMap[deviceRecord.orgCode];
        let groupIdObj = {};
        if (deviceRecord.group && deviceRecord.village && levelOneId){
          if(deviceType == DeviceType.PARKINGSENSOR.value && groupIdMap[levelOneId+deviceRecord.village+deviceRecord.group]){
            groupIdObj = groupIdMap[levelOneId+deviceRecord.village+deviceRecord.group+TagType.PARKINGZONE.value];
          }else{
            groupIdObj = groupIdMap[levelOneId+deviceRecord.village+deviceRecord.group];
          }    
        }
        // * check if or not compulsory fields are ready* //
        if (!nodeId|| !deviceType || !levelOneId ) {
          discardedDevices.push({
            'nodeId': nodeId,
            'reason': 'invalid or missing values'
          });
          callback(null);
        } else {
          if (input.action === 'add') {
            // * check if or not nodeId exists * //
            if (nodeId && Object.keys(nodeIdToIdMap).includes(nodeId)) {
              discardedDevices.push({
                'nodeId': nodeId,
                'reason': 'duplicate nodeId'
              });
              callback(null);
            } else {
              // * prepare approvedDevice model * //
              let data = {
                'nodeId': nodeId,
                'name': deviceRecord.name,
                'deviceType': deviceType,
                'desc': deviceRecord.desc,
                'longitude': deviceRecord.longitude,
                'latitude': deviceRecord.latitude,
                'levelOneId': levelOneId,
                'levelTwoId': levelTwoId
              };
              data = Object.assign(data, groupIdObj);
              let approvedDevice = new approvedDeviceModel(data);
              // * save approvedDevice model * //
              approvedDevice.save(function (err) {
                if (err) {
                  discardedDevices.push({
                    'nodeId': nodeId,
                    'reason': err.errmsg
                  });
                } else {
                  addedDevices.push(nodeId);
                }
                callback(null);
              });
            }
          } else if (input.action === 'update') {
            // * check if or not nodeId exists * //
            if (nodeId && !Object.keys(nodeIdToIdMap).includes(nodeId)) {
              discardedDevices.push({
                'nodeId': nodeId,
                'reason': 'in-existing nodeId'
              });
              callback(null);
            } else {
              // * update approvedDevice model * //
              approvedDeviceModel.findById(nodeIdToIdMap[nodeId], function (err, approvedDevice) {
                if (err) {
                  discardedDevices.push({
                    'nodeId': nodeId,
                    'reason': err.errmsg
                  });
                  callback(null);
                } else {
                  let data = {
                    'name': deviceRecord.name,
                    'deviceType': deviceType,
                    'desc': deviceRecord.desc,
                    'longitude': deviceRecord.longitude,
                    'latitude': deviceRecord.latitude,
                    'levelOneId': levelOneId,
                    'levelTwoId': levelTwoId
                  };
                  if(deviceRecord.valid||deviceRecord.valid == false) data.valid = deviceRecord.valid;
                  data = Object.assign(data, groupIdObj); 
                  approvedDevice.set(data);
                  approvedDevice.save(function (err, updatedDevice) {
                    if (err) {
                      discardedDevices.push({
                        'nodeId': nodeId,
                        'reason': err.errmsg
                      });
                    } else {
                      updatedDevices.push(nodeId);
                    }
                    callback(null);
                  });
                }
              });
            }
          }
        }
      }, function (err, results) {
        if (err) {
          return cb & cb(err);
        }
        callback(null, {
          'addedDevices': addedDevices,
          'updatedDevices': updatedDevices,
          'discardedDevices': discardedDevices,
        });
      });
    },
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    }
    let {addedDevices, updatedDevices, discardedDevices} = results.insertDeviceRecords;
    if (input.action.toLowerCase() === 'add') {
      input.message = {
        'summary': {
          'added': addedDevices.length,
          'discarded': discardedDevices.length,
          'total': deviceRecords.length
        },
        'addedDevices': addedDevices,
        'discardedDevices': discardedDevices
      };
    } else if (input.action.toLowerCase() === 'update') {
      input.message = {
        'summary': {
          'updated': updatedDevices.length,
          'discarded': discardedDevices.length,
          'total': deviceRecords.length
        },
        'updatedDevices': updatedDevices,
        'discardedDevices': discardedDevices
      };
    }
    console.log(input.message);
    return cb && cb(null);
  });
}

export function profileApprovedDevice(bean, req, res, cb) {
  console.log('[Profile Approved Device]');
  let {input, output} = bean;
  let where = {
    'nodeId': input.nodeId,
    'valid': true,
  };
  approvedDeviceModel.findOne(where)
  .exec(function (err, result) {
    if (err) {
      return cb && cb(err);
    } else if (!result) {
      console.log('approvedDevice not found');
      return cb && cb(new Error('approvedDevice not found'));
    } else {
      var approvedDeviceDoc = JSON.parse(JSON.stringify(result));
      delete approvedDeviceDoc.createTime;
      delete approvedDeviceDoc.modifyTime;
      delete approvedDeviceDoc.valid;
      console.log(approvedDeviceDoc);
      input.approvedDeviceDoc = approvedDeviceDoc;
      return cb && cb(null);
    }
  });
}

function calculatLatestParkingTime(nodeId, timestamp, timeRange, cb){
  console.log('calculat Latest ParkingTime');
  let deviceStatusResult, parkingHistoryResult, latestParking, approvedDeviceResult;
  async.series({
    getDeviceStatusHistory: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId
      };
      if (timestamp) {
        let date = (!timestamp) ? new Date() : new Date(timestamp);
        let endTime =  new Date(new Date( date.setDate(date.getDate() + 1) ).setHours(0, 0, 0, 0));
        let startTime =  new Date(demandStartTimeDate( endTime, timeRange));
        //console.log('[getParkingStatus] startTime: ', startTime );
        //console.log('[getParkingStatus] endTime: ', endTime );
        where['timestamp'] = {'$gte': startTime, '$lt': endTime};
      }
      deviceStatusHistoryModel.find(where)
      .select('parkingDetect timestamp messageId')
      .sort({'timestamp':-1})
      .exec(function(err, results) {
        let data;
        if (err){
          return cb(err, null);
        }
        if(!results || !results.length){
          return cb(null, {name: 'NodeIdNotFound1'});
        }else{
          deviceStatusResult = results;
          //console.log('[getParkingStatus] deviceStatusResult: ', deviceStatusResult);
          callback(null)
        }
      });
    },
    calculateParkingTime: function(callback) {
      let parkingHistory;
      let data;

      for (let i = 0; i < deviceStatusResult.length; i++){

        //0 to 1 parking
        if ((i+1)<deviceStatusResult.length && deviceStatusResult[i+1].parkingDetect=="0" && deviceStatusResult[i].parkingDetect=="1"){
          data = {
            'startParking':deviceStatusResult[i].timestamp,
            'startParkMessageId': deviceStatusResult[i].messageId
          }
          if (!parkingHistory){
            data.timePeriod = minsTimeDifference(deviceStatusResult[i].timestamp, new Date());
            parkingHistory = data;
          }else{
            parkingHistory.timePeriod = minsTimeDifference(deviceStatusResult[i].timestamp, parkingHistory.endParking);
            parkingHistory.startParking = deviceStatusResult[i].timestamp;
            parkingHistory.startParkMessageId = deviceStatusResult[i].messageId;
          }
          break;
        }
        //1 to 0 leave
        if ((i+1)<deviceStatusResult.length && deviceStatusResult[i+1].parkingDetect=="1" && deviceStatusResult[i].parkingDetect=="0"){
          data = {
            'endParking': deviceStatusResult[i].timestamp,
            'endParkMessageId': deviceStatusResult[i].messageId
          }
          parkingHistory = data;
        }
      }
      parkingHistoryResult = parkingHistory;
      callback(null);
    },
    getApprovedDeviceData: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId
      };

      approvedDeviceModel.find(where)
      .select('-_id nodeId name desc longitude latitude moveDetect parkingDetect lastHeartBeatTime onlineStatus batteryVoltage temperature deviceStatus')
      .exec(function(err, results) {
        let data;
        if (err){
          return cb(err, null);
        }
        if(!results || !results.length){
          return cb(null, {name: 'NodeIdNotFound2'});
        }else{
          approvedDeviceResult = results[0];
          callback(null);
        }
      });

    },
  }, function(err, results) {
    let response ={
      'device': approvedDeviceResult,
      'parkingHistory': parkingHistoryResult
    }
    if (err) {
      return cb(err, null);
    }
    return cb(null, response);
  });
}

function calculatParkingTimeHistory(nodeId, timestamp, timeRange, cb){
  console.log('calculatParkingTimeHistory');
  let deviceStatusResult, parkingHistoryResult, latestParking, approvedDeviceResult;
  async.series({
    getDeviceStatusHistory: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId
      };
      if (timestamp) {
        let date = (!timestamp) ? new Date() : new Date(timestamp);
        let endTime =  new Date(new Date( date.setDate(date.getDate() + 1) ).setHours(0, 0, 0, 0));
        let startTime =  new Date(demandStartTimeDate( endTime, timeRange));
        console.log('[getParkingStatus] startTime: ', startTime );
        console.log('[getParkingStatus] endTime: ', endTime );
        where['timestamp'] = {'$gte': startTime, '$lt': endTime};
      }
      deviceStatusHistoryModel.find(where)
      .select('parkingDetect timestamp messageId')
      .sort({'timestamp':1})
      .exec(function(err, results) {
        let data;
        if (err){
          return cb(err, null);
        }
        if(!results || !results.length){
          return cb(null, {name: 'NodeIdNotFound1'});
        }else{
          deviceStatusResult = results;
          callback(null)
        }
      });
    },
    calculateParkingTime: function(callback) {
      let parkingHistory = [];
      let data;
      deviceStatusResult.forEach(function(element, i, array) {
        //console.log('[getParkingStatus] element: ', element );
        //console.log('[getParkingStatus] i: ', i );
        if (i>0 && deviceStatusResult[i-1].parkingDetect=="0" && element.parkingDetect=="1"){
          data = {
            'startParking': element.timestamp,
            'startParkMessageId': element.messageId
          }
          parkingHistory.push(data);
        }
        if (i>0 && deviceStatusResult[i-1].parkingDetect=="1" && element.parkingDetect=="0"){
          data = {
            'endParking': element.timestamp,
            'endParkMessageId': element.messageId
          }
          if (parkingHistory.length > 0 && (parkingHistory[parkingHistory.length-1].startParking)){
            data.timePeriod = minsTimeDifference(parkingHistory[parkingHistory.length-1].startParking, element.timestamp);
          }
          if(parkingHistory[parkingHistory.length-1]){
            parkingHistory[parkingHistory.length-1].endParking = data.endParking;
            parkingHistory[parkingHistory.length-1].endParkMessageId = data.endParkMessageId;
            parkingHistory[parkingHistory.length-1].timePeriod = data.timePeriod;
          }else{
            parkingHistory.push(data);
          }
        }
      });
      let lestData = parkingHistory[parkingHistory.length-1];
      if (parkingHistory.length>0 && !lestData.endParking){
        parkingHistory[parkingHistory.length-1].timePeriod = minsTimeDifference(lestData.startParking, new Date());
      }
      parkingHistoryResult = parkingHistory;
      callback(null);
    },
    getApprovedDeviceData: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId
      };

      approvedDeviceModel.find(where)
      .select('-_id nodeId name desc longitude latitude moveDetect parkingDetect lastHeartBeatTime onlineStatus batteryVoltage temperature deviceStatus')
      .exec(function(err, results) {
        let data;
        if (err){
          return cb(err, null);
        }
        if(!results || !results.length){
          return cb(null, {name: 'NodeIdNotFound2'});
        }else{
          approvedDeviceResult = results[0];
          callback(null);
        }
      });

    },
  }, function(err, results) {
    let response ={
      'device': approvedDeviceResult,
      'parkingHistory': parkingHistoryResult
    }
    if (err) {
      return cb(err, null);
    }
    return cb(null, response);
  });
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

function minsTimeDifference(startTime, endTime){
  //console.log('[endTime.getTime(): ', new Date(endTime));
  //console.log('[startTime.getTime(): ', new Date(startTime));
  return  (endTime.getTime()-startTime.getTime())/(1000*60);
}

function convertCsvToJsonArray(filePath, callback) {
  let jsonArray = [];
  csvToJson({noheader:false})
  .fromFile(filePath)
  .on('json', function (json) {
    jsonArray.push(json);
  })
  .on('done', function (err) {
    if (err) {
      console.log(err);
      callback(null);
    }
    console.log('file ' + filePath + ' completely decoded');
    callback(jsonArray);
  });
}

function convertExcelToJsonArray(filePath, callback) {
  excelToJson(filePath, function (err, results) {
    if (err) {
      console.log(err.message);
      callback(null);
    }
    let firstSheetName = Object.keys(results)[0];
    let jsonArray = results[firstSheetName];
    console.log('file ' + filePath + ' completely decoded');
    callback(jsonArray);
  });
}

function createCodeToIdMap(levelModel, callback) {
  let codeToIdMap = {};
  let where = {
    'code': {$ne: null},
  };
  levelModel.find(where)
  .select('_id code')
  .exec(function (err, results) {
    if (err){
      callback(err);
    }
    results.forEach(function (entry) {
      codeToIdMap[entry.code] = entry._id;
    });
    callback(null, codeToIdMap);
  });
}

function createNodeIdToIdMap(callback) {
  let where = {
    'nodeId': {$ne: null},
  };
  approvedDeviceModel.find(where)
  .select('_id nodeId')
  .exec(function (err, results) {
    if (err){
      callback(err, null);
    }
    let nodeIdToIdMap = {};
    results.forEach(function (entry) {
      nodeIdToIdMap[entry.nodeId] = entry._id;
    });
    callback(null, nodeIdToIdMap);
  });
}

function createGroupIdMap(callback) {
  let where = {
    'villageId': {$ne: null},
    'valid': true
  };
  geoTagModel.find(where)
  .select('_id name villageId tagType levelOneId')
  .populate({
    path: 'villageId',
    select: '_id name districtId',
    match: {'valid': true},
    populate: {
      path: 'districtId',
      select: '_id name countyId',
      match: {'valid': true},
      populate: {
        path: 'countyId',
        select: '_id name',
        match: {'valid': true},
      }
    }
  })
  .exec(function (err, results) {
    if (err){
      callback(err, null);
    }
    let IdMap = {};
    results.forEach(function (entry) {
      if(entry.tagType){
        IdMap[entry.levelOneId+entry.villageId.name+entry.name+entry.tagType] = {
          "geotagId" : entry._id,
          "villageId" : entry.villageId._id,
          "districtId" : entry.villageId.districtId._id,
          "countyId" : entry.villageId.districtId.countyId._id
        };        
      }else{
        IdMap[entry.levelOneId+entry.villageId.name+entry.name] = {
          "geotagId" : entry._id,
          "villageId" : entry.villageId._id,
          "districtId" : entry.villageId.districtId._id,
          "countyId" : entry.villageId.districtId.countyId._id
        }; 
      }
    });
    callback(null, IdMap);
  });
}