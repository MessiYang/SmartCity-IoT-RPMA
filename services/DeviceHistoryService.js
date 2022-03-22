import util from 'util';
import async from 'async';
import config from 'nconf';
import i18next from 'i18next';
import moment from 'moment';
import request from 'request';
import uuid from 'node-uuid';
import groupArray from 'group-array';
import { soap } from 'strong-soap';
import path from 'path';
import fs from 'fs';
import json2xls from 'json2xls';
import logger from '../config/log';
import {requestToken, requestSendMessage} from '../utils/httpUtil';
import {getSendMsgConfig, combineXmlBody} from '../utils/stringUtil';
import { jobIsRunning } from '../utils/scheduleUtil';
import {sensorPayloadDecode} from '../utils/decodeUtil';
import {payloadEncode} from '../utils/encodeUtil';
import messageModel from '../models/deviceHistoryModel';
import approvedDeviceModel from '../models/approvedDeviceModel';
import devicePayloadModel from '../models/devicePayloadModel';
import statusModel from '../models/deviceStatusHistoryModel';
import commandModel from '../models/commandModel';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import packetStatisticsModel from '../models/packetStatisticsModel';
import GeoTagModel from '../models/geoTagModel';
import LightEventType from '../models/type/LightEventType';
import DeviceType from '../models/type/DeviceType';

const target = config.get('EXECUTE_TARGET');
const {MESSAGE_HOST, MESSAGE_USERNAME, MESSAGE_PASSWORD, MESSAGE_TOKEN_API, MESSAGE_GET_MSG_API, MESSAGE_SEND_API} = config.get(target);

const DOWNSTREAM_COUNTS = 500;

const SEND_EACH_MSG_TIMEOUT = 500;

const JUDGE_OFFLINE_MINSTIME = 480; //mins
const GETMESSAGE_REQUEST_MAX_COUNTS = 12;
const MAX_DECODE_COUNTS_PERTIME = 5000;

const OUTPUT_FOLDER_PATH = '../reports/excelReport/output';
const {NODE_PORT, SITE_URL} = config.get(target);

