import util from 'util';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import { calculatDailyStreetLightHistory } from '../../services/StreetLightService';


function streetLightHistoryJob() {
  baseJob.apply(this, arguments);
}

util.inherits(streetLightHistoryJob, baseJob);

let job = new streetLightHistoryJob('000001', 'streetLightHistoryJob', ()=>{
  logger.info('[Job] streetLightHistoryJob start ...');
  let bean = {input: {}};
  let req = {};
  let res = {};
	calculatDailyStreetLightHistory(bean, (err, results) => {
		if (err) {
			console.log('[Job streetLightHistoryJob ] err: ',err);
		} else {
			console.log('[Job  streetLightHistoryJob] results: ',bean.input.historyResults);
		}
	});
  logger.info('[Job] streetLightHistoryJob end ...');
});

module.exports = job;