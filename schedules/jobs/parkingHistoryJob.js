import util from 'util';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import { calculatDailyParkingTime } from '../../services/ParkingService';


function parkingHistoryJob() {
  baseJob.apply(this, arguments);
}

util.inherits(parkingHistoryJob, baseJob);

let job = new parkingHistoryJob('000001', 'parkingHistoryJob', ()=>{
  logger.info('[Job] parkingHistoryJob start ...');
  let bean = {input: {}};
  let req = {};
  let res = {};
	calculatDailyParkingTime(bean, req, res, (err, results) => {
		if (err) {
			console.log('[Job parkingHistoryJob ] err: ',err);
		} else {
			console.log('[Job  parkingHistoryJob] results: ',bean.input.parkingResults);
		}
	});
  logger.info('[Job] parkingHistoryJob end ...');
});

module.exports = job;