/*
export downStreamMessage getCurrentDevicePayload getDeviceHistory
*/
export function multiSend(bean, res, cb) {
  let {input, output} = bean;
  let ingenuToken;
  let nodeIdsResult, payloadResult, sendResult;
  let msgHostResult, msgUserNameResult, msgPasswordResult;
  async.series({
    getNodeIds: function(callback) {
      let quary = {'valid': true};
      quary.deviceType = DeviceType.SMARTLAMP.value;
      if(input.geotagId) quary.geotagId = input.geotagId;
      if(input.villageId) quary.villageId = input.villageId;
      if(input.districtId) quary.districtId = input.districtId;
      if(input.countyId) quary.countyId = input.countyId;
      console.log('[encodePayload] quary: ', quary);
      approvedDeviceModel.find(quary, {'_id': 0, 'nodeId':1, 'deviceType':1, 'hostName': 1, 'userName': 1}
      , (err, result)=>{
        console.log('[getNodeIds] -------------result: ', result);
        if (err) return cb(err, null);
        if(!result || !result.length){
          return cb({name: 'NodeIdNotFound'}, null);
        }
        nodeIdsResult = result;
        // let test = groupArray(nodeIdsResult, 'hostName', 'userName');
        // console.log('[getNodeIds] -------------test: ', test);
        callback();
      });
    },
    encodePayload: function(callback) {
      payloadEncode(nodeIdsResult[0].nodeId, input, (err, result)=>{
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'NoResultError'}, null);
        }
        console.log('[encodePayload] result: ', result);
        payloadResult = result;
        callback();
      });
    },
    asyncSendPayload: function(callback) {
      async.mapLimit(nodeIdsResult, 1, send_eachId, function(err, result){
        if (err) return cb(err, null);
        console.log('[getDeviceLatestTimestamp]========== result: ', result);
        sendResult = result;
        callback();
      });
    },
    updateGeotagId: function(callback) {
      if(input.geotagId && (input.eventType == LightEventType.RTCADD.value ||
        input.eventType == LightEventType.SETHEARTBEAT.value)){
        GeoTagModel.findOne({'_id': input.geotagId, 'valid': true}, {'RTCSetting': 1}, 
        function(err, result) {
          if (err) return cb(err, null);  
          if (!result){
            return cb({name: 'NoResultError'}, null);
          }
          let updateData = {};
          console.log('[updateGeotagId] result:', result);
          let data = JSON.parse(JSON.stringify(input));
          delete data._id;
          if(input.index){
            updateData.RTCSetting = result.RTCSetting;   
            let key = Number(input.index);
            updateData.RTCSetting[key] = data;
          }else{
            updateData.heartBeatRate = input.heartBeatRate;
            updateData.isRTCClock = input.isRTCClock;
          }
          console.log('[updateGeotagId] updateData:', updateData);
          GeoTagModel.findOneAndUpdate({'_id': input.geotagId, 'valid': true},
          updateData, {new: true}, function(err, updateLatestResult) {
            if (err) return cb(err, null);
            console.log('[updateGeotagId] updateLatestResult:', updateLatestResult);
            callback();
          });   
        });
      }else if(input.geotagId && input.eventType == LightEventType.RTCDELETE.value){
        GeoTagModel.findOne({'_id': input.geotagId, 'valid': true}, {'RTCSetting': 1}, 
        function(err, result) {
          if (err) return cb(err, null);  
          if (!result){
            return cb({name: 'NoResultError'}, null);
          }
          let updateData = {};
          console.log('[updateGeotagId] result:', result);
          let data = JSON.parse(JSON.stringify(input));
          delete data._id;
          if(input.startIndex && input.endIndex){
            updateData.RTCSetting = result.RTCSetting;  
            for (let i=Number(input.startIndex); i<=Number(input.endIndex); i++){
               updateData.RTCSetting[i] = null;
            } 
          }
          console.log('[updateGeotagId] updateData:', updateData);
          GeoTagModel.findOneAndUpdate({'_id': input.geotagId, 'valid': true},
          updateData, {new: true}, function(err, updateLatestResult) {
            if (err) return cb(err, null);
            console.log('[updateGeotagId] updateLatestResult:', updateLatestResult);
            callback();
          });   
        });
      }else{
        callback();
      }
    },
  }, function(err, results) {
    if (err) {
      cb(err, null);
    }
    cb(null, sendResult);
  });

  function send_eachId(req, response){
    let sendResult, saveResult;
    let uuidValue = uuid.v4();
    let sendConfig;
    async.series({
      getToken: function(callback) {
        sendConfig = getSendMsgConfig(req);
        requestToken(sendConfig.tokenUrl, sendConfig.username, sendConfig.password, function(err, result){
          if (err) return cb(err, null);
          if(!result){
            return cb({name: 'IngenuTokenError'}, null);
          }
          ingenuToken = result.token;
          console.log('[send] ingenuToken: ', ingenuToken);
          callback();
        });
      },
      sendMessage: function(callback) {
        let reqBody = combineXmlBody(uuidValue, req.nodeId, payloadResult)
        requestSendMessage(sendConfig.sendUrl, ingenuToken, reqBody, (err, result)=>{
          if (err) return response(err, null);
          if(!result){
            return response({name: 'NoResultResponseError'}, null);
          }
          sendResult = result;
          console.log('[saveMessage]========== sendResult: ', sendResult);
          callback();
        });
      },
      saveMessage: function(callback) {

        let saveData = input;
        saveData.nodeId = req.nodeId;
        saveData.tag = uuidValue;
        saveData.payload = payloadResult;
        saveData.statusCode = sendResult;
        console.log('[saveMessage]========== saveData: ', saveData);
        new commandModel(saveData).save((err, result) => {
          if (err) return response(err, null);
          if(!result){
            return response({name: 'NoResultResponseError'}, null);
          }
          saveResult = result;
          callback();
        });
      },
      setTimeout: function(callback) {
        setTimeout(()=>{
          return callback();
        }, SEND_EACH_MSG_TIMEOUT);
      },
    }, function(err, results) {
      if (err) {
        response(err, null);
      }
      response(null, saveResult);
    });
  }
}

