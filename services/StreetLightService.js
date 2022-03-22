import async from 'async';
import config from 'nconf';
import moment from 'moment';
import groupArray from 'group-array';
import path from 'path';
import uuid from 'uuid';
import fs from 'fs';
import jsonToExcel from 'json2xls';
import logger from '../config/log';
import deviceHistoryModel from '../models/deviceHistoryModel';
import approvedDeviceModel from '../models/approvedDeviceModel';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import streetLightHistoryModel from '../models/streetLightHistoryModel';
import DeviceType from '../models/type/DeviceType';

const target = config.get('EXECUTE_TARGET');
const OUTPUT_FOLDER_PATH = '../reports/excelReport/output';
const {NODE_PORT, SITE_URL} = config.get(target);

const MAX_OFFLINETIME = 120 //mins
const FORCE_TURNOFF_TIME = MAX_OFFLINETIME/3;

export function getLightOverAllSumData(bean, req, cb){
  let {input, output} = bean;
  let approveNodeId = [];
  let turnOnCountsResult = 0, turnOffCountsResult = 0, totalLightCounts = 0, avgPowerLevel = 0, todayPCResults = 0;

  if(bean.input.currentStatus && bean.input.currentStatus.length){
    totalLightCounts = bean.input.currentStatus.length;
    bean.input.currentStatus.forEach((element)=>{
      approveNodeId.push(element.nodeId);
      if(element.onOff == '1' && element.onlineStatus == '1') {
        turnOnCountsResult++;
        if(element.powerLevel) avgPowerLevel = avgPowerLevel + element.powerLevel;
      }else if(element.onOff == '0' && element.onlineStatus == '1'){
        turnOffCountsResult++;
      }
    });
    avgPowerLevel = avgPowerLevel/turnOnCountsResult;
  }
  input.historyResults = removeUnApproveNodeId(input.historyResults, approveNodeId);
  input.historyResults.forEach((ele)=>{
    let todayPC_eachNode = 0
    for (let i=0 ; i<=moment().hour(); i++) {
      if(ele.openHistoryList[i].powerConsumption) todayPC_eachNode += ele.openHistoryList[i].powerConsumption;
    }
    if(todayPC_eachNode) todayPCResults = todayPCResults + todayPC_eachNode;
  });

  let data =  {
    'turnOnRatio': Math.round(turnOnCountsResult/totalLightCounts*100),
    'turnOnCounts': turnOnCountsResult,
    'turnOffCounts': turnOffCountsResult,
    'offLineCounts': (totalLightCounts-turnOnCountsResult-turnOffCountsResult),
    'totalLightCounts': totalLightCounts,
    'todayPowerConsumption': todayPCResults/1000,
    'currentPowerLevel': avgPowerLevel/1000,
    //'historyResults': input.historyResults
  };
  // let turnOnCounts = randomData(3500);
  // let fakeResponse = {
  //   'turnOnRatio': Math.round(turnOnCounts/3500*100),
  //   'turnOnCounts': turnOnCounts,
  //   'turnOffCounts': (3500-turnOnCounts),
  //   'totalLightCounts': 3500,
  //   'todayPowerConsumption': randomData(20234),
  //   'currentPowerLevel': randomData(334),
  // };
  input.response = data;
  return cb && cb(null);
}

export function getLightTodayPowerGroupList(bean, req, cb){
  let {input, output} = bean;
  let init = 12023;
  let fakeResponse = [
    {
      'groupName': 'Seksyen 1',
      'todayPowerConsumption': randomData(init),
    },
    {
      'groupName': 'Seksyen 2',
      'todayPowerConsumption': randomData(init/2),
    },
    {
      'groupName': 'Seksyen 3',
      'todayPowerConsumption': randomData(init/4),
    },
    {
      'groupName': 'Seksyen 4',
      'todayPowerConsumption': randomData(init/8),
    },
    {
      'groupName': 'Seksyen 5',
      'todayPowerConsumption': randomData(init/16),
    },
    {
      'groupName': 'Seksyen 6',
      'todayPowerConsumption': randomData(init/32),
    },
    {
      'groupName': 'Seksyen 7',
      'todayPowerConsumption': randomData(init/64),
    },
    {
      'groupName': 'Seksyen 8',
      'todayPowerConsumption': randomData(init/128),
    }
    ]
  input.response.powerGroupList = fakeResponse;
  return cb && cb(null);
}

