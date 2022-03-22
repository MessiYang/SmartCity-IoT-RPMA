import async from 'async';
import mongoose from 'mongoose';
import moment from 'moment';
import ParkingChargeType from '../models/type/ParkingChargeType';
import UserParkingModel from '../models/userParkingModel';
import ApprovedDeviceModel from '../models/approvedDeviceModel';
import ParkingFeeStandardModel from '../models/parkingFeeStandardModel';
//import ParkingFeeTypeModel from '../models/parkingFeeTypeModel';
const HOLIDAY_DEFAULT = [0,6];
const FIRST_N_TIMEMINS = 30;

export function setDeviceStartParkingTime(nodeId, startTime, cb) {
  let latestParkingId = null;
  let saveDataResult;
  async.series({
    checkNodeLastParkingStatus: function(callback) {
   
      let where = {
        'valid': true,
        'nodeId': nodeId
      };
      UserParkingModel.find(where)
      //.select('parkingDetect timestamp messageId')
      .sort({'modifyTime': -1})
      .limit(1)
      .exec(function(err, result) {
        let data;
        if (err){
          return cb(err, null);
         }
        if(!result || !result.length){
          console.log('[checkNodeLastParkingStatus] No data, nodeId: ', nodeId);
          return callback(null);
        }
        result = result[0];
        if(result.parkingFeeStatus == '0' && !result.deviceStartParkTime && result.userStartParkTime && !result.deviceEndParkTime){
           latestParkingId = result._id;
        }
        callback(null);
      });
    },
    saveStartParkingTime: function(callback) {
    	if(latestParkingId){
    		let updateData = {
          'deviceStartParkTime': startTime
    		};
        UserParkingModel.findOneAndUpdate({'_id': latestParkingId, 'valid': true},
        updateData, {new: true}, function(err, result) {
          if (err) return cb(err, null);  
          if (!result) {
          	return cb('No this latestParkingId: ' + latestParkingId, null);  
          }
          console.log('[checkNodeLastParkingStatus] Update data done, nodeId: ', nodeId);
          saveDataResult = result;
          callback(null);
        });
    	}else{
    		getApprovedDeviceId(nodeId, (err, idResult)=>{
    			if (err) return cb(err, null);  
    			let saveData = {
	          'nodeId': nodeId,
	          'approvedDeviceId': idResult,
	          'deviceStartParkTime': startTime
	        }
	    		let db = new UserParkingModel(saveData);
		    	db.save((err2, resdata)=>{
						if (err2) return cb(err2, null);  
					  console.log('[saveStartParkingTime] saveData result:', resdata);
					  saveDataResult = resdata;
						callback(null);
					});
    		}); 
    	}
    }
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    } 
    cb(null, saveDataResult);
  });
}

export function setDeviceEndParkingTime(nodeId, endTime, cb) {
  let latestParkingId = null;
  let saveDataResult;
  async.series({
    checkNodeLastParkingStatus: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId
      };
      UserParkingModel.find(where)
      //.select('parkingDetect timestamp messageId')
      .sort({'modifyTime': -1})
      .limit(1)
      .exec(function(err, result) {
        let data;
        if (err){
          return cb(err, null);
         }
        if(!result || !result.length){
          console.log('[checkNodeLastParkingStatus] No lastParking data, nodeId: ', nodeId);
          return cb('No lastParking data, nodeId: '+ nodeId, null);
        }
        result = result[0];
        console.log('[checkNodeLastParkingStatus] result: ', result);
        if(result.deviceStartParkTime && !result.deviceEndParkTime){
          latestParkingId = result._id;
        }else{
        	return cb('LastParking data incompatible, result: '+ result, null);
        }
        callback(null);
      });
    },
    updateEndParkingTime: function(callback) {
  	  let updateData = {
        'deviceEndParkTime': endTime
  		};
      UserParkingModel.findOneAndUpdate({'_id': latestParkingId, 'valid': true},
      updateData, {new: true}, function(err, result) {
        if (err) return cb(err, null);  
        if (!result) {
        	return cb('No this latestParkingId: ' + latestParkingId, null);  
        }
        console.log('[checkNodeLastParkingStatus] Update data done, result: ', result);
        saveDataResult = result;
        callback(null);
      });
    }
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    } 
    cb(null, saveDataResult);
  });
}