export function send(bean, res, cb) {
  let {input, output} = bean;
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

export function downStreamMessage(req, cb) {
  logger.info('[downStreamMessage] ===============START================');
  let tokenResult, latestMessageIdResult, messageResult;
  let caseResults, requestResult;
  async.series({
    refreshDeviceOnlineStatus: function(callback) {
      let fifteenMinsAgoTime = someMinutesAgo(JUDGE_OFFLINE_MINSTIME);
      console.log('[refreshDeviceOnlineStatus] fifteenMinsAgoTime: ', fifteenMinsAgoTime);
      approvedDeviceModel.update(
      {"valid": true, "lastHeartBeatTime": {$lt: fifteenMinsAgoTime}},
      {$set: { "onlineStatus": "0" } }, {multi: true}, function(err, result){
        console.log('[refreshDeviceOnlineStatus] OnlineStatus=0: ', result);
      });
      approvedDeviceModel.update(
      {"valid": true, "lastHeartBeatTime": {$gte: fifteenMinsAgoTime}},
      {$set: { "onlineStatus": "1" } }, {multi: true}, function(err, result){
        console.log('[refreshDeviceOnlineStatus] OnlineStatus=1: ', result);
      });
      callback();
    },
    getToken: function(callback) {
      let getTokenURL = req.MESSAGE_HOST+MESSAGE_TOKEN_API
      requestToken(getTokenURL, req.MESSAGE_USERNAME, req.MESSAGE_PASSWORD ,function(err, result){
        if (err) return cb(err, null);
        if(!result){
          return cb({name: 'IngenuTokenError'}, null);
        }
        //console.log('[getToken] result: ', result);
        tokenResult = result.token;
        console.log('[getToken] tokenResult: ', tokenResult);
        //return cb(null, result);
        callback();
      });
    },
    localLatestMessageId: function(callback) {
      var data;
      messageModel.find({'valid': true, 'hostName': req.MESSAGE_HOST, 'userName': req.MESSAGE_USERNAME})
      .sort('-timestamp')
      .limit(1)
      .select('timestamp messageId')
      .exec( function(err, result) {
        console.log('[localLatestMessageId] result: ', result);
        if (err) return cb(err, null);
        if( !result || !result.length ){
          latestMessageIdResult = "";
        }else{
          latestMessageIdResult =  result[0].messageId;
        }
        console.log('[localLatestMessageId] latestMessageIdResult: ', latestMessageIdResult);
        callback();
      });
    },
    getMessage: function(callback) {
      let getMessageURL =  req.MESSAGE_HOST + MESSAGE_GET_MSG_API;
      let count = 0;
      let messageId = "";
      let getMessageUrl;
      let msg = [];
      messageResult = [];
      if (latestMessageIdResult){
        getMessageUrl = getMessageURL + "/" + latestMessageIdResult + "/?count=" + DOWNSTREAM_COUNTS;
      }else{
        getMessageUrl = getMessageURL + "/?count=" + DOWNSTREAM_COUNTS;
      }
      async.doDuring(
        function (msgCallback) {
          count++;
          requestGetMessage(getMessageUrl, tokenResult, function(err, results){

            if(!results || !results.uplinks) {
              msg = [];
              return msgCallback();
            }
            msg = results.uplinks.uplink;
            if(Array.isArray(msg)) {

              messageId = msg[msg.length - 1].messageId;
            }else{
              messageId = msg.messageId;
            }
            //console.log("[results] msg: ", msg);
            console.log("------------ [request_counts]: "+count+" [latest_messageId]: "+messageId);
            getMessageUrl = getMessageURL + "/" + messageId + "/?count=" + DOWNSTREAM_COUNTS;
            messageResult = messageResult.concat(msg);
            msgCallback();
          });
        },
        function (msgCallback) {  //post-check
          return msgCallback(null, (msg.length > 0 && count < GETMESSAGE_REQUEST_MAX_COUNTS));
        },
        function (err) {
          //console.log("==================== [getMessage done!] messageResult: ", messageResult);
          //cb(null, messageResult);
          if(messageResult.length == 0 || !messageResult){
            return cb(null, '!!!!!!!!!No new message.!!!!!!!!!!!!');
          }
          jobIsRunning("downStreamDeviceHistoryJob", (err, result)=>{});
          callback();
        }
      );
    },
    saveMessage: function(callback) {
      let updateData = []
      let data;
      for (let i = 0; i < messageResult.length; i++) {
        if(messageResult[i]){
          if(messageResult[i].datagramUplinkEvent) {
            data = messageResult[i].datagramUplinkEvent;
          }else if(messageResult[i].datagramDownlinkResponse) {
            data = messageResult[i].datagramDownlinkResponse;
            data.isDecoded = "3";
          }else{
            data = {};
          }

          if(messageResult[i].messageId){
            data.hostName = req.MESSAGE_HOST;
            data.userName = req.MESSAGE_USERNAME;
            data.messageId = messageResult[i].messageId;
          }else{
            continue;
          }
          if(messageResult[i].messageType)
            data.messageType = messageResult[i].messageType;
          updateData.push(new messageModel(data));
        }
      }
      async.concatSeries(updateData, updateEachMessageId, function(err, result){
        if (err) return cb(err, null);
        logger.info('[payloadDecode] -----------updateEachMessageId counts:', result.length);
        callback();
      });
    }

  }, function(err, results) {
    if (err) {
      cb(err, null);
    }
    cb(null, 'DownStreamMessage done.');
  });
}
function updateEachMessageId(reqUpdate, callback){
  messageModel.update({'messageId': reqUpdate.messageId}, 
  reqUpdate, {upsert: true}, (err, result)=>{
    if(err) return callback(null,{'[updateEachMessageId] err': err} );
    callback(null,{'[updateEachMessageId] success': reqUpdate.messageId} )
  });
}


export function payloadDecode(req, cb) {
  logger.info('[payloadDecode] --------------START----------------');
  let payloadResult, decodeResult;
  let counts = MAX_DECODE_COUNTS_PERTIME;
  async.series({
    getDeviceHistoryData: function(callback) {
      let where = {
        'valid': true,
        'isDecoded': {$in: ["0", "3"]}
      };
      messageModel.find(where)
      .select('-valid')
      .sort('timestamp')
      .limit(counts)
      .exec((err, results) =>{
        if (err){
          return cb(err, null);
        }
        if(!results){
          return cb(null, 'No data to decode.');
        }
        //logger.info('[payloadDecode] --------------payloadResult: ',payloadResult);
        payloadResult = results;
        logger.info('[payloadDecode] 1111--------------payloadResult.length: ',payloadResult.length);
        callback(null);
      });
    },
    decodeAndSave: function(callback) {
      decodeAndSavePayload(payloadResult, function(err, result){
        if (err){
          return cb(err, null);
        }
        decodeResult = result;
        //logger.info('[payloadDecode] 2222--------------decodeResult: ',decodeResult);
        callback(null);
      });
    },
  }, function(err, results) {
    if (err) {
      cb(err, null);
    }
    cb(null, 'payloadDecode done.');
  });
}


function decodeAndSavePayload(data, cb) {
  let dataGroup = groupArray(data, 'nodeId');
  //console.log('[decodeAndSavePayload] !!!!dataGroup: ', dataGroup);
  async.map(dataGroup, seriesDecodeEachNodeId, function(err, results){
    if (err) return console.log('[decodeAndSavePayload] err: ', err);
    cb(null, results);
  });
}

function seriesDecodeEachNodeId(req, callback){
  //console.log('[seriesDecodeEachNodeId] !!!!req: ', req);
  async.concatSeries(req, saveStatusEachId, function(err, result){
    if (err) return console.log('[seriesDecodeEachNodeId] err: ', err);
    let i = 1;
    let latestResult;
    do {
      //console.log('[seriesDecodeEachNodeId] !!!! i: ', i);
      latestResult = result[result.length-i]
      i++;
    }
    while (latestResult == 'errResult' && i<=result.length);
    console.log('[seriesDecodeEachNodeId] !!!!latestResult: ', latestResult);
    if(latestResult == 'errResult') {
      return callback(null, result);
    }
    let updateData = {
      "lastHeartBeatTime": latestResult.timestamp,
      "messageId": latestResult.messageId,
      "messageType": latestResult.messageType,
      "applicationId": latestResult.applicationId
    };
    if (latestResult.batteryVoltage) updateData.batteryVoltage = latestResult.batteryVoltage;
    if (latestResult.temperature) updateData.temperature = latestResult.temperature;
    if (latestResult.humidity) updateData.humidity = latestResult.humidity;
    if (latestResult.PM25_Value) updateData.pm25 = latestResult.PM25_Value;
    if (latestResult.CH2O_Value) updateData.ch2o = latestResult.CH2O_Value;
    if (latestResult.CO2_Value) updateData.co2 = latestResult.CO2_Value;
    if (latestResult.CO_Value) updateData.co = latestResult.CO_Value;
    if (latestResult.motionState) updateData.motionState = latestResult.motionState;
    if (latestResult.smokeState) updateData.smokeState = latestResult.smokeState;
    if (latestResult.gasState) updateData.gasState = latestResult.gasState;
    if (latestResult.sirenState) updateData.sirenState = latestResult.sirenState;
    if (latestResult.longitude) updateData.longitude = latestResult.longitude;
    if (latestResult.latitude) updateData.latitude = latestResult.latitude;
    if (latestResult.deviceTime) updateData.deviceTime = latestResult.deviceTime;
    if (latestResult.trackerData) updateData.trackerData = latestResult.trackerData;
    if (latestResult.hostName) updateData.hostName = latestResult.hostName;
    if (latestResult.userName) updateData.userName = latestResult.userName;
    approvedDeviceModel.findOneAndUpdate({'nodeId': latestResult.nodeId, 'valid': true},
    updateData, {new: true}, function(err, updateLatestResult) {
      if (err) return console.log('[seriesDecodeEachNodeId] err: ', err);
      callback(null, result);
    });
  });
}

function saveStatusEachId(req, callback){
  if (!req || !req.nodeId ) {

    if(!req.payload && !req.status){
      console.log('[saveStatusEachId] decode失敗!![1]!! err: ');
      updateIsDecoded(req._id, req.messageId, "2", function(err, updateResult){
        if (err){
          console.log('[saveStatusEachId] isDecoded update失敗 err:', err);
        }
      });
      return callback(null, 'errResult');
    }
  }
  sensorPayloadDecode(req, (err, result)=>{
    if (err) {
      console.log('[saveStatusEachId] decode失敗!![2]!! err: ', err);
      updateIsDecoded(req._id, req.messageId, "2", function(err, updateResult){
        if (err){
          console.log('[saveStatusEachId] isDecoded update失敗');
          return callback(null, 'errResult');
        }
        return callback(null, 'errResult');
      });
    }else if (!result) {
      console.log('[saveStatusEachId] decode失敗!![3]!!');
      updateIsDecoded(req._id, req.messageId, "2", function(err, updateResult){
        if (err){
          console.log('[saveStatusEachId] isDecoded update失敗');
          return callback(null, 'errResult');
        }
        return callback(null, 'errResult');
      });
    }else{
      let saveData = result;
      if (req.nodeId) saveData.nodeId = req.nodeId;
      if (req.messageId) saveData.messageId = req.messageId;
      if (req.messageType) saveData.messageType = req.messageType;
      if (req.applicationId) saveData.applicationId = req.applicationId;
      if (req.payload) saveData.payload = req.payload;
      if (req.timestamp) saveData.timestamp = req.timestamp;
      if (req.applicationId) saveData.applicationId = req.applicationId;
      new statusModel(saveData).save((err, saveResult) => {
        if (err) {
          updateIsDecoded(req._id, saveData.messageId, "2", function(err, updateResult){
            if (err){
              console.log('[saveStatusEachId] isDecoded update失敗!![4]!!');
              return callback(null, 'errResult');
            }
            return callback(null, 'errResult');
          });
        } else if (!saveResult) {
          console.log('[saveStatusEachId] message新增失敗');
          updateIsDecoded(req._id, saveData.messageId, "2", function(err, updateResult){
            if (err){
              console.log('[saveStatusEachId] isDecoded update失敗!![5]!!');
              return callback(null, 'errResult');
            }
            return callback(null, 'errResult');
          });
        } else {
          //console.log('[saveStatusEachId] messageId: ', saveData.messageId);
          updateIsDecoded(req._id, saveData.messageId, "1", function(err, updateResult){
            if (err){
              console.log('[saveStatusEachId] isDecoded update失敗!![6]!!');
              return callback(null, 'errResult');
            }
            if(req.hostName) saveResult.hostName = req.hostName;
            if(req.userName) saveResult.userName = req.userName;
            return callback(null, saveResult);
          });
        }
      });
    }
  });
}
function updateIsDecoded(_id, messageId, isDecoded, cb){
  messageModel.update({"_id": _id},
  {$set: {"isDecoded": isDecoded}}, {multi: true}, function(err, updateResult){
    if (err){
      console.log('[updateIsDecoded] isDecoded update失敗');
      return cb(null, 'errResult');
    }
    //console.log('[saveStatusEachId] ************ saveResult :',saveResult);
    return cb(null, updateResult);
  });
}


export function getCurrentDevicePayload(bean, res, cb) {
  let {input, output} = bean;
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true
    }
  });
  if (input.nodeId) {
    aggregateArray.push({
      $match:{
        'nodeId': input.nodeId,
      }
    });
  }
  aggregateArray.push({
    $sort: {
      'timestamp': 1
    }
  });
  aggregateArray.push({
    $group:{
      '_id': '$nodeId',
      'payload': {'$last': '$payload'},
      'timestamp': {'$last': '$timestamp'},
      'applicationId': {'$last': '$applicationId'},
      'time' :{'$last':  "$vitalSignData.measureTime" },
      'value': {'$avg': '$vitalSignData.measureData.measureValue'},
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'nodeId': '$_id',
      'payload': 1,
      'timestamp': 1,
      'applicationId': 1
    }
  });
  messageModel.aggregate(aggregateArray, function(err, results){
    console.log('[getCurrentStatus] results: ', results);
    if (err){
      return cb(err, null);
    }
    cb(null, results);
  });
}

