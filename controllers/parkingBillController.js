import BaseController, {util, _, i18next, async, config, path, moment, logger} from './base/baseController';
import ParkingBillBean from '../beans/parkingBillBean';
import {createFeeStandard, setFeeStandard, list, profile, update, invalid} from '../services/ParkingBillService';

class Controller extends BaseController {

	createFeeStandard(req, res, next) {
		let bean = new ParkingBillBean();
		bean.bind(req, 'createFeeStandard');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createFeeStandard, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.parkingFeeStandard));
			}
		});
	}

	setFeeStandard(req, res, next) {
		let bean = new ParkingBillBean();
		bean.bind(req, 'setFeeStandard');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(setFeeStandard, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.data));
			}
		});
	}

	list(req, res, next) {
		let bean = new ParkingBillBean();
		bean.bind(req, 'profile');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(list, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.data));
			}
		});
	}

	profile(req, res, next) {
		let bean = new ParkingBillBean();
		bean.bind(req, 'profile');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(profile, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.data));
			}
		});
	}

	update(req, res, next) {
		let bean = new ParkingBillBean();
		bean.bind(req, 'update');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(update, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.data));
			}
		});
	}

	invalid(req, res, next) {
		let bean = new ParkingBillBean();
		bean.bind(req, 'invalid');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(invalid, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.data));
			}
		});
	}
	
}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/createFeeStandard').post(ctr.createFeeStandard);
	router.route('/setFeeStandard').post(ctr.setFeeStandard);
	router.route('/list').post(ctr.list);
  router.route('/profile').post(ctr.profile);
  router.route('/update').post(ctr.update);
  router.route('/invalid').post(ctr.invalid);
};
