import util from 'util';
import async from 'async';
import config from 'nconf';
import i18next from 'i18next';
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
import parkingHistoryModel from '../models/parkingHistoryModel';
import tagModel from '../models/tagModel';
import DeviceType from '../models/type/DeviceType';

const OUTPUT_FOLDER_PATH = '../reports/excelReport/output';
const target = config.get('EXECUTE_TARGET');
const {NODE_PORT, SITE_URL} = config.get(target);
const SELECT_updateRefValue_projection = {nodeId:1,ref_xValue:1,ref_yValue:1,ref_zValue:1,xWeight:1,yWeight:1,zWeight:1,smithZoneTop:1,smithZoneButtom:1,x_temp_weight:1,y_temp_weight:1,z_temp_weight:1,ref_temp:1};

export function updateRefValue(bean, req, res, cb) {
  let {input, output} = bean;
  console.log('[updateRefValue] input: ', input );
  async.map(req.body, updateApprovedDevice, function(err, results){
    if (err) return console.log('[updateRefValue] err: ', err);
    input.updateResult = results;
    cb(null, results);
  });
}
function updateApprovedDevice(updateData, callback){
  approvedDeviceModel.findOneAndUpdate({'nodeId': updateData.nodeId}, 
  updateData, {new: true, projection: SELECT_updateRefValue_projection}, (err, result)=>{
    if(err) return callback(null,{'err': err, nodeId: updateData.nodeId} );
    if(!result) return  callback(null, {'msg': "No this nodeId.", nodeId: updateData.nodeId} );
    //console.log('[updateApprovedDevice] result: ', result);
    callback(null,{'success': result} )
  });
}

export function reCalculateParkingStatus(bean, req, res, cb) {
	let {input, output} = bean;
	let calibrationMsgIdResult;
	let responseData = {};
  async.series({
  	findCalibrationMsgId: function(callback) {
      deviceStatusHistoryModel.find({'nodeId': {'$in': input.nodeId}, 'basicData': "calibration", 'timestamp':{'$gte': input.startTime}}
      , {'_id': 0, 'messageId': 1}, function(err, results) {
        if (err) return cb && cb(err);    
        console.log('[1. findCalibrationMsgId] find results: ', results);
        responseData.calibrationMessageId = results;
        if(!results || !results.length){
          return callback(null);
        }else{
        	calibrationMsgIdResult = [];
        	for (let k in results){
            calibrationMsgIdResult.push(results[k].messageId)
        	}
          callback(null);
        }
      });
  	},
  	avoidDecodeCalibrationPayload: function(callback) {
  		if(!calibrationMsgIdResult || !calibrationMsgIdResult.length){
  		 	return callback(null);
  		}else{
  			deviceHistoryModel.update({'messageId': {"$in": calibrationMsgIdResult}}
        , {'$set': {'isDecoded' : "4"}}, {'multi': true}, function(err, results){
	        if (err) return cb && cb(err);      
        	console.log('[2. avoidDecodeCalibrationPayload] update results: ', results);
        	responseData.avoidToDecodeCalibrationPayload = results;
          callback(null);
        });
  		}
  	},
  	removeOldDeviceStatusHistory: function(callback) {
      deviceStatusHistoryModel.remove({'nodeId': {'$in': input.nodeId}, 'timestamp': {'$gte': input.startTime}}
	    , function(err, results) {
        if (err) return cb && cb(err);     
        console.log('[3. removeOldDeviceStatusHistory] remove results.result: ', results.result);
        responseData.removeOldDeviceStatusHistory = results;
        callback(null);
      });
  	},
  	resetDeviceHistoryToUndecoded: function(callback) {
      deviceHistoryModel.update({'nodeId': {'$in': input.nodeId}, 'timestamp': {'$gte': input.startTime}
	    , 'isDecoded': {'$in': ["1","2"]}}, {'$set': {'isDecoded': "0"}}, {"multi":true}
	    , function(err, results) {
        if (err) return cb && cb(err);     
        console.log('[4. resetDeviceHistory] update results: ', results);
        responseData.resetDeviceHistoryToUndecoded = results;
        callback(null);
      });
  	}
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    }
    input.updateResult = responseData;
    return cb && cb(null);
  });	

}

