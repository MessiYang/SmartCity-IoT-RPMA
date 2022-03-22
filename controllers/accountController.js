import BaseController, {util, _, i18next, async, config, path, moment, logger} from './base/baseController';
import AccountBean from '../beans/accountBean';
import {loginOutputData, authenticate, regenToken, regenRefreshToken, setTokenInCookie, verifyRefreshToken} from '../services/AccountService';

class Controller extends BaseController {

	login(req, res, next) {
		let bean = new AccountBean();
		bean.bind(req, 'login');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(authenticate, bean),
			async.apply(regenToken, bean, req),
			async.apply(regenRefreshToken, bean, req),
			async.apply(setTokenInCookie, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(loginOutputData(req)));
			}
		});
	}

	auth(req, res, next) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(setTokenInCookie, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(loginOutputData(req)));
			}
		});
	}

	refreshToken(req, res, next) {
		let bean = new AccountBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(verifyRefreshToken, bean, req, res),
			async.apply(authenticate, bean),
			async.apply(regenToken, bean, req),
			async.apply(setTokenInCookie, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(loginOutputData(req)));
			}
		});
	}
}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/login').post(ctr.login);
	router.route('/auth').post(ctr.auth);
	router.route('/refreshToken').post(ctr.refreshToken);

};