export function getDeviceHistory(bean, res, cb) {
  let {input, output} = bean;
  let endTime = convertTime2DateObject(input.endDate)
  let startTime = convertTime2DateObject(input.startDate)
  console.log('startTime: ', startTime );
  console.log('endTime: ', endTime );
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      'nodeId': input.nodeId,
      'timestamp': {'$gte': new Date(startTime), '$lt': new Date(endTime)}
    }
  });
  if (input.nodeId) {
    aggregateArray.push({
      $match:{
        'nodeId': input.nodeId,
      }
    });
  }
  aggregateArray.push({
    $sort: {
      'timestamp': 1
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'payload': 1,
      'timestamp': 1,
      'applicationId': 1,
      'nodeId': 1,
    }
  });
  messageModel.aggregate(aggregateArray, function(err, results){
    console.log('[getHistoryStatus] results: ', results);
    if (err){
      return cb(err, null);
    }
    cb(null, results);
  });
}

export function testResponseTime(bean, res, cb) {
  let {input, output} = bean;
  let endTime = convertTime2DateObject(input.endDate)
  let startTime = convertTime2DateObject(input.startDate)
  console.log('startTime: ', startTime );
  console.log('endTime: ', endTime );
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'valid': true,
      'nodeId': input.nodeId,
      'timestamp': {'$gte': new Date(startTime), '$lt': new Date(endTime)}
    }
  });
  if (input.nodeId) {
    aggregateArray.push({
      $match:{
        'nodeId': input.nodeId,
      }
    });
  }
  aggregateArray.push({
    $sort: {
      'timestamp': 1
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'payload': 1,
      'timestamp': 1,
      'applicationId': 1,
      'nodeId': 1,
    }
  });
  messageModel.aggregate(aggregateArray, function(err, results){
    //console.log('[getHistoryStatus] results: ', results);
    if (err){
      return cb(err, null);
    }
    cb(null, results);
  });
}

