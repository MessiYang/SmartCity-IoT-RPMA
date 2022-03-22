import BaseController, {util, _, i18next, async, config, path, moment, logger} from './base/baseController';
import ParkingBean from '../beans/parkingBean';
import {getCurrentStatus} from '../services/DeviceService';
import {updateRefValue, reCalculateParkingStatus} from '../services/ParkingService';

class Controller extends BaseController {

	updateRefValue(req, res, next) {
		let bean = new ParkingBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			//async.apply(getCurrentStatus, bean, req, res),
			async.apply(updateRefValue, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.updateResult));
			}
		});
	}

	reCalculateParkingStatus(req, res, next) {
		let bean = new ParkingBean();
		bean.bind(req, 'reCalculateParkingStatus');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(reCalculateParkingStatus, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.updateResult));
			}
		});
	}


}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/updateRefValue').post(ctr.updateRefValue);
	router.route('/reCalculateParkingStatus').post(ctr.reCalculateParkingStatus);
};