export function calculatDailyParkingTime(bean, req, res, cb) {
	let {input, output} = bean;
  let approvedNodeIdResult, parkingResults, saveResult;
  if(!input.parkingDate){
  	let date = new Date();
    input.parkingDate = moment(new Date(date.setDate(date.getDate()-1))).format("YYYY-MM-DD");
  }
  console.log('[calculatDailyParkingTime] input.parkingDate: ', input.parkingDate );
  async.series({
    getApprovedNodeId: function(callback) {
    	let where = {
        'valid': true,
        'deviceType': DeviceType.PARKINGSENSOR.value
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
    calculatDailyParkingTime: function(callback) {
  		approvedNodeIdResult.forEach((elem) => {
	      elem.parkingDate = input.parkingDate;
			});
			async.map(approvedNodeIdResult, calculatDailyParkingTime_eachNodeId, function(err, results){
			  if (err) return cb && cb(err);
			  parkingResults = results;
			  callback(null);
			});
    },
    saveParkingHistory: function(callback) {
			async.map(parkingResults, saveParkingHistory_eachNodeId, function(err, results){
			  if (err) return cb && cb(err);
			  saveResult = results;
			  callback(null);
			});
    },
  }, function(err, results) {
    if (err) {
      return cb && cb(err);
    }
    input.parkingResults = parkingResults;
    return cb && cb(null, parkingResults);
  });
}

export function downloadParkingSummary(bean, req, res, cb) {
	let {input, output} = bean;
  // * retrieve parameters from req.body * //
	let parameters = JSON.parse(JSON.stringify(req.body));
	delete parameters.token;
	console.log('[Download Parking Summary]');
	console.log(parameters);
	// * check user.levelOneId and user.levelTwoId * //
	if (!parameters.user.levelOneId && !parameters.user.levelTwoId) {
		console.log('no privilege to access data');
		return cb & cb(new Error('no privilege to access data'));
	}
	// * derive and check timeRangeInHour * //
	let timeRangeInHour;
	if (/^[0-9]{4}[0-9]{2}$/.test(parameters.month)) {
    var date = moment(parameters.month, 'YYYYMM');
    if (date.isValid()) {
			var year = Number(date.format('YYYY'));
	    var month = Number(date.format('MM'));
			timeRangeInHour = 24.00 * ( new Date(year, month, 0).getDate() );
		}
  } else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.date)) {
    var date = moment(parameters.date, 'YYYY-MM-DD');
    if (date.isValid()) timeRangeInHour = 24.00;
  } else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.startDate) && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.endDate)) {
    var startDate = moment(parameters.startDate, 'YYYY-MM-DD');
    var endDate = moment(parameters.endDate, 'YYYY-MM-DD');
    if (startDate.isValid() && endDate.isValid()) {
			var duration = moment.duration(endDate.diff(startDate));
			timeRangeInHour = duration.asHours() + 24.0;
		}
  }
	if (!timeRangeInHour || timeRangeInHour < 0) {
		console.log('invalid month, date, or startDate and endDate');
		return cb && cb(new Error('invalid month, date, or startDate and endDate'));
	}
	async.waterfall([
		function (callback) {
			// * create nodeIdToNameMap * //
			createNodeIdToNameMap(req.body.user.name === '仁寶管理員' ? {} : req.body.user, callback);
		},
		function (nodeIdToNameMap, callback) {
			let aggregateArray = [];
			let projectFields = {};
			projectFields['nodeId'] = '$nodeId';
			projectFields['parkingDate'] = '$parkingDate';
			projectFields['dailyParkingTime'] = '$dailyParkingTime';
			projectFields['dailyParkingCounts'] = '$dailyParkingCounts';
			projectFields['haveOverNight'] = '$haveOverNight';
			const offsetInMilliSecond = moment().utcOffset() * 60 * 1000;
			projectFields['year'] = { $year: { $add: [ '$parkingDate', offsetInMilliSecond ] } };
			projectFields['month'] = { $month: { $add: [ '$parkingDate', offsetInMilliSecond ] } };
			projectFields['date'] = { $dateToString: { 'format': '%Y-%m-%d', 'date': { $add: [ '$parkingDate', offsetInMilliSecond ] } } };
			aggregateArray.push({
        $project: projectFields
      });
			let matchFields = {};
			matchFields['nodeId'] = { $in: Object.keys(nodeIdToNameMap) };
			if (/^[0-9]{4}[0-9]{2}$/.test(parameters.month)) {
				matchFields['year'] = Number(parameters.month.substring(0, 4));
				matchFields['month'] = Number(parameters.month.substring(4, 6));
			} else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.date)) {
				matchFields['date'] = parameters.date;
			} else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.startDate) && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.endDate)) {
				matchFields['parkingDate'] = {
					$gte: moment(parameters.startDate).startOf('day').toDate(),
					$lte: moment(parameters.endDate).endOf('day').toDate(),
				};
			}
      aggregateArray.push({
        $match: matchFields
      });
			aggregateArray.push({
				$group: {
					'_id': '$nodeId',
					'history': {
						$push: {
							'nodeId': '$nodeId',
							'parkingDate': '$parkingDate',
							'dailyParkingTime': '$dailyParkingTime',
							'dailyParkingCounts': '$dailyParkingCounts',
						}
					}
				}
			});
			parkingHistoryModel.aggregate(aggregateArray, function(err, results){
				if (err){
					return cb & cb(err);
				}
				let parkingHistory = [];
				results.forEach(function (entry) {
					entry.history.forEach(function (record) {
						parkingHistory.push(record);
					});
				});
				callback(null, parkingHistory, nodeIdToNameMap);
			});
		},
		function (parkingHistory, nodeIdToNameMap, callback) {
			let parkingSummary = {};
			// * key, value: nodeId, {parkingTimeMinute, parkingCount} * //
			parkingHistory.forEach(function(entry, callback) {
				if (!parkingSummary[entry.nodeId]) {
					parkingSummary[entry.nodeId] = {
						'parkingTimeMinute': entry.dailyParkingTime,
						'parkingCount': entry.dailyParkingCounts,
					};
				} else {
					parkingSummary[entry.nodeId].parkingTimeMinute += entry.dailyParkingTime;
					parkingSummary[entry.nodeId].parkingCount += entry.dailyParkingCounts;
				}
			});
			callback(null, parkingSummary, nodeIdToNameMap);
		},
		function (parkingSummary, nodeIdToNameMap, callback) {
			let jsonArray = [];
			Object.keys(parkingSummary).forEach(function (nodeId) {
				// * derive averageParkingTime and usingRatio * //
				let parkingTime = parkingSummary[nodeId].parkingTimeMinute / 60.00;
				let parkingCount = parkingSummary[nodeId].parkingCount;
				let averageParkingTime = parkingTime / parkingCount;
				let usingRatio = parkingTime / timeRangeInHour;
				// * insert rows to jsonArray * //
				let json = {};
				json['nodeId'] = nodeId;
				if (/^[0-9]{4}[0-9]{2}$/.test(parameters.month)) {
					json['year'] = Number(parameters.month.substring(0, 4));
					json['month'] = Number(parameters.month.substring(4, 6));
				} else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.date)) {
					json['date'] = parameters.date;
				} else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.startDate) && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(parameters.endDate)) {
					json['startDate'] = parameters.startDate;
					json['endDate'] = parameters.endDate;
				}
				if (req.body.month) {
					json['monthlyParkingTime'] = parkingTime.toFixed(2);
					json['monthlyParkingCount'] = parkingCount;
					json['averageMonthlyParkingTime'] = averageParkingTime.toFixed(2);
					json['monthlyUsingRatio'] = usingRatio.toFixed(2);
				} else if (req.body.date) {
					json['dailyParkingTime'] = parkingTime.toFixed(2);
					json['dailyParkingCount'] = parkingCount;
					json['averageDailyParkingTime'] = averageParkingTime.toFixed(2);
					json['dailyUsingRatio'] = usingRatio.toFixed(2);
				} else if (req.body.startDate && req.body.endDate) {
					json['parkingTime'] = parkingTime.toFixed(2);
					json['parkingCount'] = parkingCount;
					json['averageParkingTime'] = averageParkingTime.toFixed(2);
					json['usingRatio'] = usingRatio.toFixed(2);
				}
				json['note'] = nodeIdToNameMap[nodeId];
				jsonArray.push(json);
			});
			if (jsonArray.length == 0) {
				// * append `no parking records` when jsonArray is empty * //
				jsonArray.push({ 'no parking records': '' });
			} else if (jsonArray.length > 1) {
				// * sort jsonArray when it contains 2 elements or more * //
				jsonArray.sort(function (a, b) {
					if (a.note < b.note) return -1;
					if (a.note > b.note) return 1;
					if (a.nodeId < b.nodeId) return -1;
					if (a.nodeId > b.nodeId) return 1;
					return 0;
				});
			}
			callback(null, jsonArray);
		},
	], function (err, results) {
		if (err){
			return cb & cb(err);
		}
		let excel = jsonToExcel(results);
		const fileName = uuid();
		const filePath = path.join(__dirname, `${OUTPUT_FOLDER_PATH}/${fileName}.xlsx`);
    fs.writeFileSync(filePath, excel, 'binary');
		if(req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
			input.url = `${SITE_URL}:${NODE_PORT}/report/downloadExcel?filename=${fileName}`;
		}
		else {
			input.url = `${SITE_URL}/report/downloadExcel?filename=${fileName}`;
		}
		return cb && cb(null);
	});
}