function convertTime2DateObject(time) {
  let date = time.toString();
  let dateSplit = date.split("-");
  console.log('[convertTime2DateObject] dateSplit: ', dateSplit);
  let year = Number(dateSplit[0]);
  let month= Number(dateSplit[1]);
  let day  = Number(dateSplit[2]);
  return new Date(year, month-1, day, 0, 0, 0, 0);
}


export function checkDeviceOnlineStatus(req, cb) {
  let nodeIdResult, latestTimestampResult;
  async.series({
    getDevicesNodeId: function(callback) {
      approvedDeviceModel.find({'valid': true})
      .select('nodeId')
      .exec( function(err, result) {
        console.log('[getDevicesNodeId] result: ', result);
        if (err) return cb(err, null);
        if( !result || !result.length ){
          nodeIdResult = "";
          return cb(null, null);
        }else{
          nodeIdResult =  result;
        }
        console.log('[getDevicesNodeId] nodeIdResult: ', nodeIdResult);
        callback();
      });
    },
    updateDeviceLatestTimestamp: function(callback) {
      async.map(nodeIdResult, updateLatestTime_eachId, function(err, result){
        if (err) return cb(err, null);
        console.log('[getDeviceLatestTimestamp]========== result: ', result);
        callback();
      });

    },
  }, function(err, results) {
    if (err) {
      cb(err, null);
    }
    cb(null, 'CheckDeviceOnlineStatus done.');
  });
}

