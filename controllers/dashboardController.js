import BaseController, {util, i18next, async, config, path, moment, logger} from './base/baseController';
import ParkingDashboardBean from '../beans/dashboardBean';
import {getParkingUsageRate, getarkingIncomePerHour, getUserParkingSumData, getParkingGroupsList, getCustomerCounts, getCustomersIncreaseByMonth} from '../services/DashboardService';
import { getCurrentStatus } from '../services/DeviceService';
import DeviceType from '../models/type/DeviceType';
import { calculateStandardParkingCharge} from '../utils/parkingUtil';
import { getLightOverAllSumData, calculatDailyStreetLightHistory, getLightTodayPowerGroupList, getLightStatisticsByTime, getLightStatisticsByGroup} from '../services/StreetLightService';
import {uplinkPayloadDecode, coordTransformWGS2Baidu, GPSUplinkPayloadDecode, calculateRefValueRegression, downlinkResponseDecode, convertToBaiduCoordinate} from '../utils/decodeUtil';

class Controller extends BaseController {

	getUserParkingStatistics(req, res, next) {
		console.log('getUserParkingStatistics');
		let bean = new ParkingDashboardBean();
    req.body.deviceType = DeviceType.PARKINGSENSOR.value;
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getCurrentStatus, bean, req, res),
			//async.apply(getUserParkingStatistics, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				let approveNodeId = [];
				let parkingUsingCounts = 0;
			  if(bean.input.currentStatus && bean.input.currentStatus.length){
			    bean.input.currentStatus.forEach(function(element) {
			      approveNodeId.push(element.nodeId);
            if(element.parkingDetect == '1') parkingUsingCounts++;
			    });
			  }
			  //console.log('bean.input: ',bean.input);
			  bean.input.approveNodeId = approveNodeId;
			  bean.input.totalParkingCounts = approveNodeId.length;
			  bean.input.parkingUsingCounts = parkingUsingCounts;
				console.log('approveNodeId: ',approveNodeId);
        async.parallel([
          async.apply(getUserParkingSumData, bean, req),
          //async.apply(getarkingIncomePerHour, bean, req),
           async.apply(getParkingUsageRate, bean, req),   
          // async.apply(getCustomerCounts, bean, req),    
          // async.apply(getCustomersIncreaseByMonth, bean, req), 
          // async.apply(getParkingGroupsList, bean, req),  
        ],(err, result)=>{
          if (err) {
            return res.json(super.fail(err));
          } else {
          	let data = {}
          	if (bean.input.sumData) data = bean.input.sumData;
          	if (bean.input.incomePerHourData) data.incomePerHourData = bean.input.incomePerHourData;
          	if (bean.input.usageRate) data.usageRate = bean.input.usageRate;
          	if (bean.input.customerCountsData) data.userCounts = bean.input.customerCountsData.userCounts;
          	if (bean.input.customersIncreaseData) data.userIncreaseData = bean.input.customersIncreaseData;
          	if (bean.input.parkingGroupsList) data.parkingGroupsList = bean.input.parkingGroupsList;
            data.totalParkingCounts = bean.input.totalParkingCounts;
            data.parkingUsingCounts = bean.input.parkingUsingCounts;
            
            return res.json(super.success(data));
          }
        });
			}
		});
	}

	getLightOverAllSumData(req, res, next) {
		let bean = new ParkingDashboardBean();
		req.body.deviceType = DeviceType.SMARTLAMP.value;
		req.body.isNoSave = true;
    req.body.statisticsDate = moment(new Date()).format("YYYY-MM-DD");
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.parallel([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(calculatDailyStreetLightHistory, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				async.parallel([
					async.apply(getLightOverAllSumData, bean, req),
					async.apply(getLightTodayPowerGroupList, bean, req),
				], (err, results) => {
					if (err) {
						return res.json(super.fail(err));
					} else {
						return res.json(super.success(bean.input.response));
					}
				});
			}
		});
	}
	getLightStatisticsByTime(req, res, next) {
		let bean = new ParkingDashboardBean();
		req.body.deviceType = DeviceType.SMARTLAMP.value;
		req.body.isNoSave = true;
    req.body.statisticsDate = moment(new Date()).format("YYYY-MM-DD");
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.parallel([
			async.apply(getCurrentStatus, bean, req, res),
			async.apply(calculatDailyStreetLightHistory, bean),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			}else{
				async.waterfall([
					async.apply(getLightStatisticsByTime, bean, req),
				], (err, results) => {
					if (err) {
						return res.json(super.fail(err));
					} else {
						return res.json(super.success(bean.input.response));
					}
				});
			}
		});
	}
	getLightStatisticsByGroup(req, res, next) {
		let bean = new ParkingDashboardBean();
		bean.bind(req, null);
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
		async.waterfall([
			async.apply(getLightStatisticsByGroup, bean, req),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
				return res.json(super.success(bean.input.response));
			}
		});
	}

	test(req, res, next) {
//uplinkPayloadDecode(nodeId, payload, powerLevelFactor, cb)
    // let event06 = "4D0200"+"180619FF113501FF00"+"1806196B111601FF01"+"1806197F112401FF02"+"1806197F112501FF03"+
				// "000000000000000004"+"1806157F155501FF05"+"1806197F094201FF06"+"180900200C00000007"+"061E";
		let data = {
			"temperature" : 27,
      "xValue" : -727,
      "yValue" : 611,
      "zValue" : -494,
		}
		//console.log('req.body.nodeId: ',req.body.nodeId);
		async.waterfall([
			async.apply(uplinkPayloadDecode,"0x00072c27","1002F301DE0B1201DB00000A00FF6803",1
				//calculateRefValueRegression, req.body.nodeId//approvedDeviceId, chargeType, startTime, endTime, 
//'5a28f2ff563fcfd72c8dc250','2018-08-05T09:15:00.000Z','2018-08-05T10:15:00.001Z'
				//'0x00082743', "0D0201000001020001000E0003", "2018-08-06T08:56:20.617Z"
				//118.090215 , 24.477640
				//"00000000000000000000000DA90D010302FFFF5E40",
				//"10372E01E0A5B2072DF1370AF40D010302FFFFF3F4",
			 //"2018-08-06T08:56:20.617Z"
				),		
			// async.apply(coordTransformWGS2Baidu,
			// 	118.090215 , 24.477640
			// 	),
		], (err, results) => {
			if (err) {
				return res.json();
			} else {
				return res.json(super.success());
			}
		});
	}

}

module.exports = function(router) {
	let ctr = new Controller();
  router.route('/getUserParkingStatistics').post(ctr.getUserParkingStatistics);
  router.route('/getLightOverAllSumData').post(ctr.getLightOverAllSumData);
  router.route('/getLightStatisticsByTime').post(ctr.getLightStatisticsByTime);
  router.route('/getLightStatisticsByGroup').post(ctr.getLightStatisticsByGroup);
  router.route('/test').post(ctr.test);
  
};