export function getApprovedDeviceId(nodeId, cb) {
  ApprovedDeviceModel.findOne({'nodeId': nodeId, 'valid': true}, {'_id': 1}, (err, result)=>{
    if (err) return cb(err, null);  
    if (!result) {
    	return cb('No this nodeId: ' + nodeId, null);  
    }
    console.log('[getApprovedDevice] result: ', result);
    cb(null, result._id);
  });
}

export function pushSuccessMsg_UserStartParking(customerId, nodeId, startParkTime, cb){

}

export function pushSuccessMsg_UserEndParking(customerId, nodeId, endParkTime, cb){

}

export function calculateStandardParkingCharge(approvedDeviceId, startTime, endTime, cb){
  let feeStandardResult, sumParkingFeeResult;
  async.series({
    findParkingFeeStandard: function(callback) {
      let where = {
        'valid': true,
        '_id': approvedDeviceId
      };
      ApprovedDeviceModel.findOne(where)
      .populate({
        path: 'parkingFeeStandardId',
        select: '-__target -__targetVer',
        //match: {'valid': true},
      })
      .exec(function(err, result) {
        if (err){
          return cb(err, null);
        }
        if(!result){
          console.log('[findParkingFeeStandard] No lastParking data, approvedDeviceId: ', approvedDeviceId);
          return cb('No data, approvedDeviceId: '+ approvedDeviceId, null);
        }else if(!result.parkingFeeStandardId){
          console.log('[findParkingFeeStandard] No parkingFeeStandardId, approvedDeviceId: ', approvedDeviceId);
          return cb(null, 'No parkingFeeStandardId');
        }
        console.log('[findParkingFeeStandard] result.parkingFeeStandardId:', result.parkingFeeStandardId);
        feeStandardResult = result.parkingFeeStandardId;
        callback(null);
      });
    },
    switchParkingChargeType: function(callback) {
      console.log('[switchParkingChargeType] chargeType:', feeStandardResult.chargeType);
      switch(feeStandardResult.chargeType){
        case ParkingChargeType.OTHERS.value:

        break;
        case ParkingChargeType.NUMBER.value:
          chargeByParkingNumber(feeStandardResult, startTime, endTime, (err, result)=>{
            if(err) return cb(null, '[chargeByParkingNumber] err: ' + err);
            console.log('[chargeByParkingNumber] result:', result);
            sumParkingFeeResult = result;
            callback(null);
          });
        break;
        case ParkingChargeType.TIME.value:
          chargeByTime(feeStandardResult, startTime, endTime, (err, result)=>{
            if(err) return cb(null, '[chargeByTime] err: ' + err);
            console.log('[chargeByTime] result:', result);
            sumParkingFeeResult = result;
            callback(null);
          });     
        break;
        case ParkingChargeType.PERIOD.value:

        break;        
        case ParkingChargeType.TABLE.value:
          chargeByTable(feeStandardResult, startTime, endTime, (err, result)=>{
            if(err) return cb(null, '[chargeByTable] err: ' + err);
            console.log('[chargeByTable] result:', result);
            sumParkingFeeResult = result;
            callback(null);
          });
        break;
      }
    }
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    } 
    cb(null, sumParkingFeeResult);
  });  
}

