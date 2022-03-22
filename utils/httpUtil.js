import request from 'request';
import config from 'nconf';
import uuid from 'node-uuid';
import async from 'async';
import DeviceType from '../models/type/DeviceType';
import {payloadEncode} from '../utils/encodeUtil';
import {getSendMsgConfig, combineXmlBody} from '../utils/stringUtil';
import approvedDeviceModel from '../models/approvedDeviceModel';
import commandModel from '../models/commandModel';

const target = config.get('EXECUTE_TARGET');
const {HTTPUTIL_PROTOCOL, HTTPUTIL_HOSTNAME, NODE_PORT, DEPLOY_PREFIX} = config.get(target);

export function post(req, uri, form, cb, cb_request=function(error, response, body){
		if (error) {
			console.log(`httpUtil-error: ${error}, url:${req.url}`);
			return cb && cb(error, false, null);
		}
		if (response.statusCode == 200) {
			let obj = JSON.parse(body);
			return cb && cb(null, obj.success, obj);
		} else {
			return cb && cb(null, false, null);
		}
	}) {
	let protocol = HTTPUTIL_PROTOCOL || req.protocol;
	let hostname = HTTPUTIL_HOSTNAME || req.hostname;
	let port = NODE_PORT;
	let deployPrefix = DEPLOY_PREFIX || '';
	let url = (uri.indexOf('http')==0) ? uri : `${protocol}://${hostname}:${port}${uri}`;
	delete req.headers['content-length'];
	let options = {
	  url: url,
	  method: 'POST',
	  headers: req.headers,
	  form: form,
	  timeout: 30000,
	};
	request(options, cb_request);
};


export function commandSend(input, cb) {
  let nodeIdsResult, tokenResult, payloadResult, sendResult, saveResult;
  let sendConfig;
  let uuidValue = uuid.v4();
  async.series({
    getNodeIds: function(callback) {
      let quary = {'valid': true, 'nodeId': input.nodeId};
      quary.deviceType = DeviceType.SMARTLAMP.value;
      approvedDeviceModel.findOne(quary, {'_id': 0, 'nodeId':1, 'deviceType':1, 'hostName': 1, 'userName': 1}
      , (err, result)=>{
        console.log('[getNodeIds] -------------result: ', result);
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'NodeIdNotFound'}, null);
        }
        nodeIdsResult = result;
        callback();
      });
    },      
    getToken: function(callback) {
      sendConfig = getSendMsgConfig(nodeIdsResult);
      requestToken(sendConfig.tokenUrl, sendConfig.username, sendConfig.password, function(err, result){
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'IngenuTokenError'}, null);
        }
        tokenResult = result.token;
        console.log('[send] sendConfig: ', sendConfig);
        console.log('[send] tokenResult: ', tokenResult);
        callback();
      });
    },
    encodePayload: function(callback) {
      payloadEncode(input.nodeId, input, (err, result)=>{
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'NoResultError'}, null);
        }
        console.log('[encodePayload] result: ', result);
        payloadResult = result;
        callback();
      });
    },
    sendMessage: function(callback) {
      let reqBody = combineXmlBody(uuidValue, input.nodeId, payloadResult)
      requestSendMessage(sendConfig.sendUrl, tokenResult, reqBody, (err, result)=>{
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'NoResultResponseError'}, null);
        }
        sendResult = result;
        callback();
      });
    },
    saveMessage: function(callback) {
      let saveData = input;
      saveData.tag = uuidValue;
      saveData.payload = payloadResult;
      saveData.statusCode = sendResult;

      new commandModel(saveData).save((err, result) => {
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'NoResultResponseError'}, null);
        }
        saveResult = result;
        callback();
      });
    },
  }, function(err, results) {
    if (err) {
      cb(err, null);
    }
    cb(null, saveResult);
  });
}

export function requestToken(url, username, password, callback) {
  let Options = {
    'url': url,
    'body': "",
    'headers': {
    'username': username,
    'password': password,
    'accept': "application/json",
    'overrideMimeType': false
    },
  };
  console.log('[requestToken] Options:', Options);
  request.post(Options, function(err, response, results) {
    if (err) {
      return callback(err, null);
    }
    if(!results){
      return callback(null, 'No results.');
    }
    callback(null, JSON.parse(results));
  });
}

export function requestSendMessage(url, token, body, callback){
  console.log('[requestSendMessage] body:', body);
  let Options = {
    'url': url,
    'body': body,
    'headers': {
    'Content-Type': 'application/xml',
    'Accept': 'application/xml',
    'Authorization': token
    }
  };
  request.post(Options, function(error, response, result) {
    if (error) {
      console.log('[requestSendMessage]error: ', error);
      return callback(error, null);
    }
    console.log('[requestSendMessage] response.statusCode:', response.statusCode);
    callback(null, response.statusCode);
  });
}