export function getLightStatisticsByTime(bean, req, cb){
  let {input, output} = bean;
  let approveNodeId = [];
  if(bean.input.currentStatus && bean.input.currentStatus.length){
    bean.input.currentStatus.forEach((element)=>{
      approveNodeId.push(element.nodeId);
    });
  }  
  console.log('[getLightStatisticsByTime] approveNodeId: ', approveNodeId );
  console.log('[getLightStatisticsByTime] input.historyResults.length: ', input.historyResults.length );
  input.historyResults = removeUnApproveNodeId(input.historyResults, approveNodeId);
  console.log('[getLightStatisticsByTime] input.historyResults.length: ', input.historyResults.length );  
  if(input.timeRange == 1){
    let data = [];
    for (let i=0 ; i<=moment().hour(); i++) { 
      data.push({
        'timeStamp': moment().startOf('day').set('hour', i),
        'turnOnCounts': 0,
        'powerConsumption': 0,
      });
      let todayPC_eachHour = 0
      input.historyResults.forEach((ele)=>{
        if(ele.openHistoryList[i].powerConsumption || ele.openHistoryList[i].timePeriod) {
          data[i].turnOnCounts++;
          data[i].powerConsumption +=  ele.openHistoryList[i].powerConsumption/1000;
        }
      }); 
    }
    input.response = data;
    return cb && cb(null);
  }else{
    let aggregateArray = [];
    let startTime = moment().subtract(input.timeRange, 'days').startOf('day');
    console.log('[getLightStatisticsByTime] startTime: ', startTime );
    aggregateArray.push({
      $match:{
        'nodeId': {'$in': approveNodeId},
        "statisticsDate": {'$gte': startTime.toDate()}
      }
    });
    aggregateArray.push({
      $group:{
        '_id': '$statisticsDate',
        'timeStamp': {'$last': '$statisticsDate'},
        'turnOnRatio': {'$avg': '$dailyOpenRatio'},   
        'powerConsumption': {'$sum': '$dailyPowerConsumption'},
        'turnOnRatioList' :{'$push':  "$dailyOpenRatio" },
        'powerConsumptionList': {'$push': '$dailyPowerConsumption'},
      }
    });
    aggregateArray.push({
      $sort: {
        'timeStamp': 1
      }
    });
    aggregateArray.push({
      $project: {
        '_id': 0,
        'turnOnRatioList': 0,
        'powerConsumptionList': 0
      }
    });   
    aggregateArray.push({
      $project: {
        'timeStamp': 1,
        'powerConsumption': {$divide: ['$powerConsumption', 1000]},
        'turnOnRatio': {$divide: [{'$floor': {'$multiply': ['$turnOnRatio', 1000]}}, 10]}
      }
    });  
    streetLightHistoryModel.aggregate(aggregateArray, (err, result)=>{
      //console.log('[getLightStatisticsByTime] @@@@@@ result: ', result );
      if(err){
        return cb && cb(err);
      }
      else if (!result || !result.length) {
        return cb && cb({name:'DataNotFound'});
      }
      input.response = result;
      return cb && cb(null);
    });    
  }
  // let fakeResponse = [];
  // for (let i = 1; i <= 24; i++) {
  //   fakeResponse.push({
  //     'timeStamp': moment().startOf('day').set('hour', i),
  //     'turnOnCounts': randomData(3500/24*(i)),
  //     'powerConsumption': randomData(20234/24*(i)),
  //   });
  // }
  //input.response = fakeResponse;
}

