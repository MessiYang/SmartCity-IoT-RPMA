let router = require('express')();
import logger from '../../config/log';
import config from 'nconf';
import { employee, customer, userRoleValue } from '../../models/type/RoleType';
import UserType from '../../models/type/UserType';
const ADM = employee.ADM.value; ////Administrator
const SI  = employee.SI.value; //System Integrator
const ORG = employee.ORG.value; //Organization Manager
const APP = employee.APP.value; //Application Manager
const CU  = customer.CUSTOMER.value; //客戶

const rules = {

	//account
	'/account/login': (~0),
	'/account/auth': (~0),
	'/account/refreshToken': (~0),

	//device (for test)
	'/device/getCurrentStatus': (~0),
	'/device/getLightCurrentStatus': (~0),
	'/device/getHistoryStatus': (~0),
	'/device/getPayloadHistory': (~0),
	'/device/getGroupHistoryStatus': (~0),
	'/device/getLatestParkingTime': (~0),
	'/device/getParkingStatus': (~0),
	'/device/addDevices': (~0),
	'/device/updateDevices': (~0),
	'/device/send': (~0),
	'/device/getTagList': (~0),
	'/device/getRawMessages': (~0),

  '/deviceHistory/multiSend': (~0),
  '/deviceHistory/send': (~0),
	'/deviceHistory/testDownStreamMessage': (~0),
	'/deviceHistory/getCurrentDevicePayload': (~0),
	'/deviceHistory/getDeviceHistory': (~0),
	'/deviceHistory/testResponseTime': (~0),
	'/deviceHistory/testCalculatDailyParkingTime': (~0),
	'/deviceHistory/downloadParkingSummary': (~0),
	'/deviceHistory/downloadParkingDetails': (~0),
	'/deviceHistory/testCalculateDailyPacketStatistics': (~0),
	'/deviceHistory/testCalculatDailyStreetLightHistory': (~0),
	'/deviceHistory/downloadPacketStatistics': (~0),
	'/deviceHistory/downloadStreetLightHistory': (~0),
	'/deviceHistory/downloadTrackerGPX': (~0),

	'/parking/updateRefValue': (~0),
	'/parking/reCalculateParkingStatus': (~0),

	'/parkingBill/createFeeStandard': (ADM|SI),
	'/parkingBill/setFeeStandard': (ADM|SI),
	'/parkingBill/list': (~0),
	'/parkingBill/profile': (~0),
	'/parkingBill/update': (ADM|SI),
	'/parkingBill/invalid': (ADM|SI),

	'/alipay/notifyCallback': (~0),
  '/alipay/getAppPayParams': (~0),
  '/alipay/checkSign': (~0),
  
	'/userParking/getParking': (~0),
	'/userParking/getLatestUserParkingHistory': (~0),
	'/userParking/syncUserParkingHistory': (~0),
	'/userParking/startParking': (~0),
	'/userParking/endParking': (~0),
	'/userParking/testSetDeviceParkingTime': (~0),
	'/userParking/testAlyPush': (~0),
	'/userParking/testAlyPay': (~0),

	'/report/downloadExcel': (~0),
	'/report/downloadPdf': (~0),
	'/report/downloadGpx': (~0),
	'/report/generateParkingChartPdf': (~0),
	'/report/generateSingleDeviceParkingChartPdf': (~0),

  '/dashboard/getUserParkingStatistics': (~0),
  '/dashboard/getLightOverAllSumData': (~0),
  '/dashboard/getLightStatisticsByTime': (~0),
  '/dashboard/getLightStatisticsByGroup': (~0),
  '/dashboard/test': (~0),
  
  '/geoGroup/getTimeZone': (~0),
  '/geoGroup/getCounty': (~0),
  '/geoGroup/getDistrict': (~0),
  '/geoGroup/getVillage': (~0),
  '/geoGroup/createVillage': (~0),
  '/geoGroup/updateVillage': (~0),
  '/geoGroup/getGeoTag': (~0),  
  '/geoGroup/createGeoTag': (~0),
  '/geoGroup/updateGeoTag': (~0),   
  '/geoGroup/setDevicesGroup': (~0),   
};

router.use((req, res, next) => {
	res.removeHeader("x-powered-by");

	let usersession = req.body.user;
	if (['/account/login',
			 '/account/refreshToken',
		].includes(req.path) || rules[req.path]===(~0)) {
		return next();
	}
	if (req.method === 'POST') {
		let rule = rules[req.path];
		let roleValue = userRoleValue(usersession.role);
		logger.info('req.body.user: ', req.body.user);
		logger.info('rule: ', rule);
		if (!rule) {
			logger.info(`[Auth]${req.path}=${rule}`);
		}
		if ((rule&roleValue) === 0) {
			return res.status(403).json('permission denied');
		}
	}

	return next();
});

module.exports = router;
