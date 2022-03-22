import BaseController, {util, _, i18next, async, config, path, moment, logger} from './base/baseController';
import UserParkingHistoryBean from '../beans/userParkingBean';
import { getParking, getLatestUserParkingHistory, syncUserParkingHistory, startParking, endParking} from '../services/UserParkingService';
import { setDeviceSta, rtParkingTime, setDeviceEndParkingTime} from '../utils/parkingUtil';
import { testAlyPushMsg} from '../utils/messageUtil';
import { testAlyPay} from '../utils/alipayUtil';
import { getCurrentStatus } from '../services/DeviceService';

class Controller extends BaseController {
	getParking(req, res, next) {
		let bean = new UserParkingHistoryBean();
		bean.bind(req, 'getParking');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getParking, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.parkingData));
			}
		});
	}

	getLatestUserParkingHistory(req, res, next) {
		console.log('getLatestUserParkingHistory');
		let bean = new UserParkingHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getLatestUserParkingHistory, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.latestResult));
			}
		});
	}

	syncUserParkingHistory(req, res, next) {
		let bean = new UserParkingHistoryBean();
		bean.bind(req, 'syncUserParkingHistory');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(syncUserParkingHistory, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.syncResult));
			}
		});
	}

	startParking(req, res, next) {
		let bean = new UserParkingHistoryBean();
		bean.bind(req, 'startParking');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(startParking, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.saveResult));
			}
		});
	}

	endParking(req, res, next) {
		let bean = new UserParkingHistoryBean();
		bean.bind(req, 'endParking');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(endParking, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.sumResult));
			}
		});
	}

	testSetDeviceParkingTime(req, res, next) {
		if (req.body.start){
			setDeviceStartParkingTime(req.body.nodeId, req.body.time, (err, results) => {
				if (err) {
					return res.json(err);
				} else {
					return res.json(results);
				}
		  });
		}else{
			setDeviceEndParkingTime(req.body.nodeId, req.body.time, (err, results) => {
				if (err) {
					return res.json(err);
				} else {
					return res.json(results);
				}
			});			
		}
	}

	testAlyPush(req, res, next) {
		let bean = new UserParkingHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(testAlyPushMsg, bean, req, res),
		
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.resResult));
			}
		});
	}

	testAlyPay(req, res, next) {
		let bean = new UserParkingHistoryBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(testAlyPay, bean, req, res),
		
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.resResult));
			}
		});
	}


}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/getParking').post(ctr.getParking);
	router.route('/getLatestUserParkingHistory').post(ctr.getLatestUserParkingHistory);
	router.route('/syncUserParkingHistory').post(ctr.syncUserParkingHistory);
	router.route('/startParking').post(ctr.startParking);
	router.route('/endParking').post(ctr.endParking);
	router.route('/testSetDeviceParkingTime').post(ctr.testSetDeviceParkingTime);
	router.route('/testAlyPush').post(ctr.testAlyPush);
	router.route('/testAlyPay').post(ctr.testAlyPay);
};