function removeUnApproveNodeId(input, approveNodeIds){
  let approve = [];
  input.forEach((ele)=>{
    if(approveNodeIds.includes(ele.nodeId)){
      approve.push(ele);
    }
  });
  return approve;
}

export function getLightStatisticsByGroup(bean, req, cb){
  let {input, output} = bean;
  let turnOnCounts = randomData(500);
  let fakeResponse =    {
    'groupName':'Seksyen',
    'latitude' : 3.073011,
    'longitude' : 101.520003,
    'totalLightCounts': 500,
    'turnOnRatio': Math.round(turnOnCounts/500*100),
    'turnOnCounts': turnOnCounts,
    'turnOffCounts': 500-turnOnCounts,
  } 
  input.response = fakeResponse;
  return cb && cb(null);
}

function randomData(input){
  let output = Math.round(input*(Math.random()*0.5+0.5));
  return output;
}

export function downloadStreetLightHistory(bean, req, cb) {
  let {input, output} = bean;
  let approveNodeIds= [];
  if(input.currentStatus && input.currentStatus.length){
    input.currentStatus.forEach(function(element) {
      approveNodeIds.push(element.nodeId);
    });
  }
  console.log('approveNodeIds: ', approveNodeIds);
  let where = {
    'nodeId': {$in: approveNodeIds},
    'statisticsDate': {
      $gte: moment(input.startDate).startOf('day').toDate(),
      $lte: moment(input.endDate).endOf('day').toDate(),
    }
  };
  streetLightHistoryModel.find(where)
  .select('nodeId statisticsDate dailyOpenRatio avgPowerLevel avgPWM dailyPowerConsumption dailyOpenTime controlTimeList')
  .sort({'statisticsDate': 1})
  .exec(function (err, results) {
    if(err) {
      console.log('parkingHistoryModel.find err');
      return cb && cb(err);
    }else if (!results || !results.length) {
      console.log('parkingHistory not found');
      input.message = { 'error': 'parkingHistory not found' };
      return cb && cb(null);
    }else{
      let jsonArrays = insertToExcelRow(results);      
      input.avgDataURL = jsonToExcelFile(jsonArrays.avgData, req.hostname);
      input.controlListURL = jsonToExcelFile(jsonArrays.controlList, req.hostname);
      return cb && cb(null);
    }
  });
}

function insertToExcelRow(data){
  let avgData_jsonArray = [];
  let controlList_jsonArray = [];
  let avgJson = {
    '每日平均開燈時間(mins)': 0,
    '每日平均開燈比例(%)': 0,
    '每日平均功率(W)': 0,
    '每日平均亮度(PWM)': 0,
    '每日平均功耗(W\-hr)': 0
  };
  let counts = 0;
  data.forEach(function (entry) {
    let statisticsDate = moment(entry.statisticsDate).format('YYYY-MM-DD');  
    // * insert rows to jsonArray * //
    let json = {};
    json['nodeId'] = entry.nodeId;
    json['統計日期'] = statisticsDate;
    json['當日開燈時間(mins)'] = entry.dailyOpenTime;
    json['當日開燈比例(%)'] = entry.dailyOpenRatio;
    json['平均功率(W)'] = entry.avgPowerLevel;
    json['平均亮度(PWM)'] = entry.avgPWM;
    json['功耗(W\-hr)'] = entry.dailyPowerConsumption;
    avgData_jsonArray.push(json);

    avgJson['每日平均開燈時間(mins)'] += entry.dailyOpenTime;
    avgJson['每日平均開燈比例(%)'] += entry.dailyOpenRatio;
    avgJson['每日平均功率(W)'] += entry.avgPowerLevel;
    avgJson['每日平均亮度(PWM)'] += entry.avgPWM;
    avgJson['每日平均功耗(W\-hr)'] += entry.dailyPowerConsumption;
    counts ++;

    if(entry.controlTimeList){
      entry.controlTimeList.forEach(function (elem, index) {
        let controlJson = {};
        controlJson['nodeId'] = entry.nodeId;
        controlJson['統計日期'] = statisticsDate;
        controlJson['控制序'] = index+1;
        controlJson['時間'] = moment(elem.time).format('HH:mm:ss');
        controlJson['開關'] = elem.onOff;
        controlJson['亮度'] = elem.pwm;
        controlJson['功率'] = elem.powerLevel;
        controlList_jsonArray.push(controlJson);
      });
    }
  });
  avgJson['nodeId'] = ' ';
  avgJson['統計日期'] = '[總平均]'
  avgJson['當日開燈時間(mins)'] = avgJson['每日平均開燈時間(mins)'] / counts;
  avgJson['當日開燈比例(%)'] = avgJson['每日平均開燈比例(%)'] / counts;
  avgJson['平均功率(W)'] = avgJson['每日平均功率(W)'] / counts;
  avgJson['平均亮度(PWM)'] = avgJson['每日平均亮度(PWM)'] / counts;
  avgJson['功耗(W\-hr)'] = avgJson['每日平均功耗(W\-hr)'] / counts;
  avgData_jsonArray.push(avgJson);

  // * append `no parking records` when jsonArray is empty * //
  if (avgData_jsonArray.length == 0) {
    jsonArray.push({ 'no parking records': '' });
  }
  let result = {
    'avgData': avgData_jsonArray,
    'controlList': controlList_jsonArray
  }
  return result;
}