function chargeByParkingNumber(standard, startTime, endTime, cb){      
  let costData = {
    'sum': 0,
    'haveCheckFirstNTime': false,
    'calulateDate': moment(startTime),
    'startTime': moment(startTime),
    'endTime': moment(endTime),
    'logs':[ {
      'startParking': moment(startTime).format("M/D HH:mm:ss"),
      'endParking': moment(endTime).format("M/D HH:mm:ss")
    } ]
  };    
  async.doDuring(
    function (msgCallback) {
      let log = {
        'chargeDay': costData.calulateDate.format("M/D ddd")
      }
      if(costData.haveCheckFirstNTime == false && standard.firstNMinsTime>0){
        console.log('[chargeByParkingNumber] minsTimeDifference:', minsTimeDifference(costData.calulateDate, costData.endTime));
        if(minsTimeDifference(costData.calulateDate, costData.endTime) < standard.firstNMinsTime){
          getFirstNTimeCost(standard, costData.calulateDate, (err, costResult)=>{
            costData.sum = costResult;
            costData.calulateDate.add(1, 'days').endOf('day');
            log.cost = costResult;
            log.sum = costData.sum;
            costData.logs.push(log);
            costData.haveCheckFirstNTime = true;
            console.log('[chargeByParkingNumber] costData.sum:', costData.sum);
            msgCallback();
          });
        }else{
          costData.haveCheckFirstNTime = true;
          msgCallback();
        }
      }else{
        getTodayCost(standard, costData.calulateDate, costData.endTime, (err, costResult)=>{
          costData.sum = costData.sum + costResult;
          costData.calulateDate.add(1, 'days').startOf('day');
          log.cost = costResult;
          log.sum = costData.sum;
          costData.logs.push(log);
          console.log('[chargeByParkingNumber] costData.sum:', costData.sum);
          msgCallback();
        }); 
      } 
    },
    function (msgCallback) {  //post-check
      let remainingTime = minsTimeDifference(costData.calulateDate, costData.endTime);
      console.log('[costData] ================ remainingTime:', remainingTime);
      return msgCallback(null, remainingTime >= 0);
    },
    function (err) {
      if (err) return cb(err, null);
      cb(null, costData);
    }
  );              
}
function getFirstNTimeCost(standard, calulateDate, cb){
  let cost = 0;
  if (standard.firstNMinsCharge_allDay > 0){ //is all day
    console.log('[getFirstNTimeCost] Is all day!!!!!!');
    cost = standard.firstNMinsCharge_allDay;
    cb(null, cost);
  }else{
    isHoliday(calulateDate, function(err, result){
      if (err) return cb(err, null);
      if (result == false){ //is work day
        console.log('[getFirstNTimeCost] Is workday!!!!!!');
        cost = standard.firstNMinsCharge_workDay;
        cb(null, cost);        
      }else{ //is holiday
        console.log('[getFirstNTimeCost] Is holiday!!!!!!');
        cost = standard.firstNMinsCharge_holiday;
        cb(null, cost);       
      }
    });
  } 
}
function getTodayCost(standard, calulateDate, endDate, cb){
  let cost = 0;
  if (standard.time_allDay.length){ //is all day
    cost = checkCostOfTodayTimePeriod(standard.time_allDay);
    cb(null, cost);
  }else{
    isHoliday(calulateDate, function(err, result){
      if (err) return cb(err, null);
      if (result == false){ //is work day
        console.log('[getTodayCost] Is workday!!!!!!');
        cost = checkCostOfTodayTimePeriod(standard.time_workDay);
        cb(null, cost);        
      }else{ //is holiday
        console.log('[getTodayCost] Is holiday!!!!!!');
        cost = checkCostOfTodayTimePeriod(standard.time_holiday);
        cb(null, cost);       
      }
    });
  } 

  function checkCostOfTodayTimePeriod(timePeriodList){
    let cost = 0;
    timePeriodList.forEach(function(elem, i, array) {
      console.log('[checkCostOfTodayTimePeriod] elem: ', elem);
      if(calulateDate.get('hour')>=elem.endTime) return; 
      calulateDate.startOf('day');
      if(calulateDate.add(elem.startTime, 'hours') <= endDate){
        if(elem.costPerTime>cost) cost = elem.costPerTime;
      }
      console.log('[checkCostOfTodayTimePeriod] calulateDate: ', calulateDate);
      console.log('[checkCostOfTodayTimePeriod] cost: ', cost);
    });

    return cost;
  }
}