export function calculateDailyPacketStatistics (bean, req, res, cb) {
  let {input, output} = bean;
  console.log('[Calculate Daily Packet Statistics]');
  if(!req.body || !req.body.date){
  	let date = new Date();
    input.date = moment(new Date(date.setDate(date.getDate()-1))).format("YYYY-MM-DD");
  } else {
    input.date = req.body.date;
  }
  console.log('date: ' + input.date);
  let startTime = moment(input.date).startOf('day').toDate();
  let endTime = moment(input.date).endOf('day').toDate();
  async.waterfall([
    function (callback) {
      // * aggregate deviceStatusHistory (timestamp and tranmissionCounter) for each node * //
      let aggregateArray = [];
      aggregateArray.push({
        $project: {
          'nodeId': 1,
          'timestamp': 1,
          'tranmissionCounter': 1
        }
      });
      aggregateArray.push({
        $match: {
          'tranmissionCounter': {
            $ne: null,
          },
          'timestamp': {
            $gte: startTime,
            $lte: endTime,
          },
        }
      });
      aggregateArray.push({ $sort: { 'timestamp': 1 } });
      aggregateArray.push({
        $group: {
          '_id': '$nodeId',
          'deviceStatusHistoryList': {
            $push: {
              'timestamp': '$timestamp',
              'transmissionCounter': '$tranmissionCounter', // * field typo in deviceStatusHistoryModel * //
            }
          },
        }
      });
      deviceStatusHistoryModel.aggregate(aggregateArray, function (err, results) {
        if (err) {
          callback(err);
        } else if (!results || results.length == 0) {
          return cb && cb(null);
        } else {
          callback(null, results);
        }
      });
    },
    function (deviceStatusHistoryData, callback) {
      let packetStatisticsList = [];
      deviceStatusHistoryData.forEach(function (entry) {
        var nodeId = entry._id;
        var deviceStatusHistoryList = entry.deviceStatusHistoryList;
        // * derive receivedPacketQty and estimatedPacketQty * //
        var receivedPacketQty = 0, estimatedPacketQty;
        if (deviceStatusHistoryList.length < 2) {
          receivedPacketQty = deviceStatusHistoryList.length;
          estimatedPacketQty = deviceStatusHistoryList.length;
        } else {
          const offset = -Number(deviceStatusHistoryList[0].transmissionCounter);
          const remaining = Number(deviceStatusHistoryList[deviceStatusHistoryList.length - 1].transmissionCounter) + 1;
          const CIRCLE_SIZE = 256;
          var circleCounter = 0;
          deviceStatusHistoryList.forEach(function (currentPacket, index) {
            if (index == 0) {
              receivedPacketQty++;
              return;
            }
            var lastPacket = deviceStatusHistoryList[index -1];
            if (Number(lastPacket.transmissionCounter) < Number(currentPacket.transmissionCounter)) {
              receivedPacketQty++;
            } else if (Number(lastPacket.transmissionCounter) > Number(currentPacket.transmissionCounter)) {
              circleCounter++;
            } else {
              // * do nothing while both equal * //
            }
          });
          estimatedPacketQty = offset + (CIRCLE_SIZE * circleCounter) + remaining;
        }
        var receivingRate = receivedPacketQty / estimatedPacketQty;
        packetStatisticsList.push({
          'nodeId': nodeId,
          'packetDate': startTime,
          'receivedPacketQty': receivedPacketQty,
          'estimatedPacketQty': estimatedPacketQty,
          'receivingRate': receivingRate,
        });
      });
      callback(null, packetStatisticsList);
    }, function (packetStatisticsList, callback) {
      // * upsert(update or insert) document in packetStatisticsModel * //
      let options = { upsert: true, new: true, runValidators: true };
      async.map(packetStatisticsList, function (packetStatistics, done) {
        var filter = {
          'nodeId': packetStatistics.nodeId,
          'packetDate': packetStatistics.packetDate,
        };
        var update = { $set: packetStatistics };
        packetStatisticsModel.findOneAndUpdate(filter, update, options, function (err, doc) {
          if (err) {
            console.log(packetStatistics.nodeId + ' failed to be upserted');
            done(err);
          } else {
            console.log(packetStatistics.nodeId + ' successfully upserted');
            done(null);
          }
        });
      }, function (err, results) {
        if (err) {
          callback(err);
        } else {
          callback(null, packetStatisticsList);
        }
      });
    }
  ], function(err, results) {
    if (err) {
      return cb && cb(err);
    } else {
      input.packetStatisticsList = results;
      return cb && cb(null);
    }
  });
}

