import schedule from 'node-schedule';
import logger from '../config/log';

let createJob = function(corn, job) {
  let j = schedule.scheduleJob(job.name, corn, ()=>{
    logger.info('[SCHEDULE] ' + job.name + ' start');
    job.func();
    logger.info('[SCHEDULE] ' + job.name + ' end');
  });
  logger.info('[SCHEDULE] Job[' + job.name + '] created');
};

let getJobs = function() {
  return schedule.scheduledJobs;
}

module.exports.create = createJob;
module.exports.getAll = getJobs;