function chargeByTime(standard, startTime, endTime, cb){  
  let costData = {
    'haveSumFirstNMinCost': false,
    'firstNMinTime': standard.firstNMinsTime,
    'firstNMinCost': 0,
    'sum': 0,
    'dailyQuota':0,
    'calulateDate': moment(startTime),
    'startTime': moment(startTime),
    'endTime': moment(endTime),
    'logs':[ {
      'startParking': moment(startTime).format("M/D HH:mm:ss"),
      'endParking': moment(endTime).format("M/D HH:mm:ss")
    } ]
  };
  
  console.log('[sumParkingFee] @@@@@@@@@@costData:', costData);
  console.log('[sumParkingFee] ====dayOfYear:', moment(costData.calulateDate).dayOfYear());
  async.doDuring(
    function (msgCallback) {
      console.log('[sumParkingFee] =====standard.time_allDay.length:', standard.time_allDay.length);
      if (standard.time_allDay.length){ //is all day
        costData.firstNMinCost = standard.firstNMinsCharge_allDay;
        costData = dailyCalculate(standard.time_allDay, costData);
        msgCallback();
      }else{
        isHoliday(costData.calulateDate, function(err, result){
          if (err) return cb(err, null);
          if (result == false){ //is work day
            console.log('[sumParkingFee] Is workday!!!!!!');
            if (!standard.time_workDay || !standard.time_workDay.length) 
              return cb('No time_workDay data.', null);
            costData.firstNMinCost = standard.firstNMinsCharge_workDay;
            costData = dailyCalculate(standard.time_workDay, costData);
          }else{ //is holiday
            console.log('[sumParkingFee] Is holiday!!!!!!');
            if (!standard.time_holiday || !standard.time_workDay.length) 
              return cb('No time_holiday data.', null);
            costData.firstNMinCost = standard.firstNMinsCharge_holiday;
            costData = dailyCalculate(standard.time_holiday, costData);
          }
          console.log('[sumParkingFee] =====calulateDate:', costData.calulateDate);
          console.log('[sumParkingFee] =====dayOfYear:', moment(costData.calulateDate).dayOfYear());
          msgCallback();
        });
      }
    },
    function (msgCallback) {  //post-check
      console.log('[costData] ================minsTimeDifference:', minsTimeDifference(endTime, costData.calulateDate));
      return msgCallback(null, minsTimeDifference(endTime, costData.calulateDate) < 0);
    },
    function (err) {
      if (err) return cb(err, null);
      cb(null, costData);
    }
  );
}
function dailyCalculate(feeStandardTime, costData){
  if (costData.haveSumFirstNMinCost == false && costData.firstNMinCost>0 ){
    costData = sumFirstNMinCost(costData);
  }
  feeStandardTime.forEach(function(elem){
    console.log('~~~~~~~~[dailyCalculate] time period~~~~~~~/ elem:', elem);
    let feeStandard =  elem;
    let dayStartTime = addMins(moment(costData.calulateDate).startOf('day'), elem.startTime*60);
    let dayEndTime = addMins(moment(costData.calulateDate).startOf('day'), elem.endTime*60);
    if (!feeStandard.dailyMaxLimit) feeStandard.dailyMaxLimit = 9999999999999;
    if(costData.endTime<dayEndTime) dayEndTime = costData.endTime;

    if (isInFeeTime(costData.calulateDate, dayStartTime, dayEndTime)){
      console.log('~~~~~~~~[dailyCalculate] InFeeTime');

      if(feeStandard.costOfPerTimeUnit == 0) { 
        console.log('~~~~~~~~[dailyCalculate] is free time period');
        costData.calulateDate = dayEndTime;
      }else{
        costData = sumDailyCost(feeStandard, costData, dayStartTime, dayEndTime);
      }
      
    }
  });
  costData.dailyQuota = 0;
  return costData;
}
function sumFirstNMinCost(costData){
  console.log('------------[sumFirstNMinCost]--------');
  if (isInFeeTime(costData.calulateDate, costData.startTime, costData.endTime)){
    
    costData.sum = costData.sum + costData.firstNMinCost; 
    costData.dailyQuota = costData.dailyQuota + costData.firstNMinCost;
    costData.logs.push({
      'desc': 'firstNMinCost',
      'calulateDate': costData.calulateDate.format("M/D HH:mm:ss"),
      'todayLimit': costData.dailyQuota,
      'cost': costData.firstNMinCost,
      'sum':costData.sum
    })
    console.log('[sumFirstNMinCost] costData.sum:', costData.sum);
  }
  costData.calulateDate = addMins(costData.calulateDate, costData.firstNMinTime);
  console.log('[sumFirstNMinCost] costData.calulateDate:', costData.calulateDate);
  costData.haveSumFirstNMinCost = true;
  return costData;
}

