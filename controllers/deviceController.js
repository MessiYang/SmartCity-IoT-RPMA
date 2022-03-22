import BaseController, {util, _, i18next, async, config, path, moment, logger} from './base/baseController';
import DeviceBean from '../beans/deviceBean';
import DeviceType from '../models/type/DeviceType';
import {loginOutputData, authenticate, regenToken, regenRefreshToken, setTokenInCookie, verifyRefreshToken} from '../services/AccountService';
import {getCurrentStatus, getHistoryStatus, getRawMessages, getPayloadHistory, getParkingStatus, getLatestParkingTime, getGroupHistoryStatus, uploadDevices, getTagList} from '../services/DeviceService';

class Controller extends BaseController {
	getCurrentStatus(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getCurrentStatus');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.currentStatus));
			}
		});
	}

	getLightCurrentStatus(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getCurrentStatus');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		bean.input = {};
    bean.input.deviceType = DeviceType.SMARTLAMP.value;
    console.log('bean: ', bean);
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				let statusResult = bean.input.currentStatus;
				let reponse = [];
				for(let k in statusResult){
					let ele = {};
					if(statusResult[k].nodeId) ele.nodeId = statusResult[k].nodeId;
					if(statusResult[k].longitude) ele.longitude = statusResult[k].longitude;
					if(statusResult[k].latitude) ele.latitude = statusResult[k].latitude;
					if(statusResult[k].onOff) ele.onOff = statusResult[k].onOff;
					if(statusResult[k].pwm) ele.pwm = statusResult[k].pwm;					
					if(statusResult[k].humidity) ele.humidity = statusResult[k].humidity;
					if(statusResult[k].temperature) ele.temperature = statusResult[k].temperature;
					if(statusResult[k].lightValue) ele.lightValue = statusResult[k].lightValue;
					if(statusResult[k].powerLevel) ele.powerLevel = statusResult[k].powerLevel;
          reponse.push(ele);
				}
				return res.json(super.success(reponse));
			}
		});
	}

	getHistoryStatus(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getHistoryStatus');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(getHistoryStatus, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.historyStatus));
			}
		});
	}

	getRawMessages(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getRawMessages');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(getRawMessages, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.rawMessagesResult));
			}
		});
	}

	getPayloadHistory(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getPayloadHistory');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			//async.apply(getCurrentStatus, bean, req, res),
			async.apply(getPayloadHistory, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.payloadHistory));
			}
		});
	}

	getGroupHistoryStatus(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([

			async.apply(getGroupHistoryStatus, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.historyStatus));
			}
		});
	}
	getLatestParkingTime(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getLatestParkingTime');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getLatestParkingTime, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.historyStatus));
			}
		});
	}

	getParkingStatus(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, 'getParkingStatus');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getParkingStatus, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.historyStatus));
			}
		});
	}

	addDevices(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		bean.input.action = 'add';
		async.waterfall([
			async.apply(uploadDevices, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.message));
			}
		});
	}

	updateDevices(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		bean.input.action = 'update';
		async.waterfall([
			async.apply(uploadDevices, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.message));
			}
		});
	}

	getTagList(req, res, next) {
		let bean = new DeviceBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getTagList, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.tagList));
			}
		});
	}
}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/getCurrentStatus').post(ctr.getCurrentStatus);
	router.route('/getLightCurrentStatus').post(ctr.getLightCurrentStatus);
	router.route('/getHistoryStatus').post(ctr.getHistoryStatus);
	router.route('/getRawMessages').post(ctr.getRawMessages);
	router.route('/getPayloadHistory').post(ctr.getPayloadHistory);
	router.route('/getGroupHistoryStatus').post(ctr.getGroupHistoryStatus);
	router.route('/getLatestParkingTime').post(ctr.getLatestParkingTime);
	router.route('/getParkingStatus').post(ctr.getParkingStatus);
	router.route('/addDevices').post(ctr.addDevices);
	router.route('/updateDevices').post(ctr.updateDevices);
	router.route('/getTagList').post(ctr.getTagList);
};