function jsonToExcelFile(jsonData, hostname){
  console.log('[jsonToExcelFile] jsonData:', jsonData);
  let url;
  let excel = jsonToExcel(jsonData);
  const fileName = uuid();
  const filePath = path.join(__dirname, `${OUTPUT_FOLDER_PATH}/${fileName}.xlsx`);
  fs.writeFileSync(filePath, excel, 'binary');
  if(hostname === 'localhost' || hostname === '127.0.0.1') {
    url = `${SITE_URL}:${NODE_PORT}/report/downloadExcel?filename=${fileName}`;
  }else{
    url = `${SITE_URL}/report/downloadExcel?filename=${fileName}`;
  }
  return url;
}

export function calculatDailyStreetLightHistory(bean, cb) {
	let {input, output} = bean;
  let approvedNodeIdResult, historyResults, saveResult;
  if(!input.statisticsDate){
  	let date = new Date();
    input.statisticsDate = moment(new Date(date.setDate(date.getDate()-1))).format("YYYY-MM-DD");
  }
  console.log('[calculatDailyStreetLightHistory] input.statisticsDate: ', input.statisticsDate );
  async.series({
    getApprovedNodeId: function(callback) {
    	let where = {
        'valid': true,  
         //   "nodeId" : "0x000c0220",
        'deviceType': DeviceType.SMARTLAMP.value
      };
      approvedDeviceModel.find(where)
      .select('-_id nodeId')
      .exec(function(err, results) {
        let data;
        if (err){
          return cb && cb(err);
        }
        if(!results || !results.length){
          return cb && cb({name: 'NodeIdNotFound'});
        }else{
          approvedNodeIdResult = results;
          callback(null);
        }
      });
    },
    calculatDailyStreetLightHistory: function(callback) {
  		approvedNodeIdResult.forEach((elem) => {
	      elem.statisticsDate = input.statisticsDate;
			});
			async.map(approvedNodeIdResult, calculatDailyStreetLightHistory_eachNodeId, function(err, results){
			  if (err) return cb && cb(err);
        //console.log('historyResults: ',results);
			  historyResults = results;
			  callback(null);
			});
    },
    saveStreetLightHistory: function(callback) {
      if(input.isNoSave == true) {
        callback(null);
      }else{
        async.map(historyResults, saveStreetLightHistory_eachNodeId, function(err, results){
          if (err) return cb && cb(err);
          saveResult = results;
          callback(null);
        });
      }
    },
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    }
    input.historyResults = historyResults;
    return cb && cb(null, historyResults);
  });
}