function sumDailyCost(fee, costData, dayStartTime, dayEndTime){
  let endOfDate =  moment(costData.calulateDate).endOf('day');
  console.log('[sumDailyCost] getDayOfMins(dayStartTime):', getDayOfMins(dayStartTime));
  console.log('[sumDailyCost] getDayOfMins(dayEndTime):', getDayOfMins(dayEndTime));
  let i = 0;
  do{
    i++;
    console.log('----------------i:', i);
    
    if (costData.dailyQuota < fee.dailyMaxLimit 
    && isInFeeTime(costData.calulateDate, dayStartTime, dayEndTime)
    ){
      let cost = 0;
      costData.dailyQuota = costData.dailyQuota + fee.costOfPerTimeUnit
      if (costData.dailyQuota > fee.dailyMaxLimit) {
        cost = costData.dailyQuota - fee.dailyMaxLimit;
        costData.dailyQuota = fee.dailyMaxLimit;
      }else{
        cost = fee.costOfPerTimeUnit;   
      }
      costData.sum = costData.sum + cost;
      costData.logs.push({
        'calulateDate': costData.calulateDate.format("M/D HH:mm:ss"),
        'sTime': dayStartTime.format("M/D HH:mm:ss"),
        'eTime': dayEndTime.format("M/D HH:mm:ss"),
        'todayLimit': costData.dailyQuota,
        'cost': cost,
        'sum':costData.sum
      })
    }
    costData.calulateDate = addMins(costData.calulateDate, fee.minTimeUnit);
 
    console.log('[sumDailyCost] calulateDate:', costData.calulateDate);
    console.log('[sumDailyCost] getDayOfMins(costData.calulateDate):', getDayOfMins(costData.calulateDate)); 
    console.log('[sumDailyCost] dailyQuota:', costData.dailyQuota);
    console.log('[sumDailyCost] sum:', costData.sum); 

  }while(minsTimeDifference(dayEndTime, costData.calulateDate) < 0 );
  return costData;
}


function chargeByTable(standard, startTime, endTime, cb){
  let hour = 0;
  if (standard.chargeTable && standard.chargeTable.length > 0){        
    let costData = {
      'sum': 0,
      'startTime': moment(startTime),
      'endTime': moment(endTime),
      'logs':[ {
        'startParking': moment(startTime).format("M/D HH:mm:ss"),
        'endParking': moment(endTime).format("M/D HH:mm:ss")
      }]
    };    
    hour = Math.ceil(minsTimeDifference(costData.startTime, costData.endTime)/60)
    console.log('[chargeByTable] hour:', hour);
    costData.sum = standard.chargeTable[hour-1].costPerHour;
    costData.logs.push({
      'calculateHour': minsTimeDifference(costData.startTime, costData.endTime)/60,
      'tableHour': hour,
      'sum': costData.sum
    })    
    cb(null, costData);
  }else{
    cb('No costPerTime Data', null);
  }  
}