export function downloadPacketStatistics (bean, req, res, cb) {
  let {input, output} = bean;
  console.log('[Download Packet Statistics]');
  // * check user.levelOneId and user.levelTwoId * //
	if (!req.body.user.levelOneId && !req.body.user.levelTwoId) {
		console.log('no privilege to access data');
		return cb & cb(new Error('no privilege to access data'));
	}
  // * derive startTime and endTime, and set timeParameters * //
  let startTime, endTime, timeParameters;
  if (/^[0-9]{4}[-/][0-9]{2}$/.test(input.month)) {
    startTime = moment(input.month).startOf('month').toDate();
    endTime = moment(input.month).endOf('month').toDate();
    timeParameters = { 'month': input.month };
  } else if (/^[0-9]{4}[0-9]{2}$/.test(input.month)) {
    startTime = moment(input.month.substring(0, 4) + '-' + input.month.substring(4, 6)).startOf('month').toDate();
    endTime = moment(input.month.substring(0, 4) + '-' + input.month.substring(4, 6)).endOf('month').toDate();
    timeParameters = { 'month': input.month.substring(0, 4) + '-' + input.month.substring(4, 6) };
  } else if (input.date) {
    startTime = moment(input.date).startOf('day').toDate();
    endTime = moment(input.date).endOf('day').toDate();
    timeParameters = { 'date': input.date };
  } else if (input.startDate && input.endDate) { // * TODO checkTimeDifference * //
    startTime = moment(input.startDate).startOf('day').toDate();
    endTime = moment(input.endDate).endOf('day').toDate();
    timeParameters = { 'startDate': input.startDate, 'endDate': input.endDate };
  } else {
    console.log('invalid or missing month, date or startDate and endDate');
    return cb && cb(null);
  }
  async.waterfall([
    function (callback) {
      // * retrieve nodeIdToNameMap * //
      let where = {};
			if (req.body.user.name !== '仁寶管理員') {
				if (req.body.user.levelOneId) where['levelOneId'] = req.body.user.levelOneId;
				if (req.body.user.levelTwoId) where['levelTwoId'] = req.body.user.levelTwoId;
			}
			approvedDeviceModel.find(where)
			.select('nodeId name')
			.exec(function (err, results) {
				if (err){
					callback(err);
				} else if (!results || results.length == 0) {
          console.log('approvedDevice not found');
          callback(new Error({ 'approvedDevice': 'not found' }));
        } else {
          var nodeIdToNameMap = {};
          results.forEach(function (entry) {
  					nodeIdToNameMap[entry.nodeId] = entry.name;
  				});
  				callback(null, nodeIdToNameMap);
        }
			});
    },
    function (nodeIdToNameMap, callback) {
      let jsonArray = [];
      async.map(Object.keys(nodeIdToNameMap), function(nodeId, done) {
        async.waterfall([
          function (next) {
            // * find packetStatistics given nodeId * //
            packetStatisticsModel.find({
              'nodeId': nodeId,
              'packetDate': {
                $gte: startTime,
                $lte: endTime,
              },
            }, function (err, packetStatisticsList) {
              if (err) next(err);
              else next(null, packetStatisticsList);
            });
          },
          function (packetStatisticsList, next) {
            // * derive actualPacketQty, estimatedPacketQty and receivingRate * //
            let receivedPacketQty = 0, estimatedPacketQty = 0, receivingRate = 0.00;
            packetStatisticsList.forEach(function (packetStatistics) {
              receivedPacketQty += packetStatistics.receivedPacketQty;
              estimatedPacketQty += packetStatistics.estimatedPacketQty;
            });
            if (receivedPacketQty > 0) receivingRate = (receivedPacketQty / estimatedPacketQty) * 100;
            let statisticsValues = {
              'actualPacketQuantity': receivedPacketQty,
              'totalPacketQuantity': estimatedPacketQty,
              'successfulReceivingRate (%)': receivingRate.toFixed(2)
            };
            next(null, statisticsValues);
          }
        ], function (err, statisticsValues) {
          if (err) {
            done(err);
          } else {
            // * push row into jsonArray * //
            let row = { 'nodeId': nodeId };
            Object.assign(row, timeParameters);
            Object.assign(row, statisticsValues);
            row['note'] = nodeIdToNameMap[nodeId];
            jsonArray.push(row);
            done();
          }
        });
      }, function (err, results) {
        if (err) {
          callback(err);
        } else {
          if (jsonArray.length == 0) {
            // * append `no records` when jsonArray is empty * //
            jsonArray.push({ 'no records': '' });
          } else if (jsonArray.length > 2) {
            // * sort jsonArray when it contains 2 elements or more * //
            jsonArray.sort(function (a, b) {
              if (a.note < b.note) return -1;
              if (a.note > b.note) return 1;
              if (a.nodeId < b.nodeId) return -1;
              if (a.nodeId > b.nodeId) return 1;
              return 0;
            });
          }
          callback(null, jsonArray);
        }
      });
    },
  ], function (err, results) {
    if (err) {
      return cb && cb(err);
    } else {
      // * write results to Excel file * //
      var fileName = uuid();
      var filePath = path.join(__dirname, `${OUTPUT_FOLDER_PATH}/${fileName}.xlsx`);
      var excel = json2xls(results);
      fs.writeFileSync(filePath, excel, 'binary');
      if(req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        input.url = `${SITE_URL}:${NODE_PORT}/report/downloadExcel?filename=${fileName}`;
      } else {
        input.url = `${SITE_URL}/report/downloadExcel?filename=${fileName}`;
      }
      return cb && cb(null);
    }
  });
}