function calculatDailyStreetLightHistory_eachNodeId(req, cb) {
  console.log('calculatDailyStreetLightHistory_eachNodeId');
  let yesterdayResult, parkingHistoryResult;
  let data = {};
  data.nodeId = req.nodeId;
  async.series({
    checkYesterdayOverNight: function(callback) {
      checkYesterdayOverNightData(req.nodeId, req.statisticsDate, (err, result)=>{
			  if (err) {
			    return cb(err, null);
			  }else if (!result) {
			  	console.log('[checkYesterdayOverNightData] No overNight data');
    	    //return cb(null, 'No overNight data');
        }
        yesterdayResult = result;
        callback(null);
      });
    },
    getStreetLightHistory: function(callback) {
		  getStreetLightHistory(req.nodeId, req.statisticsDate, 1, yesterdayResult, (err, results)=>{
		    if (err) {
		      return cb(err, null);
		    }else if (!results) {
		    	return cb(null, 'NodeIdNotFound');
		    }
        if(results.controlTimeList && results.controlTimeList.length>0)  data.controlTimeList = results.controlTimeList;
		    data.statisticsDate = moment(req.statisticsDate).toDate();
		    data.haveOverNight = results.haveOverNight;
		    data.openHistoryList = results.openHistoryList;
		    data.dailyOpenTime = 0;
		    data.dailyPowerConsumption = 0; 
		    data.avgPWM = 0;
		    data.avgPowerLevel = 0;
		    data.dailyOpenRatio = 0;
        let sumPwmTime = 0;
		    results.openHistoryList.forEach(function(elem, i, array) {
      	  //console.log('[getParkingStatus]=================================================== i: ', i );
          //console.log('[getParkingStatus] elem: ', elem);
          if(elem.pwmTimeValue) sumPwmTime += elem.pwmTimeValue;
          if(elem.timePeriod) data.dailyOpenTime += elem.timePeriod;
          if(elem.powerConsumption) data.dailyPowerConsumption += elem.powerConsumption;
        });
				if(data.dailyOpenTime) data.avgPWM = sumPwmTime/(data.dailyOpenTime);
        if(data.dailyOpenTime) data.avgPowerLevel = data.dailyPowerConsumption*60/(data.dailyOpenTime);
        data.dailyOpenRatio = data.dailyOpenTime/(24*60);
		    //console.log('[calculatDailyParkingTime] data', data);
		    callback(null);
		  });
    }
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    }
    return cb(null, data);
  });
}

function saveStreetLightHistory_eachNodeId(reqUpdate, callback){
	reqUpdate.valid = true;
  //console.log('[checkYesterdayOverNightData] @@@@@@ nodeId: ', reqUpdate.nodeId );
  //console.log('[checkYesterdayOverNightData] @@@@@@ statisticsDate: ', reqUpdate.statisticsDate );
  streetLightHistoryModel.update({'nodeId': reqUpdate.nodeId, "statisticsDate": reqUpdate.statisticsDate},
  reqUpdate, {upsert: true}, (err, result)=>{
    if(err){
    	return callback(null, err);
    }
    else if (!result) {
    	return callback(null, '新增失敗');
    }
    //console.log('[checkYesterdayOverNightData] @@@@@@ result: ', result );
    callback(null, result)
  });
}

function checkYesterdayOverNightData(nodeId, nowDate, cb){
	let where = {
    //'valid': true,
    'nodeId': nodeId
  };
  let yesterday = moment(nowDate).set('date', moment(nowDate).get('date')-1);
	let	startTime = moment(yesterday).startOf('day').toDate();
	let	endTime = moment(yesterday).endOf('day').toDate();
  console.log('[checkYesterdayOverNightData] @@@@@@ startTime: ', startTime );
  console.log('[checkYesterdayOverNightData] @@@@@@ endTime: ', endTime );
  where['statisticsDate'] = {'$gte': new Date(startTime), '$lt': new Date(endTime)};

  streetLightHistoryModel.findOne(where)
  .select('-_id haveOverNight openHistoryList')
  .exec(function(err, result) {
    if (err){
      return cb(err, null);
    }
    if(!result){
      return cb(null, 0);
    }else{
      return cb(null, result);
    }
  });
}

