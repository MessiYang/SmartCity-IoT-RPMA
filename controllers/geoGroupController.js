import BaseController, { util, i18next, async, config, logger, } from './base/baseController';
import GeoGroupBean from '../beans/geoGroupBean';
import {send, downStreamMessage, payloadDecode, getCurrentDevicePayload, getDeviceHistory, testResponseTime, calculateDailyPacketStatistics, downloadPacketStatistics } from '../services/DeviceHistoryService';
import { getTimeZone, getCounty, getDistrict, getVillage, createVillage, updateVillage, getGeoTag, createGeoTag, updateGeoTag, setDevicesGroup} from '../services/GeoGroupService';
class Controller extends BaseController {
	getTimeZone(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getTimeZone, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}

	getCounty(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCounty, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}

	getDistrict(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getDistrict, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}

	getVillage(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getVillage, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}
	createVillage(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createVillage, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}
	updateVillage(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateVillage, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}

	getGeoTag(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getGeoTag, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}
	createGeoTag(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(createGeoTag, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}
	updateGeoTag(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(updateGeoTag, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}

	setDevicesGroup(req, res, next) {
		let bean = new GeoGroupBean();
		bean.bind(req, 'setDevicesGroup');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(setDevicesGroup, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.results));
			}
		});
	}
}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/getTimeZone').post(ctr.getTimeZone);

	router.route('/getCounty').post(ctr.getCounty);
  router.route('/getDistrict').post(ctr.getDistrict);

  router.route('/getVillage').post(ctr.getVillage);
  router.route('/createVillage').post(ctr.createVillage);
  router.route('/updateVillage').post(ctr.updateVillage);

  router.route('/getGeoTag').post(ctr.getGeoTag);
  router.route('/createGeoTag').post(ctr.createGeoTag);
  router.route('/updateGeoTag').post(ctr.updateGeoTag);  

  router.route('/setDevicesGroup').post(ctr.setDevicesGroup);  
};