export function downloadParkingDetails(bean, req, res, cb) {
	let {input, output} = bean;
  // * retrieve parameters from req.body * //
	let parameters = JSON.parse(JSON.stringify(req.body));
	delete parameters.token;
	console.log('[Download Parking Details]');
	console.log(parameters);
	// * check user.levelOneId and user.levelTwoId * //
	if (!parameters.user.levelOneId && !parameters.user.levelTwoId) {
		console.log('no privilege to access data');
		input.message = { 'error': 'no privilege to access data' };
		return cb && cb(null);
	}
	async.waterfall([
		function (callback) {
			// * retrieve deviceName from approvedDeviceModel * //
			let where = {};
			where['deviceType'] = DeviceType.PARKINGSENSOR.value;
			where['nodeId'] = parameters.nodeId;
			if (parameters.user.name !== '仁寶管理員') {
				if (parameters.user.levelOneId) where['levelOneId'] = parameters.user.levelOneId;
				if (parameters.user.levelTwoId) where['levelTwoId'] = parameters.user.levelTwoId;
			}
			approvedDeviceModel.findOne(where)
			.select('name')
			.exec(function (err, approvedDevice) {
				if (err){
					console.log('approvedDeviceModel.find err');
					return cb && cb(err);
				} else if(!approvedDevice) {
					console.log('device not found, or no privilege to access data');
					input.message = { 'error': 'device not found, or no privilege to access data' };
					return cb && cb(null);
				} else {
					let deviceName = approvedDevice.name || '';
					callback(null, approvedDevice.name);
				}
			});
		},
		function (deviceName, callback) {
			let where = {
				'nodeId': parameters.nodeId,
				'parkingDate': {
					$gte: moment(parameters.startDate).startOf('day').toDate(),
					$lte: moment(parameters.endDate).endOf('day').toDate(),
				}
			};
			parkingHistoryModel.find(where)
			.select('parkingDate dailyParkingTime parkingHistoryList')
			.sort({ 'parkingDate': 1 })
			.exec(function (err, results) {
				if (err) {
					console.log('parkingHistoryModel.find err');
					return cb && cb(err);
				} else if (!results || !results.length) {
					console.log('parkingHistory not found');
					input.message = { 'error': 'parkingHistory not found' };
					return cb && cb(null);
				} else {
					let jsonArray = [];
					results.forEach(function (entry) {
						var parkingDate = moment(entry.parkingDate).format('YYYY-MM-DD');
						entry.parkingHistoryList.forEach(function (record, index) {
							let startTime = record.startParking ? moment(record.startParking) : moment(parkingDate).startOf('day');
							let endTime = record.endParking ? moment(record.endParking) : moment(parkingDate).endOf('day');
							let duration = moment.utc(endTime.diff(startTime));
							// * insert rows to jsonArray * //
							let json = {};
							json['nodeId'] = parameters.nodeId;
							json['date'] = parkingDate;
							json['count'] = index + 1;
							json['startTime'] = startTime.format('HH:mm:ss');
							json['endTime'] = endTime.format('HH:mm:ss');
							json['duration'] = duration.format('HH:mm:ss');
							json['note'] = deviceName;
							jsonArray.push(json);
						});
						// * add all-day-long parking record * //
						if (entry.dailyParkingTime == 1440) {
							var startTime = moment(parkingDate).startOf('day');
							var endTime = moment(parkingDate).endOf('day');
							var duration = moment.utc(endTime.diff(startTime));
							jsonArray.push({
								'nodeId': parameters.nodeId,
								'date': parkingDate,
								'count': 1,
								'startTime': startTime.format('HH:mm:ss'),
								'endTime': endTime.format('HH:mm:ss'),
								'duration': endTime.format('HH:mm:ss'),
								'note': deviceName,
							});
						}
					});
					// * append `no parking records` when jsonArray is empty * //
					if (jsonArray.length == 0) {
						jsonArray.push({ 'no parking records': '' });
					}
					callback(null, jsonArray);
				}
			});
		}
	], function (err, results) {
		if (err){
			return cb && cb(err);
		}
		let excel = jsonToExcel(results);
		const fileName = uuid();
		const filePath = path.join(__dirname, `${OUTPUT_FOLDER_PATH}/${fileName}.xlsx`);
    fs.writeFileSync(filePath, excel, 'binary');
		if(req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
			input.url = `${SITE_URL}:${NODE_PORT}/report/downloadExcel?filename=${fileName}`;
		}
		else {
			input.url = `${SITE_URL}/report/downloadExcel?filename=${fileName}`;
		}
		return cb && cb(null);
	});
}