export function calculateStandardParkingFee(approvedDeviceId, startTime, endTime, cb){ 
  let feeStandardResult, sumParkingFeeResult;
  async.series({
    findParkingFeeStandard: function(callback) {
      let where = {
        'valid': true,
        '_id': approvedDeviceId
      };
      ApprovedDeviceModel.findOne(where)
      .populate({
        path: 'parkingFeeStandardId',
        select: '-__target -__targetVer',
        //match: {'valid': true},
      })
      .exec(function(err, result) {
        if (err){
          return cb(err, null);
        }
        if(!result){
          console.log('[findParkingFeeStandard] No lastParking data, approvedDeviceId: ', approvedDeviceId);
          return cb('No data, approvedDeviceId: '+ approvedDeviceId, null);
        }else if(!result.parkingFeeStandardId){
          console.log('[findParkingFeeStandard] No parkingFeeStandardId, approvedDeviceId: ', approvedDeviceId);
          return cb(null, 'No parkingFeeStandardId');
        }
        console.log('[findParkingFeeStandard] result.parkingFeeStandardId:', result.parkingFeeStandardId);
        feeStandardResult = result.parkingFeeStandardId;
        callback(null);
      });
    },
    sumParkingFee: function(callback) {
      let costData = {
        'haveSumFirstHourFee': false,
        'sum': 0,
        'dailyQuota':0,
        'calulateDate': moment(startTime),
        'startTime': moment(startTime),
        'endTime': moment(endTime),
        'logs':[ {
          'startParking': moment(startTime).format("M/D HH:mm:ss"),
          'endParking': moment(endTime).format("M/D HH:mm:ss")
        } ]
      };
      
      console.log('[sumParkingFee] @@@@@@@@@@costData:', costData);
      console.log('[sumParkingFee] ====dayOfYear:', moment(costData.calulateDate).dayOfYear());
      async.doDuring(
        function (msgCallback) {
          console.log('[sumParkingFee] =====feeStandardResult.time_allDay.length:', feeStandardResult.time_allDay.length);
          if (feeStandardResult.time_allDay.length){ //is all day
            costData = calculatePerDay(feeStandardResult.time_allDay, costData);
            msgCallback();
          }else{
            isHoliday(costData.calulateDate, function(err, result){
              if (err) return cb(err, null);
              if (result == false){ //is work day
                console.log('[sumParkingFee] is workday!!!!!!');
                if (!feeStandardResult.time_workDay || !feeStandardResult.time_workDay.length) 
                  return cb('No time_workDay data.', null);
                costData = calculatePerDay(feeStandardResult.time_workDay, costData);
              }else{ //is holiday
                console.log('[sumParkingFee] is holiday!!!!!!');
                if (!feeStandardResult.time_holiday || !feeStandardResult.time_workDay.length) 
                  return cb('No time_holiday data.', null);
                costData = calculatePerDay(feeStandardResult.time_holiday, costData);
              }
              console.log('[sumParkingFee] =====calulateDate:', costData.calulateDate);
              console.log('[sumParkingFee] =====dayOfYear:', moment(costData.calulateDate).dayOfYear());
              msgCallback();
            });
          }
        },
        function (msgCallback) {  //post-check
          console.log('[costData] ================minsTimeDifference:', minsTimeDifference(endTime, costData.calulateDate));
          return msgCallback(null, minsTimeDifference(endTime, costData.calulateDate) < 0);
        },
        function (err) {
          if (err) return cb(err, null);
          console.log('[costData] @@@@@@@@@@costData.logs:', costData.logs);
          sumParkingFeeResult = costData.sum;
          callback();
        }
      );
    }
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    } 
    cb(null, sumParkingFeeResult);
  });
}

function calculatePerDay(feeStandardTime, costData){
  feeStandardTime.forEach(function(elem){
    console.log('~~~~~~~~[calculatePerDay] time period~~~~~~~/ elem:', elem);
    let feeStandard =  elem;
    let dayStartTime = addMins(moment(costData.calulateDate).startOf('day'), elem.startTime*60);
    let dayEndTime = addMins(moment(costData.calulateDate).startOf('day'), elem.endTime*60);
    if (!feeStandard.dailyMaxLimit) feeStandard.dailyMaxLimit = 9999999999999;
    if(costData.endTime<dayEndTime) dayEndTime = costData.endTime;

    if (isInFeeTime(costData.calulateDate, dayStartTime, dayEndTime)){
      if (costData.haveSumFirstHourFee == false && feeStandard.firstHr_minTimeUnit > 0){
        costData = sumFirstHourFee(feeStandard, costData, dayStartTime, dayEndTime);
      }
      if(feeStandard.costOfPerTimeUnit == 0) { 
        console.log('~~~~~~~~[calculatePerDay] is free time period');
        costData.calulateDate = dayEndTime;
      }else{
        costData = sumDailyFee(feeStandard, costData, dayStartTime, dayEndTime);
      }
      
    }
  });
  costData.dailyQuota = 0;
  return costData;
}

function sumFirstHourFee(fee, costData, dayStartTime, dayEndTime){
  console.log('------------[sumFirstHourFee]--------');
  if (fee.firstHr_freeTime && minsTimeDifference(dayStartTime, costData.endTime) <= fee.firstHr_freeTime){
    costData.sum = 0;
    costData.calulateDate = addMins(costData.calulateDate, fee.firstHr_minTimeUnit);
  }else{
    do{
      if (getDayOfMins(costData.calulateDate) >= getDayOfMins(dayStartTime)
      && getDayOfMins(costData.calulateDate) <= getDayOfMins(dayEndTime)){
        
        costData.sum = costData.sum + fee.firstHr_costOfPerTimeUnit; 
        costData.dailyQuota = costData.dailyQuota + fee.firstHr_costOfPerTimeUnit;
        costData.logs.push({
          'firstHourFee': true,
          'sTime':costData.calulateDate.format("M/D HH:mm:ss"),
          'eTime': addMins(costData.calulateDate, fee.firstHr_minTimeUnit).format("M/D HH:mm:ss"),
          'cost': fee.firstHr_costOfPerTimeUnit,
          'sum':costData.sum
        })
        console.log('[sumFirstHourFee] costData.sum:', costData.sum);
      }
      costData.calulateDate = addMins(costData.calulateDate, fee.firstHr_minTimeUnit);
      console.log('[sumFirstHourFee] costData.calulateDate:', costData.calulateDate);
    }while(minsTimeDifference(costData.startTime, costData.calulateDate) < 60 );
  }
  costData.haveSumFirstHourFee = true;
  return costData;
}

