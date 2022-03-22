import BaseController, { util, i18next, async, config, logger, } from './base/baseController';
import DeviceHistoryBean from '../beans/deviceHistoryBean';
import DeviceType from '../models/type/DeviceType';
import {multiSend, send, downStreamMessage, payloadDecode, getCurrentDevicePayload, getDeviceHistory, testResponseTime, calculateDailyPacketStatistics, downloadPacketStatistics } from '../services/DeviceHistoryService';
import { calculatDailyParkingTime, downloadParkingSummary, downloadParkingDetails } from '../services/ParkingService';
import { calculatDailyStreetLightHistory, downloadStreetLightHistory } from '../services/StreetLightService';
import { getCurrentStatus } from '../services/DeviceService';
import { downloadTrackerGPX } from '../services/TrackerService';

class Controller extends BaseController {
	multiSend(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(multiSend, bean, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success({results}));
			}
		});
	}
	send(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'send');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(send, bean, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success({results}));
			}
		});
	}

	testDownStreamMessage(req, res, next) {
    console.log('req.body: ',req.body);
    if(req.body.code == "1"){
	    downStreamMessage(req, (err, results) => {
				if (err) {
					console.log('[testDownStreamMessage] err: ',err);
					return res.json(super.fail(err));
				} else {
					console.log('[testDownStreamMessage] results: ',results);
					return res.json(super.success(results));
					//return res.json(super.success(JSON.parse(results)));
				}
			});
    }else if(req.body.code == "2"){
      payloadDecode(req, (err, results) => {
				if (err) {
					console.log('[testDownStreamMessage] err: ',err);
					return res.json(super.fail(err));
				} else {
					console.log('[testDownStreamMessage] results: ',results);
					return res.json(super.success(results));
					//return res.json(super.success(JSON.parse(results)));
				}
			});
    }else{
    	return res.json("request err");
    }
	}

	getCurrentDevicePayload(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'getCurrentDevicePayload');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCurrentDevicePayload, bean, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(results));
			}
		});
	}

	getDeviceHistory(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'getDeviceHistory');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getDeviceHistory, bean, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(results));
			}
		});
	}

	testResponseTime(req, res, next) {
		req.body =  {
	    "nodeId" : "0x000801d8",
	    "startDate": "2017-12-07",
	    "endDate" : "2017-12-19"
    };
		let bean = new DeviceHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(testResponseTime, bean, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
        let response = {
					'datacounts': results.length,
				  'content': results
				}
			  return res.json(super.success(response));
			}
		});
	}

	testCalculatDailyParkingTime(req, res, next) {

		let bean = new DeviceHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(calculatDailyParkingTime, bean, req, res),
		], (err, results) => {
		  if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.parkingResults));
			}
		});
	}

	downloadParkingSummary(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		async.waterfall([
			async.apply(downloadParkingSummary, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.url) {
					return res.json(super.success({ 'excelUrl': input.url }));
				} else {
					return res.json(super.fail(new Error('no file generated')));
				}
			}
		});
	}

	downloadParkingDetails(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'downloadParkingDetails');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		async.waterfall([
			async.apply(downloadParkingDetails, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.url) {
					return res.json(super.success({ 'excelUrl': input.url }));
				} else {
					return res.json(super.fail(new Error('no file generated')));
				}
			}
		});
	}

	testCalculateDailyPacketStatistics(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		async.waterfall([
			async.apply(calculateDailyPacketStatistics, bean, req, res),
		], (err, results) => {
		  if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.packetStatisticsList) {
					return res.json(super.success(input.packetStatisticsList));
				} else {
					return res.json(super.success({}));
				}
			}
		});
	}
	testCalculatDailyStreetLightHistory(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		async.waterfall([
			async.apply(calculatDailyStreetLightHistory, bean),
		], (err, results) => {
		  if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.historyResults) {
					return res.json(super.success(input.historyResults));
				} else {
					return res.json(super.success({}));
				}
			}
		});
	}

	downloadPacketStatistics(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'downloadPacketStatistics');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		async.waterfall([
			async.apply(downloadPacketStatistics, bean, req, res),
		], (err, results) => {
		  if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.url) {
					return res.json(super.success({ 'excelUrl': input.url }));
				} else {
					return res.json(super.fail(new Error('no file generated')));
				}
			}
		});
	}

	downloadStreetLightHistory(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'downloadStreetLightHistory');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		input.deviceType = DeviceType.SMARTLAMP.value
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(downloadStreetLightHistory, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.avgDataURL) {
					return res.json(super.success({
					  'avgData_excelURL': input.avgDataURL, 
            'controlList_excelURL': input.controlListURL
				  }));
				} else {
					return res.json(super.fail(new Error('no file generated')));
				}
			}
		});
	}

	downloadTrackerGPX(req, res, next) {
		let bean = new DeviceHistoryBean();
		bean.bind(req, 'downloadTrackerGPX');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		let {input, output} = bean;
		input.deviceType = DeviceType.TRACKER.value
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(downloadTrackerGPX, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				if (input.gpxURL) {
					return res.json(super.success({
					  'gpxURL': input.gpxURL, 
				  }));
				} else {
					return res.json(super.fail(new Error('no file generated')));
				}
			}
		});
	}
}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/multiSend').post(ctr.multiSend);
	router.route('/send').post(ctr.send);
	router.route('/testDownStreamMessage').post(ctr.testDownStreamMessage);
	router.route('/getCurrentDevicePayload').post(ctr.getCurrentDevicePayload);
	router.route('/getDeviceHistory').post(ctr.getDeviceHistory);
	router.route('/testResponseTime').post(ctr.testResponseTime);
	router.route('/testCalculatDailyParkingTime').post(ctr.testCalculatDailyParkingTime);
	router.route('/downloadParkingSummary').post(ctr.downloadParkingSummary);
	router.route('/downloadParkingDetails').post(ctr.downloadParkingDetails);
	router.route('/testCalculateDailyPacketStatistics').post(ctr.testCalculateDailyPacketStatistics);
	router.route('/testCalculatDailyStreetLightHistory').post(ctr.testCalculatDailyStreetLightHistory);
	router.route('/downloadPacketStatistics').post(ctr.downloadPacketStatistics);
  router.route('/downloadStreetLightHistory').post(ctr.downloadStreetLightHistory);
	router.route('/downloadTrackerGPX').post(ctr.downloadTrackerGPX);
};