export function generateParkingStatisticsByNodeId(bean, req, res, cb) {
	console.log('[Generate Parking Statistics By NodeId]');
	let {input, output} = bean;
	// * set startTime and endTime * //
	let startTime = moment(input.startDate).startOf('day').toDate();
	let endTime = moment(input.endDate).endOf('day').toDate();
	async.waterfall([
		function (callback) {
			// * create nodeIdToNameMap * //
			createNodeIdToNameMap(req.body.user.name === '仁寶管理員' ? {} : req.body.user, callback, input.tagId);
		},
		function (nodeIdToNameMap, callback) {
			// * aggregate parkingHistory * //
			let aggregateArray = [];
			aggregateArray.push({
				$project: {
					'nodeId': 1,
					'parkingDate': 1,
					'dailyParkingCounts': 1,
					'dailyParkingTime': 1,
				}
			});
			aggregateArray.push({
				$match: {
					'nodeId': { $in: Object.keys(nodeIdToNameMap) },
					'parkingDate': { $gte: startTime, $lte: endTime },
				}
			});
			aggregateArray.push({
				$group: {
					'_id': '$nodeId',
					'parkingCount': { $sum: '$dailyParkingCounts' },
					'parkingTimeInMinute': { $sum: '$dailyParkingTime' },
				}
			});
			parkingHistoryModel.aggregate(aggregateArray, function (err, results) {
				if (err) {
					callback(err);
				} else if (!results || results.length == 0) {
					callback(new Error('no parkingHistory aggregated'));
				} else {
					var parkingStatistics = [];
					results.forEach(function (entry) {
						parkingStatistics.push({
							'nodeId': entry._id,
							'name': nodeIdToNameMap[entry._id],
							'parkingCount': entry.parkingCount,
							'parkingTime': entry.parkingTimeInMinute / 60.0,
						});
					});
					parkingStatistics.sort(function (a, b) {
						if (a.name > b.name) return 1;
						if (a.name < b.name) return -1;
						if (a.nodeId > b.nodeId) return 1;
						if (a.nodeId < b.nodeId) return -1;
						return 0;
					});
					callback(null, parkingStatistics);
				}
			});
		},
	], function (err, results) {
		if (err) {
			return cb && cb(err);
		} else {
			input.parkingStatisticsByNodeId = results;
			return cb && cb(null);
		}
	});
}

