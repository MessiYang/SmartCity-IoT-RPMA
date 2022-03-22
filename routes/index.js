// import routes from '../react/routes';
import dir from 'require-dir';
import express from 'express';
import auth from './middlewares/auth';
import rule from './middlewares/rule';
import config from 'nconf';
import async from 'async';
import { loginOutputData, getTokenAndVerify } from '../services/AccountService';
import deployConfig from '../config/deployConf';

const CONTROLLER_PATH = '../controllers';
const controllers = dir(CONTROLLER_PATH);
const MAP_API_KEY = deployConfig.MAP_API_KEY;

module.exports = function (app) {
  //midleware insert here
  app.use(auth);
  app.use(rule);

  Object.keys(controllers).forEach((controller) => {
    let router = express.Router();
    require(`${CONTROLLER_PATH}/${controller}`)(router);
    app.use(`/${controller.replace('Controller', '')}`, router);
  });
  let router = express.Router();
  router.get('*', handleReSession);
  app.use(router);
}

function handleReSession(req, res) {
  getTokenAndVerify(req, res, (err, data) => {
    return handleRender(req, res);
  });
}

function handleRender(req, res) {
  let target = config.get('EXECUTE_TARGET');
  res.send(renderFullPage(target, loginOutputData(req)));
}

function renderFullPage(target, preloadedState) {
  let prefix = config.get(target).DEPLOY_PREFIX;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>RPMA</title>
      <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous">
      <link href="${prefix}/build/styles.css" rel="stylesheet"/>
      <link rel="icon" href="images/favicon.png">
      <script type="text/javascript" src="https://api.map.baidu.com/api?v=3.0&ak=${MAP_API_KEY}"></script>
      <script type="text/javascript" src="https://api.map.baidu.com/library/TextIconOverlay/1.2/src/TextIconOverlay_min.js"></script>
	    <script type="text/javascript" src="https://api.map.baidu.com/library/MarkerClusterer/1.2/src/MarkerClusterer_min.js"></script>
    </head>
    <script>
        window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')}
    </script>

    <body id="body" class="bg-g">
      <div id="content">
      </div>
      <script src="${prefix}/build/vendor.bundle.js"></script>
      <script src="${prefix}/build/main.js"></script>
    </body>
    </html>
    `
}