function getStreetLightHistory(nodeId, statisticsDate, timeRange, yesterdayResult, cb){
  console.log('getStreetLightHistory');
  let deviceStatusResult, latestParking, approvedDeviceResult;
  let endTime, startTime;
  let historyList = [];
  let controlTimeList = [];
  let haveOverNight = 0;
  async.series({
    getDeviceStatusHistory: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId,
        'eventType': {$in: ["01", "FF"]}
      };
      if (statisticsDate) {
				startTime = moment(statisticsDate).startOf('day').toDate();
				endTime = moment(statisticsDate).endOf('day').toDate();
        //console.log('[getDeviceStatusHistory] startTime: ', startTime );
        //console.log('[getDeviceStatusHistory] endTime: ', endTime );
        where['timestamp'] = {'$gte': startTime, '$lte': endTime};
      }
      deviceStatusHistoryModel.find(where)
      .select('onOff pwm powerLevel lightValue timestamp messageId eventType')
      .sort({'timestamp':1})
      .exec(function(err, results) {
        let data;
        if (err){
          return cb(err, null);
         }
        if(!results || !results.length){
          //console.log('[getDeviceStatusHistory] No deviceStatusHistory, nodeId', nodeId );
        }
      	let yesterdayData;
        if(yesterdayResult.haveOverNight == 1){
          yesterdayData = {
          	'timestamp': moment(statisticsDate).set('date', moment(statisticsDate).get('date')).startOf('day').toDate(),
            'onOff': "1"
          }
          let yesterdayHistorylength = yesterdayResult.openHistoryList.length;
          if(yesterdayHistorylength){
          	yesterdayData.pwm = yesterdayResult.openHistoryList[yesterdayHistorylength-1].pwm;
						yesterdayData.powerLevel = yesterdayResult.openHistoryList[yesterdayHistorylength-1].powerLevel;
         		yesterdayData.lightValue = yesterdayResult.openHistoryList[yesterdayHistorylength-1].lightValue; 	
          }
        }else{
        	yesterdayData = {
          	'timestamp': moment(statisticsDate).set('date', moment(statisticsDate).get('date')).startOf('day').toDate(),
            'onOff': "0"
          }
        }
        deviceStatusResult = [];
        deviceStatusResult.push(yesterdayData);
        deviceStatusResult = deviceStatusResult.concat(results);
        deviceStatusResult = checkOffLineStatus(deviceStatusResult);
        //console.log('[getDeviceStatusHistory] deviceStatusResult: ', deviceStatusResult );
        callback(null)
      });
    },
    calculateLightTime: function(callback) {
      let data;
      for (let i=0; i<24; i++){
      	historyList[i] = {
      		'hour': i,
      		'timePeriod': 0,
      		'powerConsumption': 0,
          'pwmTimeValue': 0
      	};
      }
      deviceStatusResult.forEach(function(element, i, array) {
      	 //console.log('[calculateLightTime]=================================================== i: ', i );
         //console.log('[calculateLightTime] element: ', element );
        if (element.onOff=="1"){ //turn on light
        	let timePeriod_currentHour = 0;
        	let timePeriod_nextHour = 0;
        	let hour = moment(element.timestamp).get('hour');
          
          if(i == deviceStatusResult.length-1){ 
          	//console.log('[calculateLightTime] i == deviceStatusResult.length-1 !!!!!!');
            timePeriod_currentHour = minsTimeDifference(element.timestamp, nextHour(element.timestamp));            
            
            for (let h=hour+1; h<24; h++){
            	historyList[h].powerLevel = element.powerLevel;  
            	historyList[h].pwm = element.pwm;  
            	historyList[h].timePeriod += 60;     
              historyList[h].pwmTimeValue += 60*element.pwm;        
              historyList[h].powerConsumption += 60*element.powerLevel/60;    
            }
            haveOverNight = 1;
          }else{
            let next_hour = moment(deviceStatusResult[i+1].timestamp).get('hour');
	          if(next_hour != hour){
	          	//console.log('[calculateLightTime] Across the next hour!!!!!!!!!!! ');
	            timePeriod_currentHour = minsTimeDifference(element.timestamp, nextHour(element.timestamp));
	            
              for (let h=hour+1; h<=next_hour; h++){
                if(h == next_hour){
                  timePeriod_nextHour = minsTimeDifference(moment(deviceStatusResult[i+1].timestamp).startOf('hour').toDate(), deviceStatusResult[i+1].timestamp);
                }else{
                  timePeriod_nextHour = 60;
                }
                let powerConsumption_nextHour = timePeriod_nextHour*element.powerLevel/60;
                let pwmTimeValue_nextHour = element.pwm*timePeriod_nextHour;
                historyList[h].timePeriod += timePeriod_nextHour;
                historyList[h].powerConsumption += powerConsumption_nextHour;
                historyList[h].pwmTimeValue += pwmTimeValue_nextHour;
                //console.log('[calculateLightTime] historyList[h]: ', historyList[h] );
              }
	            //console.log('[calculateLightTime] hour: '+(hour+1)+' timePeriod_nextHour: '+ timePeriod_nextHour );
	          }else{
	          	timePeriod_currentHour = minsTimeDifference(element.timestamp, deviceStatusResult[i+1].timestamp);
	          }
          }
          historyList[hour].powerLevel = element.powerLevel;  
          historyList[hour].pwm = element.pwm;  

          historyList[hour].pwmTimeValue += element.pwm*timePeriod_currentHour;  
          historyList[hour].timePeriod += timePeriod_currentHour;   
          let powerConsumption = (timePeriod_currentHour*element.powerLevel)/60;        
          historyList[hour].powerConsumption += powerConsumption;  
          //console.log('[calculateLightTime] historyList[hour]: ', historyList[hour] );
          //console.log('[calculateLightTime] hour: '+hour+' timePeriod: '+ timePeriod_currentHour+' powerLevel: '+ element.powerLevel);               
        }

        if(element.eventType == "01"){
          controlTimeList.push({
            'time': element.timestamp,
            'onOff': element.onOff,
            'pwm': element.pwm,
            'powerLevel': element.powerLevel
          });
        }
      });
      callback(null);
    },
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    }
    let result = {
		  'haveOverNight': haveOverNight,  	
		  'openHistoryList': historyList,
      'controlTimeList': controlTimeList
    }
    //console.log('[calculateLightTime] result: ', result);
    return cb(null, result);
  });
}

function checkOffLineStatus(history){
  let history_modified = [];
  let offLineTime = 0;
  history.forEach(function(elem, i, array) {
    history_modified.push(elem);
    if(elem.onOff == "0") return;
    if(i == history.length-1){
      offLineTime = minsTimeDifference(elem.timestamp, moment(history[i].timestamp).endOf('day').toDate())
    
    }else{
      offLineTime = minsTimeDifference(elem.timestamp, history[i+1].timestamp)
    }
    if(offLineTime >= MAX_OFFLINETIME){
      let forceTurnOffLight = {
        'timestamp': moment(elem.timestamp).add(FORCE_TURNOFF_TIME, 'minutes').toDate(),
        'onOff': "0",
        'memo': 'Forced to turn off the light!'
      }
      history_modified.push(forceTurnOffLight);
    }
  });
  return history_modified;
}

function minsTimeDifference(startTime, endTime){
	console.log('startTime: ', new Date(startTime));
  console.log('endTime:   ', new Date(endTime));
  return  (endTime.getTime()-startTime.getTime())/(1000*60);
}

function nextHour(time){
  return moment(time).endOf('hour').add(1, 'ms').toDate();
}