export function generateParkingStatisticsByDayOfWeek(bean, req, res, cb) {
	console.log('[Generate Parking Statistics By DayOfWeek]');
	let {input, output} = bean;
	// * set startTime and endTime * //
	let startTime = moment(input.startDate).startOf('day').toDate();
	let endTime = moment(input.endDate).endOf('day').toDate();
	async.waterfall([
		function (callback) {
			// * create nodeIdToNameMap * //
			createNodeIdToNameMap(req.body.user.name === '仁寶管理員' ? {} : req.body.user, callback, input.tagId, input.nodeId);
		},
		function (nodeIdToNameMap, callback) {
			// * aggregate parkingHistory by dayOfWeek* //
			let aggregateArray = [];
			const offsetInMilliSecond = moment().utcOffset() * 60 * 1000;
			aggregateArray.push({
				$project: {
					'nodeId': 1,
					'parkingDate': 1,
					'dayOfWeek': { $dayOfWeek: { $add: [ '$parkingDate', offsetInMilliSecond ] } }, // * dayOfWeek between 1 (Sunday) to 7 (Saturday) * //
					'dailyParkingCounts': 1,
					'dailyParkingTime': 1,
				}
			});
			aggregateArray.push({
				$match: {
					'nodeId': { $in: Object.keys(nodeIdToNameMap) },
					'parkingDate': { $gte: startTime, $lte: endTime },
				}
			});
			aggregateArray.push({
				$group: {
					'_id': '$dayOfWeek',
					'parkingCount': { $sum: '$dailyParkingCounts' },
					'parkingTimeInMinute': { $sum: '$dailyParkingTime' },
					'parkingDateList': { $push: { $dateToString: { 'format': '%Y-%m-%d %H:%M:%S:%L', 'date': '$parkingDate' } } },
				}
			});
			parkingHistoryModel.aggregate(aggregateArray, function (err, results) {
				if (err) {
					callback(err);
				} else if (!results || results.length == 0) {
					callback(new Error('no parkingHistory aggregated'));
				} else {
					var parkingStatistics = [];
					results.forEach(function (entry) {
						let parkingDateCount = new Set(entry.parkingDateList).size;
						parkingStatistics.push({
							'dayOfWeek': entry._id,
							'avgParkingCount': entry.parkingCount / parkingDateCount,
							'avgParkingTime': entry.parkingTimeInMinute / 60.0 / parkingDateCount,
						});
					});
					parkingStatistics.sort(function (a, b) {
						if (a.dayOfWeek > b.dayOfWeek) return 1;
						if (a.dayOfWeek < b.dayOfWeek) return -1;
						return 0;
					});
					// * decode dayOfWeek * //
					const dayOfWeekMap = { 1: 'SUN', 2: 'MON', 3: 'TUE', 4: 'WED', 5: 'THU', 6: 'FRI', 7: 'SAT' };
					parkingStatistics.forEach(function (entry) {
						entry.dayOfWeek = dayOfWeekMap[entry.dayOfWeek];
					});
					callback(null, parkingStatistics);
				}
			});
		},
	], function (err, results) {
		if (err) {
			return cb && cb(err);
		} else {
			input.parkingStatisticsByDayOfWeek = results;
			return cb && cb(null);
		}
	});
}

