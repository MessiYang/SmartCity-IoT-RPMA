import BaseController, {util, _, i18next, async, config, path, moment, logger} from './base/baseController';
import AlipayBean from '../beans/alipayBean';
import {getAppPayParams, checkSign, notifyCallback} from '../services/AlipayService';

class Controller extends BaseController {

	getAppPayParams(req, res, next) {
		let bean = new AlipayBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getAppPayParams, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.appPayParams));
			}
		});
	}

	checkSign(req, res, next) {
		let bean = new AlipayBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(checkSign, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.checkResult));
			}
		});
	}

	notifyCallback(req, res, next) {
		// let bean = new ParkingBillBean();
		// bean.bind(req, 'createFeeStandard');
		// if (bean.hasError()) {
		// 	return res.json(super.fail(bean.errors));
		// }
		async.waterfall([
			async.apply(notifyCallback, req.body),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json('success');
			}
		});
	}
	
}

module.exports = function(router) {
	let ctr = new Controller();
  router.route('/getAppPayParams').post(ctr.getAppPayParams);	
  router.route('/checkSign').post(ctr.checkSign);	
	router.route('/notifyCallback').post(ctr.notifyCallback);
};