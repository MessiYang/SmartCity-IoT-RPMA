let router = require('express')();
import logger from '../../config/log';
import config from 'nconf';
import async from 'async';
import {getTokenAndVerify} from '../../services/AccountService';
import errorMsg from '../../models/type/mongooseErrorCode';
const target = config.get('EXECUTE_TARGET');
const {DEPLOY_PREFIX} = config.get(target);

router.use((req, res, next) => {
	req.requestTime = Date.now();
	// logger.info('[REQUEST] path: ', req.path);
	// logger.info('[REQUEST] url: ', req.url);
	// logger.info('[REQUEST] query: ', JSON.stringify(req.query));
	// logger.info('[REQUEST] body: ', JSON.stringify(req.body));
	if (req.method === 'GET') {
		return next();
	}
	if (['/account/login',
			 '/account/refreshToken',
			 '/deviceHistory/testResponseTime',
			 '/deviceHistory/testDownStreamMessage',
			 '/deviceHistory/testCalculatDailyParkingTime',
			 '/deviceHistory/testCalculatDailyStreetLightHistory',
			 '/userParking/testAlyPush',
			 '/userParking/testAlyPay',
			 '/alipay/notifyCallback',
		].includes(req.path)) {
		return next();
	}
	getTokenAndVerify(req, res, (err, data) => {
		if (err || !req.body.user) {
			switch(err.name) {
				default:
					err.name = 'Authenticate';
				case 'TokenExpiredError':
				case 'JsonWebTokenError':
					let e = errorMsg(err);
					let response = {
						success: false,
						data: {},
						errors: e[0],
						code: e[1],
					};
					return res.status(400).send(response);
			}
		} else {
			return next();
		}
	});
});

module.exports = router;