export function generateParkingStatisticsByHour(bean, req, res, cb) {
	console.log('[Generate Parking Statistics By Hour]');
	let {input, output} = bean;
	// * set startTime and endTime * //
	let startTime = moment(input.startDate).startOf('day').toDate();
	let endTime = moment(input.endDate).endOf('day').toDate();
	async.waterfall([
		function (callback) {
			// * create nodeIdToNameMap * //
			createNodeIdToNameMap(req.body.user.name === '仁寶管理員' ? {} : req.body.user, callback, input.tagId, input.nodeId);
		},
		function (nodeIdToNameMap, callback) {
			// * find parkingHistory(s) by nodeId and parkingDate* //
			let where = {
				'nodeId': { $in: Object.keys(nodeIdToNameMap) },
				'parkingDate': { $gte: startTime, $lte: endTime },
			};
			parkingHistoryModel.find(where)
			.select('nodeId parkingDate dailyParkingCounts dailyParkingTime parkingHistoryList')
			.exec(function (err, results) {
				if (err) {
					callback(err);
				} else if (!results || results.length == 0) {
					callback(new Error('parkingHistory(s) not found'));
				} else {
					var parkingStatistics = [];
					var hourToParkingCountMap = {}; // * key: hour, value: parkingCount * //
					var hourToParkingTimeInHourMap = {}; // * key: hour, value: parkingTimeInHour * //
					for (var hour = 0; hour <= 23; hour ++) {
						hourToParkingCountMap[hour] = 0;
						hourToParkingTimeInHourMap[hour] = 0.0;
					}
					results.forEach(function (entry, index) {
						let parkingDateStartMoment = moment(entry.parkingDate).startOf('day');
						let parkingDateEndMoment = moment(entry.parkingDate).endOf('day');
						if (entry.dailyParkingTime == 1440) {
							// * one whole-day parking record * //
							for (var hour = 0; hour <= 23; hour++) {
								hourToParkingCountMap[hour] += 1;
								hourToParkingTimeInHourMap[hour] += 1.0;
							}
						} else if (entry.dailyParkingTime > 0) {
							// * partial parking records * //
							entry.parkingHistoryList.forEach(function (record) {
								// * derive startParkingMoment and endParkingMoment * //
								var startParkingMoment = record.startParking ? moment(record.startParking) : parkingDateStartMoment;
								var endParkingMoment = record.endParking ? moment(record.endParking) : parkingDateEndMoment;
								for (var hour = startParkingMoment.hour(); hour <= endParkingMoment.hour(); hour++) {
									hourToParkingCountMap[hour] += 1;
									hourToParkingTimeInHourMap[hour] += 1.0;
								}
								// * deduct the proir period in the first hour * //
								if (record.startParking) {
									hourToParkingTimeInHourMap[startParkingMoment.hour()] -= (startParkingMoment.minute() + ( startParkingMoment.second() + startParkingMoment.millisecond() / 1000.0 ) / 60.0 ) / 60.0;
								}
								// * deduct the post period in the last hour * //
								if (record.endParking) {
									hourToParkingTimeInHourMap[endParkingMoment.hour()] -= 1.0 - (endParkingMoment.minute() + ( endParkingMoment.second() + endParkingMoment.millisecond() / 1000.0 ) / 60.0 ) / 60.0;
								}
							});
						}
					});
					Object.keys(hourToParkingCountMap).forEach(function (hour) {
						parkingStatistics.push({
							'hour': hour,
							'parkingCount': hourToParkingCountMap[hour],
							'parkingTime': hourToParkingTimeInHourMap[hour],
						});
					})
					callback(null, parkingStatistics);
				}
			});
		},
	], function (err, results) {
		if (err) {
			return cb && cb(err);
		} else {
			input.parkingStatisticsByHour = results;
			return cb && cb(null);
		}
	});
}