function updateLatestTime_eachId(req, cb){
  let latestTimestampResult, offlineTime, original_onlineStatus, updateResult;
  async.series({
    getLatestTimestamp: function(callback) {
      messageModel.find({'valid': true, 'nodeId': req.nodeId})
      .sort('-timestamp')
      .limit(1)
      .select('timestamp')
      .exec( function(err, result) {
        console.log('[getLatestTimestamp] result: ', result);
        if (err) return cb(err, null);
        if( !result || !result.length ){
          latestTimestampResult = "0";
        }else{
          latestTimestampResult =  result[0].timestamp;
        }
        console.log('[getLatestTimestamp] latestTimestampResult: ', latestTimestampResult);
        callback();
      });
    },
    updateLatestTimestamp: function(callback) {
      approvedDeviceModel.findOneAndUpdate({'nodeId': req.nodeId, 'valid': true},
      {"lastHeartBeatTime": latestTimestampResult}, function(err, result) {
        console.log('[updateLatestTimestamp] -------------result: ', result);
        if (err) return cb(err, null);
        let now = new Date();
        original_onlineStatus = result.onlineStatus;
        offlineTime = minsTimeDifference(new Date(latestTimestampResult), now)
        callback();
      });
    },
    updateOnlineStatus: function(callback) {
      console.log('[updateOnlineStatus] -------------offlineTime: ', offlineTime);
      if (offlineTime >= JUDGE_OFFLINE_MINSTIME && original_onlineStatus == "1") {
        updateOnlineStatus(req.nodeId, "0", function(err, result){
          updateResult = result;
          callback();
        });
      }else if(offlineTime < JUDGE_OFFLINE_MINSTIME && original_onlineStatus == "0"){
        updateOnlineStatus(req.nodeId, "1", function(err, result){
          updateResult = result;
          callback();
        });
      }else{
        updateResult = "No need update."
        callback();
      }
    },
  }, function(err, results) {
    if (err) {
      cb(err, null);
    }
    cb(null, updateResult);
  });
}

function minsTimeDifference(startTime, endTime){
  console.log('[endTime.getTime(): ', endTime.getTime());
  console.log('[startTime.getTime(): ', startTime.getTime());
  return  (endTime.getTime()-startTime.getTime())/(1000*60);
}

function someMinutesAgo(mins){
  return new Date(new Date().getTime()-(mins*60*1000));
}

function updateOnlineStatus(nodeId, status, callback){
  approvedDeviceModel.findOneAndUpdate({'nodeId': nodeId, 'valid': true},
  {"onlineStatus": status}, {new : true}, function(err, result) {
    if (err) return callback(err, null);
    callback(null, result);
  });
}

function requestGetMessage(url, token, callback) {
  let Options = {
    'url': url,
    'body': "",
    'headers': {
      'authorization': token,
      'accept': "application/xml"
    }
  };
  console.log('[requestGetMessage] Options:', Options);
  request.get(Options, function(err, response, results) {
    //console.log('[requestGetMessage] response:', response);
    if (err) {
      return callback(err, null);
    }
    if(!results){
      return callback(null, 'No results.');
    }
    let xmlHandler = new soap.XMLHandler();
    //console.log('[requestGetMessage] results:', results);
    let resultJson = xmlHandler.xmlToJson(null, results, null);
    //console.log('[requestGetMessage] resultJson:', JSON.stringify(resultJson));
    callback(null, resultJson);
  });
}
