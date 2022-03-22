import util from 'util';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import { calculateDailyPacketStatistics } from '../../services/DeviceHistoryService';


function parkingHistoryJob() {
  baseJob.apply(this, arguments);
}

util.inherits(parkingHistoryJob, baseJob);

let job = new parkingHistoryJob('000001', 'packetStatisticsJob', ()=>{
  logger.info('[Job] packetStatisticsJob start ...');
  let bean = { input: {} };
  let req = {};
  let res = {};
	calculateDailyPacketStatistics(bean, req, res, (err, results) => {
		if (err) {
			console.log('[Job packetStatisticsJob] err: ',err);
		} else {
			console.log('[Job  packetStatisticsJob] results: ', bean.input.packetStatisticsList);
		}
	});
  logger.info('[Job packetStatisticsJob] end ...');
});

module.exports = job;