export function profileTag(bean, req, res, cb) {
	console.log('[profile Tag]');
	let {input, output} = bean;
	if (!input.tagId) {
		return cb && cb(null);
	}
	tagModel.findOne({ '_id': input.tagId })
	.exec(function (err, result) {
		if (err) {
			return cb && cb(err);
		} else if (!result) {
			console.log('tag not found');
			return cb && cb({ 'tag': 'not found' });
		} else {
			var tagDoc = JSON.parse(JSON.stringify(result));
			delete tagDoc.createTime;
			delete tagDoc.modifyTime;
			delete tagDoc.valid;
			console.log(tagDoc);
			input.tagDoc = tagDoc;
			return cb & cb(null);
		}
	});
}

function calculatDailyParkingTime_eachNodeId(req, cb) {
  console.log('calculatDailyParkingTime_eachNodeId');
  let yesterdayOverNightResult, parkingHistoryResult;
  let parkingHistoryData = {};
  parkingHistoryData.nodeId = req.nodeId;
  async.series({
    checkYesterdayOverNight: function(callback) {
      checkYesterdayOverNightData(req.nodeId, req.parkingDate, (err, result)=>{
			  if (err) {
			    return cb(err, null);
			  }else if (!result) {
			  	console.log('[checkYesterdayOverNightData] No overNight data');
    	    //return cb(null, 'No overNight data');
        }
        yesterdayOverNightResult = result;
        callback(null);
      });
    },
    getParkingTimeHistory: function(callback) {
		  getParkingTimeHistory(req.nodeId, req.parkingDate, 1, yesterdayOverNightResult, (err, results)=>{
		    if (err) {
		      return cb(err, null);
		    }else if (!results) {
		    	return cb(null, 'NodeIdNotFound');
		    }
		    parkingHistoryData.parkingDate = moment(req.parkingDate).toDate();
		    parkingHistoryData.parkingHistoryList = results;
		    if(!results.length){
				  if (yesterdayOverNightResult == 1) {  //Yesterday have overnight car.
	          parkingHistoryData.dailyParkingTime = 24*60;
	          parkingHistoryData.dailyParkingCounts = 1;
	          parkingHistoryData.haveOverNight = 1;
	        }else{
	          parkingHistoryData.dailyParkingTime = 0;
	          parkingHistoryData.dailyParkingCounts = 0;
	          parkingHistoryData.haveOverNight = 0;
	        }
		    }else{
		    	if(!results[results.length-1].endParking){ //today have overnight
		        parkingHistoryData.haveOverNight = 1;
		        parkingHistoryData.dailyParkingTime = sumParkingTime(results);
		        parkingHistoryData.dailyParkingCounts = sumParkingCounts(results);
		    	}else{
		    		parkingHistoryData.haveOverNight = 0;
		        parkingHistoryData.dailyParkingTime = sumParkingTime(results);
		        parkingHistoryData.dailyParkingCounts = sumParkingCounts(results);
		      }
		    }
		    parkingHistoryData.averageDailyParkingTime = (parkingHistoryData.dailyParkingTime/parkingHistoryData.dailyParkingCounts) || 0;
		    parkingHistoryData.dailyUsingRatio = parkingHistoryData.dailyParkingTime / (24*60);

		    //console.log('[calculatDailyParkingTime] parkingHistoryData', parkingHistoryData);
		    parkingHistoryResult = parkingHistoryData;
		    callback(null);
		  });
    }
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    }
    return cb(null, parkingHistoryResult);
  });

}

function saveParkingHistory_eachNodeId(reqUpdate, callback){
	reqUpdate.valid = true;
  parkingHistoryModel.update({'nodeId': reqUpdate.nodeId, "parkingDate": reqUpdate.parkingDate},
  reqUpdate, {upsert: true}, (err, result)=>{
    if(err){
    	return callback(null, err);
    }
    else if (!result) {
    	return callback(null, '新增失敗');
    }
    callback(null, result)
  });
}

