'use strict';

// react server side rendering setting
require('babel-core/register')({presets: ['es2015', 'stage-0']});

const async = require('async');
const nconf = require('nconf');
const logger = require('./config/log');
const INITIALIZER_PATH = './config/initializers';

// Set up configs
nconf.use('memory');
// First load command line arguments
nconf.argv();
// Load environment variables
nconf.env();
// Load config file for the environment
nconf.file({ file: './config/applicationConf.json' });
// Load the parameters from command line
process.argv.find((t) => {
	if (t.indexOf('--%')==0) {
		let default_config = t.substring(3);
		if (default_config) {
			nconf.set('EXECUTE_TARGET', default_config.toUpperCase());
		}
	}
});

let target = nconf.get('EXECUTE_TARGET');
logger.info('[APP] Starting server initialization:', target, nconf.get(target));

async.series([
  function(callback) {
    require(`${INITIALIZER_PATH}/database`)(callback);
  },
  function(callback) {
    require(`${INITIALIZER_PATH}/store`)(callback);
  },
  function(callback) {
     require(`${INITIALIZER_PATH}/i18nextInit`)(callback);
  },
  function(callback) {
    require(`${INITIALIZER_PATH}/mqttServer`)(callback);
  },
  function(callback) {
    require(`${INITIALIZER_PATH}/server`)(callback);
  },
  function(callback) {
    if (typeof(nconf.get('DISABLE_DMWEB_SCHE')) !== 'undefined' && nconf.get('DISABLE_DMWEB_SCHE') === 'true') {
      logger.info('[SCHEDULE] Disable schedule initialization');
      callback();
    } else {
      require(`${INITIALIZER_PATH}/schedule`)(callback);
    }
  }
], function(err) {
    if (err) {
      logger.error('[APP] initialization FAILED', err);
    } else {
      logger.info('[APP] initialized SUCCESSFULLY');
    }
  }
);