function sumDailyFee(fee, costData, dayStartTime, dayEndTime){
  let endOfDate =  moment(costData.calulateDate).endOf('day');
  console.log('[sumFee] getDayOfMins(dayStartTime):', getDayOfMins(dayStartTime));
  console.log('[sumFee] getDayOfMins(dayEndTime):', getDayOfMins(dayEndTime));
  let i = 0;
  do{
    i++;
    console.log('----------------i:', i);
    
    if (costData.dailyQuota < fee.dailyMaxLimit 
    && getDayOfMins(costData.calulateDate) >= getDayOfMins(dayStartTime)
    && getDayOfMins(costData.calulateDate) <= getDayOfMins(dayEndTime)
    ){
      costData.dailyQuota = costData.dailyQuota + fee.costOfPerTimeUnit;
      costData.sum = costData.sum + fee.costOfPerTimeUnit;
      costData.logs.push({
        'sTime':costData.calulateDate.format("M/D HH:mm:ss"),
        'eTime': addMins(costData.calulateDate, fee.minTimeUnit).format("M/D HH:mm:ss"),
        'cost': fee.costOfPerTimeUnit,
        'sum':costData.sum
      })
    }
    costData.calulateDate = addMins(costData.calulateDate, fee.minTimeUnit);
 
    console.log('[sumFee] calulateDate:', costData.calulateDate);
    console.log('[sumFee] getDayOfMins(costData.calulateDate):', getDayOfMins(costData.calulateDate)); 
    console.log('[sumFee] dailyQuota:', costData.dailyQuota);
    console.log('[sumFee] sum:', costData.sum); 

  }while(minsTimeDifference(dayEndTime, costData.calulateDate) < 0 );
  return costData;
}
function getFeeStandard(feeData, parkingFeeType){
  let key = "parkingFeeTypeId_" + parkingFeeType
  return  feeData[key];
}

function isInFeeTime(calulateDate, startTime, endTime){
    console.log('[isInFeeTime] startTime:', startTime);
    console.log('[isInFeeTime] endTime:', endTime);
    console.log('[isInFeeTime] calulateDate:', calulateDate);
  if (calulateDate >= startTime && calulateDate < endTime) return true;
  return false;
}

function setToNextDay(minTimeUnit, costData){
  let dayEndTime = moment(costData.calulateDate).endOf('day');
  do{ 
    costData.calulateDate = addMins(costData.calulateDate, minTimeUnit);
  }while(minsTimeDifference(dayEndTime, costData.calulateDate) < 0 );
  return costData; 
}

function isHoliday(date , cd){
//request checkholiday API
  let dayOfWeek = moment(date).day();
  console.log('[isHoliday] date:', date);
  console.log('[isHoliday] dayOfWeek:', dayOfWeek);
  if (HOLIDAY_DEFAULT.includes(dayOfWeek)) {
    return cd(null, true);
  }else{
    return cd(null, false);
  }
}

function addMins(date, minutes){
return moment(date).set('minute', moment(date).get('minute') + minutes);
}

function addDays(date, days){
return moment(date).set('day', moment(date).get('day') + minutes);
}

function getDayOfMins(date){
  return  60*moment(date).hour() + moment(date).minute() ;
}

function minsTimeDifference(startTime, endTime){
  startTime = new Date(startTime);
  endTime = new Date(endTime);
  // console.log('[endTime.getTime(): ', endTime.getTime());
  // console.log('[startTime.getTime(): ', startTime.getTime());
  return  (endTime.getTime()-startTime.getTime())/(1000*60);
}

export function calculateParkingFee(cost, time){    // (money/hr, mins)
  let fee = cost * time / 60;
  if (fee < cost) return cost;
  if ((fee % cost) > 0) return (Math.floor(fee/cost)+1)*cost;
  if ((fee % cost) == 0) return fee;
}