function getParkingTimeHistory(nodeId, parkingDate, timeRange, haveOverNight, cb){
  console.log('getParkingTimeHistory');
  let deviceStatusResult, parkingHistoryResult, latestParking, approvedDeviceResult;
  let endTime, startTime;
  let parkingHistory = [];
  async.series({
    getDeviceStatusHistory: function(callback) {
      let where = {
        'valid': true,
        'nodeId': nodeId
      };
      if (parkingDate) {
				startTime = moment(parkingDate).startOf('day').toDate();
				endTime = moment(parkingDate).endOf('day').toDate();
        console.log('[getParkingStatus] startTime: ', startTime );
        console.log('[getParkingStatus] endTime: ', endTime );
        where['timestamp'] = {'$gte': startTime, '$lte': endTime};
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
          console.log('[getDeviceStatusHistory] No deviceStatusHistory, nodeId', nodeId );
        }
      	let yesterdayData;
        if(haveOverNight == 1){
          yesterdayData = {
          	'timestamp': moment(parkingDate).set('date', moment(parkingDate).get('date')-1).endOf('day').toDate(),
            'parkingDetect': "1"
          }
        }else{
        	yesterdayData = {
          	'timestamp': moment(parkingDate).set('date', moment(parkingDate).get('date')-1).endOf('day').toDate(),
            'parkingDetect': "0"
          }
        }
        deviceStatusResult = [];
        deviceStatusResult.push(yesterdayData);
        deviceStatusResult = deviceStatusResult.concat(results);
        callback(null)
      });
    },
    calculateParkingTime: function(callback) {
      let data;
      deviceStatusResult.forEach(function(element, i, array) {
        //console.log('[getParkingStatus] element: ', element );
        //console.log('[getParkingStatus] i: ', i );
        if (i>0 && deviceStatusResult[i-1].parkingDetect=="0" && element.parkingDetect=="1"){ //car in
          data = {
            'startParking': element.timestamp,
            'startParkMessageId': element.messageId
          }
          parkingHistory.push(data);
        }
        if (i>0 && deviceStatusResult[i-1].parkingDetect=="1" && element.parkingDetect=="0"){ // car out
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
      if (parkingHistory.length>0 && !lestData.endParking && lestData.startParking){
        parkingHistory[parkingHistory.length-1].timePeriod = minsTimeDifference(lestData.startParking, endTime);
      }

      let firstData = parkingHistory[0];
      if (parkingHistory.length>0 && !firstData.startParking && firstData.endParking){
        parkingHistory[0].timePeriod = minsTimeDifference( startTime, firstData.endParking);
      }
      parkingHistoryResult = parkingHistory;
      callback(null);
    },
  }, function(err, results) {
    if (err) {
      return cb(err, null);
    }
    return cb(null, parkingHistoryResult);
  });
}

function sumParkingTime(input){
	let sumTime = 0;
	input.forEach((elem) => {
    if(elem.timePeriod){
    	sumTime += elem.timePeriod;
    }
	});
  return sumTime;
}

function sumParkingCounts(input){
	let counts = 0;
	input.forEach((elem) => {
    if(elem.endParking || elem.startParking){
    	counts += 1;
    }
	});
  return counts;
}

function checkYesterdayOverNightData(nodeId, parkingDate, cb){
	let where = {
    //'valid': true,
    'nodeId': nodeId
  };
  let yesterday = moment(parkingDate).set('date', moment(parkingDate).get('date')-1);
	let	startTime = moment(yesterday).startOf('day').toDate();
	let	endTime = moment(yesterday).endOf('day').toDate();
  console.log('[checkYesterdayOverNightData] @@@@@@ startTime: ', startTime );
  console.log('[checkYesterdayOverNightData] @@@@@@ endTime: ', endTime );
  where['parkingDate'] = {'$gte': new Date(startTime), '$lt': new Date(endTime)};
  parkingHistoryModel.findOne(where)
  .select('-_id haveOverNight')
  .exec(function(err, result) {
    if (err){
      return cb(err, null);
    }
    if(!result){
      return cb(null, 0);
    }else{
      return cb(null, result.haveOverNight);
    }
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

function createNodeIdToNameMap (user, callback, tagId = undefined, nodeId = undefined) {
	// * find approvedDevice with filtering levelOneId and levelTwoId * //
	let where = { 'valid': true };
	if (user.levelOneId) {
		console.log('user.levelOneId: ' + user.levelOneId);
		where['levelOneId'] = user.levelOneId;
	}
	if (user.levelTwoId) {
		console.log('user.levelTwoId: ' + user.levelTwoId);
		where['levelTwoId'] = user.levelTwoId;
	}
	if (tagId) {
		console.log('tagId: ' + tagId);
		where['tagId'] = tagId;
	}
	if (nodeId) {
		console.log('nodeId: ' + nodeId);
		where['nodeId'] = nodeId;
	}
	approvedDeviceModel.find(where)
	.select('nodeId name')
	.exec(function (err, approvedDevices) {
		if (err) {
			callback(err);
		} else if (!approvedDevices || approvedDevices.length == 0) {
			callback(new Error('approvedDevices not found'));
		} else {
			let nodeIdToNameMap = {};
			approvedDevices.forEach(function (entry) {
				nodeIdToNameMap[entry.nodeId] = entry.name;
			});
			callback(null, nodeIdToNameMap);
		}
	});
}
