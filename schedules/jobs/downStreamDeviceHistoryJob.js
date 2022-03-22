import util from 'util';
import async from 'async';
import config from 'nconf';
import baseJob from './base/baseJob';
import logger from '../../config/log';
import scheduleJobModel from '../../models/scheduleJobModel';
import { downStreamMessage, checkDeviceOnlineStatus} from '../../services/DeviceHistoryService';
import { checkIsJobRunning, jobIsComplete, jobIsRunning, minsTimeDifference } from '../../utils/scheduleUtil';

const LOCKJOB_MAXTIME_MINS = 5;
const target = config.get('EXECUTE_TARGET');
const {MESSAGE_HOST, MESSAGE_USERNAME, MESSAGE_PASSWORD,
       MESSAGE_HOST_2, MESSAGE_USERNAME_2, MESSAGE_PASSWORD_2,
       MESSAGE_HOST_3, MESSAGE_USERNAME_3, MESSAGE_PASSWORD_3,} = config.get(target);
function downStreamDeviceHistoryJob() {
  baseJob.apply(this, arguments);
}

util.inherits(downStreamDeviceHistoryJob, baseJob);

let job = new downStreamDeviceHistoryJob('000001', 'downStreamDeviceHistoryJob', ()=>{
	 async.series({
    checkIsJobRunning: function(callback) {
    	checkIsJobRunning("downStreamDeviceHistoryJob", (err, result)=>{
        if (err) return logger.info('[checkIsJobRunning] err:', err);
        if (result.isJobRunning == "1"){
        	let timePeriod = minsTimeDifference(new Date(), result.latestJobStartTime);
          logger.info('[checkIsJobRunning] timePeriod:', timePeriod);
          if (timePeriod<LOCKJOB_MAXTIME_MINS){
	        	logger.info('[checkIsJobRunning] downStreamMessage is running !!!!!!!!!!!!!!!');
	        	return;
          } 
        }
        callback();
    	});
    },
    doJob: function(callback) {
    	let req = {
        'MESSAGE_HOST': MESSAGE_HOST,
        'MESSAGE_USERNAME': MESSAGE_USERNAME,
        'MESSAGE_PASSWORD': MESSAGE_PASSWORD
      };
    	logger.info('[Job1] downStreamDeviceHistoryJob start ...');
      jobIsRunning("downStreamDeviceHistoryJob", (err, result)=>{});
		 	downStreamMessage(req, (err, results) => {
				if (err) console.log('[Job1] err: ',err);
	      callback();
			});
    },
    doJob_2: function(callback) {
      if (!MESSAGE_HOST_2) return callback();
      logger.info('[downStreamMessage] =============== doJob_2 ================');
      let req = {
        'MESSAGE_HOST': MESSAGE_HOST_2,
        'MESSAGE_USERNAME': MESSAGE_USERNAME_2,
        'MESSAGE_PASSWORD': MESSAGE_PASSWORD_2
      };
      jobIsRunning("downStreamDeviceHistoryJob", (err, result)=>{});
      downStreamMessage(req, (err, results) => {
        if (err) console.log('[Job1] err: ',err);
        callback();  
      });
    },
    doJob_3: function(callback) {
      if (!MESSAGE_HOST_3) return callback();
      logger.info('[downStreamMessage] =============== doJob_3 ================');
      let req = {
        'MESSAGE_HOST': MESSAGE_HOST_3,
        'MESSAGE_USERNAME': MESSAGE_USERNAME_3,
        'MESSAGE_PASSWORD': MESSAGE_PASSWORD_3
      };
      jobIsRunning("downStreamDeviceHistoryJob", (err, result)=>{});
      downStreamMessage(req, (err, results) => {
        if (err) console.log('[Job1] err: ',err);
        callback();  
      });
    },
    jobIsComplete: function(callback) {      
      jobIsComplete("downStreamDeviceHistoryJob", (error, result)=>{
        if (error) return logger.info('[jobIsRunning] error:', error);
        logger.info('[downStreamMessage] ===============END================');
        callback();
      });       
    },
  }, function(err, results) {
    if (err) {
      logger.info('[downStreamDeviceHistoryJob] err:', err);
    } 
    logger.info('[Job1] downStreamDeviceHistoryJob end ...');
  });
});

module.exports = job;