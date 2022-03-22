import util from 'util';
import async from 'async';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import scheduleJobModel from '../../models/scheduleJobModel';
import { payloadDecode } from '../../services/DeviceHistoryService';
import {checkIsJobRunning, jobIsComplete, jobIsRunning, minsTimeDifference } from '../../utils/scheduleUtil';

const LOCKJOB_MAXTIME_MINS = 5;

function PayloadDecodeJob() {
  baseJob.apply(this, arguments);
}

util.inherits(PayloadDecodeJob, baseJob);

let job = new PayloadDecodeJob('000001', 'payloadDecodeJob', ()=>{
   logger.info('[payloadDecodeJob] job start ...');
   async.series({
    checkIsJobRunning: function(callback) {
      checkIsJobRunning("payloadDecodeJob", (err, result)=>{
        if (err) return logger.info('[checkIsJobRunning] err:', err);
        if (result.isJobRunning == "1"){
          let timePeriod = minsTimeDifference(new Date(), result.latestJobStartTime);
          logger.info('[checkIsJobRunning] timePeriod:', timePeriod);
          if (timePeriod<LOCKJOB_MAXTIME_MINS){
            logger.info('[checkIsJobRunning] payloadDecodeJob is running !!!!!!!!!!!!!!!');
            return;
          } 
        }
        callback();
      });
    },
    doJob: function(callback) {
    	let req = {};
    	logger.info('[Job1] payloadDecodeJob start ...');
      jobIsRunning("payloadDecodeJob", (err, result)=>{});
		 	payloadDecode(req, (err, results) => {
				if (err) console.log('[Job1] err: ',err);
				//console.log('[Job1] results: ',results);				
	 			jobIsComplete("payloadDecodeJob", (error, result)=>{
	        if (err) return logger.info('[jobIsRunning] error:', error);
	        logger.info('[payloadDecodeJob] ---------------END-----------------');
	        callback();
	    	});				
			});
    }
  }, function(err, results) {
    if (err) {
      logger.info('[downStreamDeviceHistoryJob] err:', err);
    } 
    logger.info('[payloadDecodeJob] downStreamDeviceHistoryJob end ...');
  });
  logger.info('[payloadDecodeJob] job end ...');
});

module.exports = job;
