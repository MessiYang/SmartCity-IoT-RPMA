import util from 'util';
import baseJob from './base/baseJob';
import logger from '../../config/log';

function CheckNotifyStatusJob() {
  baseJob.apply(this, arguments);
}

util.inherits(CheckNotifyStatusJob, baseJob);

let job = new CheckNotifyStatusJob('000001', 'checkNotifyStatusJob', ()=>{
    logger.info('[Job] job start ...');
    logger.info('[Job] job end ...');
});

module.exports = job;
