import async from 'async';
import moment from 'moment';
import request from 'request';
import { Base64 } from 'js-base64';
import regression from 'regression';
import coordtransform from 'coordtransform';
import logger from '../config/log';
import approvedDeviceModel from '../models/approvedDeviceModel';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import commandModel from '../models/commandModel';
import DeviceType from '../models/type/DeviceType';
import { setDeviceStartParkingTime, setDeviceEndParkingTime} from '../utils/parkingUtil';
import LightEventType from '../models/type/LightEventType';
import socketIOUtil from '../utils/socketIOUtil';
import {commandSend} from '../utils/httpUtil';

const MINCOUNTS_RegressionInputData = 600;
const INTERVAL_UpdateRegression = 120;

const MAPVIEWCONTROL_EVENT = 'mapViewControl';
const GROUPDEVICESETTING_EVENT = 'groupDevicesSetting';

export function sensorPayloadDecode(input, cb) {
  let decodeType = "0";
  let powerLevelFactor = 1;
  let decodeResult;
  async.series({
    checkApprovedDevice: function(callback) {
      approvedDeviceModel.findOne({'nodeId': input.nodeId, 'valid': true}, 
      function(err, result) {
        if (!result || !result.deviceType){
          console.log('[checkApprovedDevice] It is not approved device!! nodeId:', input.nodeId);
          return cb(null, null);
        }else{
          decodeType = result.deviceType;
          if(result.powerLevelFactor) powerLevelFactor = result.powerLevelFactor;
          callback();
        }
      });
    },
    decodePayloadByType: function(callback) {
      switch(decodeType){
        case "0":
          callback();
        break;
        case DeviceType.PARKINGSENSOR.value: 
        if(input.messageType == "DatagramUplinkEvent" && input.payload){
          parkingSensorDecode(input.nodeId, input.payload, input.timestamp, (err, result)=>{
            decodeResult = result;
            if(decodeResult && decodeResult.parkingDetect && decodeResult.parkingDetect=="0"){
              calculateRefValueRegression(input.nodeId, (err, result)=>{
                if (err) logger.info("[calculateRefValueRegression] err: ", err);  
                if (result) console.log('[calculateRefValueRegression] result:', result);   
                callback();
              });
            }else{
              callback();
            }
          });
        }else{
          console.log('[decodePayloadByType] No need decode! , nodeId:', input.nodeId); 
          return cb(null, null);
        }
        break;
        case DeviceType.AIRSENSOR.value:
          airSensorDecode(hex2Ascii(input.payload), (err, result)=>{
            decodeResult = result
            callback();
          });
        break;
        case DeviceType.SMARTLAMP.value:
          if(input.messageType == "DatagramDownlinkResponse" && input.status){
            downlinkResponseDecode(input.nodeId, input.tag, input.status, input.timestamp, (err, result)=>{
              if (err) return cb(err, null);
              decodeResult = result
              callback();
            });
          }else if(input.messageType == "DatagramUplinkEvent" && input.payload){
            uplinkPayloadDecode(input.nodeId, input.payload, powerLevelFactor, (err, result)=>{
              if (err) return cb(err, null);
              decodeResult = result
              callback();
            });
          }
        break;        
        case DeviceType.TRACKER.value:
          if(input.messageType == "DatagramUplinkEvent" && input.payload){
            GPSUplinkPayloadDecode(input.payload, input.timestamp, (err, result)=>{
              decodeResult = result
              callback();
            });
        }else{
          callback();
        }
        break;
      }
    }
  }, function(err, results) {
    if (err) {
      cb(err, null);
    } 
    cb(null, decodeResult);
  });
}

function parkingSensorDecode(nodeId, payload, timestamp, cb) {
  let parkingSensor = {};
  let byte03 = payload.slice(0, 4);
  if (byte03 == '0001'){
	  parkingSensor.basicData = 'calibration';
  }else if (byte03 == '0101'){
  	parkingSensor.basicData = 'current';
  }else{
    return cb('Payload can not decode.', null); 
  }

  parkingSensor.tranmissionCounter = Hex2Int(payload, 4, 6);
  parkingSensor.batteryVoltage = Hex2Int(payload, 6, 8)/10;

  let byte89 = payload.slice(8, 10);
  if (byte89 == '00'){
	  parkingSensor.installStates = 'factory';
  }else if (byte89 == '01'){
  	parkingSensor.installStates = 'setting';
  }else if (byte89 == '02'){
  	parkingSensor.installStates = 'final';
  }
  let temp = Hex2Int(payload, 10, 12);
  //parkingSensor.temperature = Hex2Int(payload, 10, 12);
  if(temp > 128) {
    parkingSensor.temperature = temp - 256;
  }else{
    parkingSensor.temperature = temp;
  }
  let xValue = Hex2Int(payload, 12, 16);
  let yValue = Hex2Int(payload, 16, 20);
  let zValue = Hex2Int(payload, 20, 24);
  if (xValue>=32768) xValue = xValue - 65536;
  if (yValue>=32768) yValue = yValue - 65536;
  if (zValue>=32768) zValue = zValue - 65536;
  parkingSensor.xValue = xValue;
  parkingSensor.yValue = yValue;
  parkingSensor.zValue = zValue;
  
  if(parkingSensor.basicData == 'calibration'){
    approvedDeviceModel.findOneAndUpdate({'nodeId': nodeId, 'valid': true},
    {"ref_xValue": xValue, "ref_yValue": yValue, "ref_zValue": zValue, "ref_temp": parkingSensor.temperature}, 
    {new: true}, function(err, result) {
      if (err) return cb(err, null);
  
      parkingSensor.ref_xValue = xValue;
      parkingSensor.ref_yValue = yValue;
      parkingSensor.ref_zValue = zValue;
      parkingSensor.refValue = result.refValue;
      parkingSensor.parkingDetect = result.parkingDetect;
      parkingSensor.moveDetect = payload.slice(25, 26);
      return cb(null, parkingSensor);
    });
  }else if(parkingSensor.basicData == 'current'){
    approvedDeviceModel.findOne({'nodeId': nodeId, 'valid': true},
    {"ref_xValue": 1, "ref_yValue": 1, "ref_zValue": 1, "refValue": 1,
     "parkingDetect": 1, 'xWeight': 1, 'yWeight': 1, 'zWeight': 1,
     'smithZoneTop': 1 ,'smithZoneButtom': 1, 
     'ref_temp':1, 'x_temp_weight':1, 'y_temp_weight':1, 'z_temp_weight':1,
     'x_temp_weight_order2':1, 'y_temp_weight_order2':1, 'z_temp_weight_order2':1}, 
    function(err, result) {
      if (err) return cb(err, null);

      let last_refValue = result.refValue;
      let last_parkingDetect = result.parkingDetect;
      let refValue;
      if (xValue == 8) { // heartbeat package
        refValue = last_refValue;
        parkingSensor.parkingDetect = last_parkingDetect;
      }else{
        //console.log('[######################] result:', result);        
        let tempWeightedValue = weightTemperatureRef(result, parkingSensor.temperature);
        parkingSensor.ref_xValue_tempWeighted = tempWeightedValue.ref_xValue_tempWeighted;
        parkingSensor.ref_yValue_tempWeighted = tempWeightedValue.ref_yValue_tempWeighted;
        parkingSensor.ref_zValue_tempWeighted = tempWeightedValue.ref_zValue_tempWeighted;

        //console.log('[######################] tempWeightedValue:', tempWeightedValue);
        refValue = Math.sqrt(Math.pow(tempWeightedValue.ref_xValue_tempWeighted-xValue, 2)*result.xWeight
                            +Math.pow(tempWeightedValue.ref_yValue_tempWeighted-yValue, 2)*result.yWeight
                            +Math.pow(tempWeightedValue.ref_zValue_tempWeighted-zValue, 2)*result.zWeight);
        let refValue_threshold_top = result.smithZoneTop;
        let refValue_threshold_bottem = result.smithZoneButtom;
        parkingSensor.parkingDetect = calculateParkingDetect(
          last_refValue, 
          refValue, 
          last_parkingDetect,
          refValue_threshold_top,
          refValue_threshold_bottem
        );
      }    
    
      parkingSensor.ref_xValue = result.ref_xValue;
      parkingSensor.ref_yValue = result.ref_yValue;
      parkingSensor.ref_zValue = result.ref_zValue;
      parkingSensor.refValue = refValue;
      parkingSensor.moveDetect = payload.slice(25, 26);
      let new_parkingDetect = parkingSensor.parkingDetect;
      
      if (new_parkingDetect != last_parkingDetect || refValue != last_refValue){
        let updateData;
        if(last_parkingDetect == "0" && new_parkingDetect == "1"){
          updateData = {
            "parkingDetect": new_parkingDetect, 
            "refValue": refValue, 
            "lastStartParkingTime": timestamp
          };
          setDeviceStartParkingTime(nodeId, timestamp, (err, result)=>{});
        }else if(last_parkingDetect == "1" && new_parkingDetect == "0"){
          updateData = {
            "parkingDetect": new_parkingDetect, 
            "refValue": refValue,
            "lastEndParkingTime": timestamp
          };
          setDeviceEndParkingTime(nodeId, timestamp, (err, result)=>{});
        }else{
          updateData = {
            "refValue": refValue,
          };
        }
        approvedDeviceModel.findOneAndUpdate({'nodeId': nodeId, 'valid': true},
        updateData, {new: true}, function(err2, result2) {
          if (err2) return cb(err, null);  
          return cb(null, parkingSensor); 
        });
      }else{
        return cb(null, parkingSensor); 
      }
    });
  }else{
    return cb(null, null); 
  }
}

function weightTemperatureRef(data, nowTemp){
  let result = {};
  if (data.x_temp_weight == null || data.y_temp_weight == null || data.z_temp_weight == null || data.ref_temp == null){
    result.ref_xValue_tempWeighted = data.ref_xValue;
    result.ref_yValue_tempWeighted = data.ref_yValue;
    result.ref_zValue_tempWeighted = data.ref_zValue;
  }else if(data.x_temp_weight_order2 == null || data.y_temp_weight_order2 == null || data.z_temp_weight_order2 == null){
    result.ref_xValue_tempWeighted = data.ref_xValue + data.x_temp_weight*(nowTemp - data.ref_temp);
    result.ref_yValue_tempWeighted = data.ref_yValue + data.y_temp_weight*(nowTemp - data.ref_temp);
    result.ref_zValue_tempWeighted = data.ref_zValue + data.z_temp_weight*(nowTemp - data.ref_temp);
  }else{
    result.ref_xValue_tempWeighted = data.ref_xValue + data.x_temp_weight*(nowTemp) + data.x_temp_weight_order2*(nowTemp)*(nowTemp);
    result.ref_yValue_tempWeighted = data.ref_yValue + data.y_temp_weight*(nowTemp) + data.y_temp_weight_order2*(nowTemp)*(nowTemp);
    result.ref_zValue_tempWeighted = data.ref_zValue + data.z_temp_weight*(nowTemp) + data.z_temp_weight_order2*(nowTemp)*(nowTemp);
  }
  return result;
}

function calculateParkingDetect(last_refValue, refValue, last_parkingDetect, refValue_threshold_top, refValue_threshold_bottem){
  let isLastTimeInThresholdZone = 0;
  if (last_refValue>refValue_threshold_bottem && last_refValue<refValue_threshold_top){
    isLastTimeInThresholdZone = 1;
  }
  if (refValue>refValue_threshold_bottem && refValue<refValue_threshold_top){ //這次參考值在區間裡面
    if(isLastTimeInThresholdZone==1){
      return last_parkingDetect;
    }else{ //上次參考值不在區間裡面
      if (last_refValue>refValue_threshold_top){ //last parking status is 1
      
        // if(Math.abs(refValue-last_refValue)<20){
        //   return "1";//no change
        // }else{
        //   return "0";//opposite to last parking status
        // }
        return "0";//opposite to last parking status
      }else{ //last parking status is 0
        return "1";//opposite to last parking status
      }
    }
  }else{
    if (refValue<refValue_threshold_bottem){
      return "0";
    }
    else{
      return "1";
    }
  }
}

function airSensorDecode(payload, cb) {
  let result;
  console.log('[airSensorDecode] payload:', payload);
	let airSensorType = Hex2Int(payload, 0, 2);
  if (!airSensorType) {
    return cb('AirSensor payload can not decode.', null);
  }
  console.log('[airSensorDecode] airSensorType:', airSensorType);
	switch(airSensorType){
	  case 1:
	    result = decode_PM25(payload);
	    break;
	  case 2:
	    result = decode_CH2O(payload);
	    break;
	  case 3:
	    result = decode_CO2(payload);
	    break;
	  case 4:
	    result = decode_CO(payload);
	    break;
	  case 5:
	    result = decode_PIR(payload);
	    break;
	  case 6:
	    result = decode_Smoke(payload);
	    break;
	  case 7:
	    result = decode_Gas(payload);
	    break;
	  case 8:
	    result = decode_Siren(payload);
	    break;	 
    default: 
      return cb('AirSensor payload can not decode.', null);
      break;
	}
  result.airSensorType = airSensorType;
  //return result;
  cb(null, result);
}

function decode_PM25(payload) {
  let PM25Sensor = {};
	PM25Sensor.PM25_Value = Hex2Int(payload, 2, 6);
	if(Hex2Int(payload, 6, 10) != 65535)
    PM25Sensor.temperature = Hex2Int(payload, 6, 10) / 100;
  if(Hex2Int(payload, 10, 14) != 65535)
    PM25Sensor.humidity = Hex2Int(payload, 10, 14) / 100;
  return PM25Sensor;
}
function decode_CH2O(payload) {
  let CH2OSensor = {};
	CH2OSensor.CH2O_Value = Hex2Int(payload, 2, 6)/1000;
	if(Hex2Int(payload, 6, 10) != 65535)
    CH2OSensor.temperature = Hex2Int(payload, 6, 10) / 100;
  if(Hex2Int(payload, 10, 14) != 65535)
    CH2OSensor.humidity = Hex2Int(payload, 10, 14) / 100;
  return CH2OSensor;
}
function decode_CO2(payload) {
  let CO2Sensor = {};
	CO2Sensor.CO2_Value = Hex2Int(payload, 2, 6);
	if(Hex2Int(payload, 6, 10) != 65535)
    CO2Sensor.temperature = Hex2Int(payload, 6, 10) / 100;
  if(Hex2Int(payload, 10, 14) != 65535)
    CO2Sensor.humidity = Hex2Int(payload, 10, 14) / 100;
  return CO2Sensor;
}
function decode_CO(payload) {
  let COSensor = {};
	COSensor.CO_Value = Hex2Int(payload, 2, 6);
	if(Hex2Int(payload, 6, 10) != 65535)
    COSensor.temperature = Hex2Int(payload, 6, 10) / 100;
  if(Hex2Int(payload, 10, 14) != 65535)
    COSensor.humidity = Hex2Int(payload, 10, 14) / 100;
  return COSensor;
}
function decode_PIR(payload) {
  let PIRSensor = {};
	PIRSensor.motionState = Hex2Int(payload, 2, 4);
	if(Hex2Int(payload, 4, 6) != 255)
    PIRSensor.batteryVoltage = Hex2Int(payload, 4, 6) / 10;
  // if(Hex2Int(payload, 6, 14) != 4294967295)
  //   PIRSensor.option = Hex2Int(payload, 6, 14);
  return PIRSensor;
}
function decode_Smoke(payload) {
  let smokeSensor = {};
	smokeSensor.smokeState = Hex2Int(payload, 2, 6);
	if(Hex2Int(payload, 6, 8) != 255)
    smokeSensor.batteryVoltage = Hex2Int(payload, 6, 8) / 10;
  // if(Hex2Int(payload, 10, 14) != 16777215)
  //   smokeSensor.option = Hex2Int(payload, 10, 14);
  return smokeSensor;
}
function decode_Gas(payload) {
  let gasSensor = {};
	gasSensor.gasState = Hex2Int(payload, 2, 4);
	// if(Hex2Int(payload, 4, 6) != 255)
 //    gasSensor.option = Hex2Int(payload, 4, 6) / 10;
  // if(Hex2Int(payload, 6, 14) != 16777215)
  //   gasSensor.option = Hex2Int(payload, 6, 14);
  return gasSensor;
}
function decode_Siren(payload) {
  let sirenSensor = {};
	sirenSensor.sirenState = Hex2Int(payload, 2, 4);
	// if(Hex2Int(payload, 4, 6) != 255)
 //    sirenSensor.option = Hex2Int(payload, 4, 6) / 10;
  // if(Hex2Int(payload, 6, 14) != 16777215)
  //   sirenSensor.option = Hex2Int(payload, 6, 14);
  return sirenSensor;
}

export function downlinkResponseDecode(nodeId, tag, status, timestamp, cb) {
  console.log('[downlinkResponseDecode] status:', status);
  if (status != "SUCCESS"){
     return cb({msg: "Unsuccess command!"}, null); 
  }
  let updateData = {};
  let smartLampData = {};
  let commandResult, updateResult, geotagIdResult;
  async.series({
    getCommandData: function(callback) {
      commandModel.findOne({'nodeId': nodeId, 'tag': tag, 'valid': true}, 
      function(err, result) {
        if (err) return cb(err, null);  
        if (!result ){
          console.log('[getCommandData] No this command data, tag:', tag);
          return cb(null, null);
        }else{
          commandResult = result;
          console.log('[getCommandData] commandResult:', commandResult);
          callback();
        }
      });
    },
    checkUpdateData: function(callback) {
      if (commandResult.eventType == LightEventType.RTCADD.value){
        approvedDeviceModel.findOne({'nodeId': nodeId, 'valid': true}, {'RTCSetting': 1}, 
        function(err, result) {
          if (err) return cb(err, null);  
          if (!result){
            console.log('[checkUpdateData] No this approvedDevice data, nodeId:', nodeId);
            return cb(null, null);
          }
          console.log('[checkUpdateData] result:', result);
          let data = JSON.parse(JSON.stringify(commandResult));
          delete data._id;
          updateData.RTCSetting = result.RTCSetting;   
          let key = Number(commandResult.index);
          updateData.RTCSetting[key] = data;
          updateData.RTCSetting[key].onOff = commandResult.onOff;
          updateData.RTCSetting[key].pwm = commandResult.pwm;
          callback();
        });        
      }else{
        if (commandResult.onOff) updateData.onOff = commandResult.onOff;
        if (commandResult.pwm) updateData.pwm = commandResult.pwm;
        if (commandResult.isRTCClock) updateData.isRTCClock = commandResult.isRTCClock;
        if (commandResult.heartBeatRate) updateData.heartBeatRate = commandResult.heartBeatRate;
        callback();
      }
    },
    updateApprovedDeviceStatus: function(callback) {
      console.log('[updateApprovedDeviceStatus] updateData:', updateData);
      approvedDeviceModel.findOneAndUpdate({'nodeId': nodeId, 'valid': true},
      updateData, {new: true}, function(err, result) {
        if (err) return cb(err, null);  
        if (!result){
          console.log('[updateApprovedDeviceStatus] No this approvedDevice data, nodeId:', nodeId);
          return cb(null, null);
        }
        if(result.geotagId) geotagIdResult = result.geotagId;
        updateResult = result;
        callback();
      });
    },
    notifyWebToRefresh: function(callback) {
      let event;
      let msg = 'Updated/';
      if(commandResult.eventType == LightEventType.RTCADD.value ||
      commandResult.eventType == LightEventType.RTCDELETE.value){
        event = GROUPDEVICESETTING_EVENT;
      }else if(commandResult.eventType == LightEventType.CONTROL.value ||
      commandResult.eventType == LightEventType.DIMMING.value){
        event = MAPVIEWCONTROL_EVENT;
      } 
      if (geotagIdResult) {
        msg = msg+'geotagId/'+geotagIdResult+'/nodeId/'+nodeId;
      }else{
        msg = msg+'nodeId/'+nodeId;
      }
      console.log('[===================notifyWebToRefresh===================] event:', event);
      console.log('[===================notifyWebToRefresh===================] msg:', msg);
      if(event) socketIOUtil.send(event, msg);
      callback();
    }
  }, function(err, results) {
    if (err) {
      cb(err, null);
    } 
    if(updateResult.onOff) smartLampData.onOff = updateResult.onOff;
    if(updateResult.pwm) smartLampData.pwm = updateResult.pwm;
    if(updateResult.RTCSetting) smartLampData.RTCSetting = updateResult.RTCSetting;
    if(commandResult.eventType) smartLampData.eventType = commandResult.eventType;
    if(commandResult.payload) smartLampData.payload = commandResult.payload;
    if(tag) smartLampData.tag = tag;
    cb(null, smartLampData);
  });
}

export function uplinkPayloadDecode(nodeId, payload, powerLevelFactor, cb) {
  let data = {};
  // let nodeId = input.nodeId;
  // let payload = input.payload;

  let eventType;
  let totalBytes = Hex2Int(payload, 0, 2);
  let startByte = payload.slice(2, 4);
  let endByte = payload.slice(payload.length-2, payload.length)
  if (totalBytes != payload.length/2 || startByte != '02'){
    return cb('Payload totalBytes or startByte is not correct.', null); 
  }
  if(endByte == '03'){
    eventType = payload.slice(payload.length-6, payload.length-4);
  }else{
    eventType = payload.slice(payload.length-4, payload.length-2);
  }
  console.log("eventType: ",eventType);
  //Status Report, eventType: 00,01,02,FF
  if (eventType == LightEventType.RESET.value || 
  eventType == LightEventType.CONTROL.value ||  
  eventType == LightEventType.DIMMING.value ||
  eventType == LightEventType.STATUS.value){ 
    data.onOff = Hex2Int(payload, 6, 8);
    data.pwm = Hex2Int(payload, 8, 10);    
    let rawTemperature = Hex2Int(payload, 10, 14);  
    if (rawTemperature>=32768) data.temperature = (rawTemperature-65536)*0.01;
    data.temperature = rawTemperature*0.01;
    data.humidity = Hex2Int(payload, 14, 18) * 0.1;   
    data.lightValue = Hex2Int(payload, 18, 22); 

    let powerLevel_type2 = Hex2Int(payload, 22, 26);
    console.log("powerLevel_type2: ",powerLevel_type2);
    if(powerLevel_type2 != 64000){
      data.powerLevel = calculatePowerLevel_type2(powerLevel_type2); 
    }else{
      data.powerLevel = calculatePowerLevel(Hex2Int(payload, 28, 30)); 
    }
    console.log("data.powerLevel: ",data.powerLevel);
  //Time Report, eventType: 03,07  
  }else if(eventType == LightEventType.SETTIME.value || 
    eventType == LightEventType.TIMEREAD.value ){
    let time = {};
    time.year  = payload.slice(6, 8);
    time.month = payload.slice(8, 10);
    time.day   = payload.slice(10, 12);
    time.hour  = payload.slice(14, 16);
    time.min   = payload.slice(16, 18);
    time.sec   = payload.slice(18, 20);
    console.log("time: ",time);
    data.deviceTime = setDeviceTime(time);
    data.powerLevel = calculatePowerLevel(Hex2Int(payload, 22, 24)); 

  //RTC Event Report, eventType: 06 
  }else if(eventType == LightEventType.RTCREAD.value){
    data.RTCSetting = [{},{},{},{},{},{},{},{}]; 
    for(let i=0; i<8; i++){
      data.RTCSetting[i].year  = payload.slice (6+i*18,  8+i*18);
      data.RTCSetting[i].month = payload.slice (8+i*18, 10+i*18);
      data.RTCSetting[i].day   = payload.slice(10+i*18, 12+i*18);
      let rawWeekdaysSetting   = payload.slice(12+i*18, 14+i*18);
      data.RTCSetting[i].hour  = payload.slice(14+i*18, 16+i*18);
      data.RTCSetting[i].min   = payload.slice(16+i*18, 18+i*18);
      data.RTCSetting[i].onOff = payload.slice(18+i*18, 20+i*18);
      data.RTCSetting[i].pwm   = Hex2Int(payload, 20+i*18, 22+i*18);
      data.powerLevel = calculatePowerLevel(Hex2Int(payload, 22+i*18, 24+i*18));
      
      let weekdaysSettingBin = hex2Bin(rawWeekdaysSetting);
      data.RTCSetting[i].isOneTime = checkIsOneTime(weekdaysSettingBin);
      data.RTCSetting[i].selectWeekDays = getSelectWeekDays(weekdaysSettingBin);
      console.log("bin of rawWeekdaysSetting: ",weekdaysSettingBin);
    }

  //Heart Beat Report, eventType: 08 
  }else if(eventType == LightEventType.SETHEARTBEAT.value){
    data.isRTCClock = checkIsRTCClock(payload.slice(6, 8));
    data.heartBeatRate = Hex2Int(payload, 8, 10)*10;
    data.powerLevel = calculatePowerLevel(Hex2Int(payload, 10, 12));

  //Re-online , eventType: 0E 
  }else if(eventType == LightEventType.REONLINE.value){
    let now = moment();
    let dayOfWeek = '0' + String(now.day());
    if(dayOfWeek == '00') dayOfWeek = '07';
    let input = {
      "nodeId": nodeId,
      "eventType": LightEventType.SETTIME.value,
      "year": now.format('YYYY'),
      "month": now.format('MM'),
      "day": now.format('DD'),
      "dayOfWeek": dayOfWeek,
      "hour": now.format('HH'),
      "min": now.format('mm'),
      "sec": now.format('ss'),
    }
    console.log("[uplinkPayloadDecode] Re-online, input:",input);
    commandSend(input, (err, result)=>{
      if (err){
        console.log('[uplinkPayloadDecode] commandSend, err:', err);
      }
      console.log('[uplinkPayloadDecode] commandSend OK!, nodeId:', nodeId);
    });
  }

  if(data.powerLevel) data.powerLevel = powerLevelFactor*data.powerLevel;
  console.log("data : ",data);
  approvedDeviceModel.findOneAndUpdate({'nodeId': nodeId, 'valid': true},
  data, {new: true}, function(err, result) {
    //console.log("err : ",err);
    if (err) return cb(err, null);  
    if (!result){
      console.log('[uplinkPayloadDecode] No this approvedDevice data, nodeId:', nodeId);
      return cb(null, null);
    }
    //console.log("result : ",result);
    data.eventType = eventType;
    data.payload = payload;
    //console.log("data : ",data);
    return cb(null, data);
  });
}

export function GPSUplinkPayloadDecode(payload, timestamp, cb){
  let data = {}
  data.check = payload.slice(26, 28);
  if(data.check != "0D") return cb(null, null);

  let time = {};
  time.hour = Hex2Int(payload, 0, 2);
  time.min  = Hex2Int(payload, 2, 4);
  time.sec  = Hex2Int(payload, 4, 6);
  if(time.hour == 0 && time.min == 0 && time.sec == 0){
    console.log('[GPSUplinkPayloadDecode] msg: No GPS data!');
    data.batteryVoltage = Hex2Int(payload, 22, 26)/1000;
    data.trackerData = Hex2Int(payload, 34, 38)*30/2000;
    console.log('[GPSUplinkPayloadDecode] data: ', data);
    cb(null, data);
  }else{
    let now = new Date(timestamp);
    data.deviceTime = now.setUTCHours(time.hour, time.min, time.sec, 0);
    let realLatitude  = Hex2Int(payload, 6, 14)/1000000;
    let realLongitude = Hex2Int(payload, 14, 22)/1000000;

    let baiduCoord = coordTransformWGS2Baidu(realLongitude, realLatitude);
    data.longitude = baiduCoord[0];
    data.latitude  = baiduCoord[1]; 
    data.batteryVoltage = Hex2Int(payload, 22, 26)/1000;
    data.trackerData = Hex2Int(payload, 34, 38)*30/2000;
    console.log('[GPSUplinkPayloadDecode] data: ', data);
    cb(null, data);

    // convertToBaiduCoordinate(realLongitude, realLatitude, (err, result)=>{
    //   data.latitude  = result.baiduLat;
    //   data.longitude = result.baiduLong;
    //   data.batteryVoltage = Hex2Int(payload, 22, 26)/1000;
    //   data.trackerData = Hex2Int(payload, 34, 38)*30/2000;
    //   console.log('[GPSUplinkPayloadDecode] data: ', data);
    //   cb(null, data);
    // });
  } 
}

export function convertToBaiduCoordinate(realLong, realLat, cb){
  let url = 'http://api.map.baidu.com/ag/coord/convert?from=0&to=4&x='+ realLong +'&y='+ realLat;
  console.log('[convertToBaiduCoordinate] url:', url);  
  request.get(url, function(error, response, result) {
    let objResult = {};
    if (error) {
      console.log('[convertToBaiduCoordinate]error: ', error);
      objResult.baiduLong = realLong;
      objResult.baiduLat = realLat;
      return cb(null, objResult);
    }
    let objResult_undecode = JSON.parse(result);
    console.log('[convertToBaiduCoordinate] objResult_undecode:', objResult_undecode);
    if (objResult_undecode.error == 0){
      objResult.baiduLong = Base64.decode(objResult_undecode.x);
      objResult.baiduLat = Base64.decode(objResult_undecode.y);
      console.log('[convertToBaiduCoordinate] objResult:', objResult);
    }else{
      objResult.baiduLong = realLong;
      objResult.baiduLat = realLat;
    }
    cb(null, objResult);
  });
}

export function coordTransformWGS2Baidu(rawLong, rawLat){
  let wqs2Gcj_Result = coordtransform.wgs84togcj02(rawLong, rawLat);
  console.log('[coordTransformWGS2Baidu] wqs2Gcj_Result:', wqs2Gcj_Result);
  let gcj2Baidu_Result = coordtransform.gcj02tobd09(wqs2Gcj_Result[0], wqs2Gcj_Result[1]);
  console.log('[coordTransformWGS2Baidu] gcj2Baidu_Result:', gcj2Baidu_Result);
  return gcj2Baidu_Result
}

export function calculateRefValueRegression(nodeId, cb){
  let InputData, regressionResult, updateResult;
  async.series({
    checkInputDataOfRegression: function(callback) {
      let where = {
        'valid': true,
        'parkingDetect' : "0",
        "basicData" : "current",
        'nodeId' : nodeId
      };
      deviceStatusHistoryModel.find(where)
      .select('xValue yValue zValue temperature')
      //.sort('temperature')
      .exec((err, data)=>{
        if (err) {
          console.log("[calculateRefValueRegression] err: ", err);
          return cb(err, null);
        }else if (!data || data.length<MINCOUNTS_RegressionInputData 
        || ((data.length-MINCOUNTS_RegressionInputData)%INTERVAL_UpdateRegression)>0){
          //console.log("[calculateRefValueRegression] No enough inputData for regression. data.length:", data.length);
          return cb("No enough inputData for regression. data.length: " +data.length, null);
        }else{
          console.log("[calculateRefValueRegression] data : ",data.length);  
          let filteredData = filterUnusualValue(data);
          console.log("[calculateRefValueRegression] filteredData : ",filteredData.length);

          InputData = {};
          let startIndex = Math.round(filteredData.length/6);
          let endIndex = Math.round(filteredData.length-filteredData.length/6);

          filteredData.sort(function(a, b){return a.xValue - b.xValue});
          InputData.x = convertArrayForm(filteredData.slice(startIndex, endIndex)).x;
          console.log("[calculateRefValueRegression] InputData.x : ",InputData.x.length); 

          filteredData.sort(function(a, b){return a.yValue - b.yValue});
          InputData.y = convertArrayForm(filteredData.slice(startIndex, endIndex)).y;
          console.log("[calculateRefValueRegression] InputData.y : ",InputData.y.length); 

          filteredData.sort(function(a, b){return a.zValue - b.zValue});
          InputData.z = convertArrayForm(filteredData.slice(startIndex, endIndex)).z;
          console.log("[calculateRefValueRegression] InputData.z : ",InputData.z.length); 

          // InputData = convertArrayForm(filteredData);
          // console.log("[calculateRefValueRegression] data_x : ",InputData.x.length);
          // console.log("[calculateRefValueRegression] data_y : ",InputData.y.length);
          // console.log("[calculateRefValueRegression] data_z : ",InputData.z.length);
          // InputData.x = filterUnusualValue2(InputData.x);
          // InputData.y = filterUnusualValue2(InputData.y);
          // InputData.z = filterUnusualValue2(InputData.z);
          // console.log("[calculateRefValueRegression] filtered_x : ",InputData.x.length);
          // console.log("[calculateRefValueRegression] filtered_y : ",InputData.y.length);
          // console.log("[calculateRefValueRegression] filtered_z : ",InputData.z.length);
           callback();
        }
      });
    },
    regressionPolynomial: function(callback) {
      let response = {};
      const OPTION = {order: 2, precision: 3};
      const result_x = regression.polynomial(InputData.x, OPTION);
      const result_y = regression.polynomial(InputData.y, OPTION);
      const result_z = regression.polynomial(InputData.z, OPTION);
      response.x_temp_weight_const = result_x.equation[2];
      response.y_temp_weight_const = result_y.equation[2];
      response.z_temp_weight_const = result_z.equation[2];
      response.x_temp_weight = result_x.equation[1];
      response.y_temp_weight = result_y.equation[1];
      response.z_temp_weight = result_z.equation[1];
      response.x_temp_weight_order2 = result_x.equation[0];  
      response.y_temp_weight_order2 = result_y.equation[0]; 
      response.z_temp_weight_order2 = result_z.equation[0];
      if(result_x.r2) response.x_r2 = result_x.r2;
      if(result_y.r2) response.y_r2 = result_y.r2;
      if(result_z.r2) response.z_r2 = result_z.r2;
      // console.log("[calculateRefValueRegression] InputData.x : ",InputData.x);
      // console.log("[calculateRefValueRegression] InputData.y : ",InputData.y);
      // console.log("[calculateRefValueRegression] InputData.z : ",InputData.z);
      console.log("[calculateRefValueRegression] response : ",response);
      regressionResult = response;
      callback();
    },
    updateRegression: function(callback) {
      approvedDeviceModel.findOneAndUpdate({'nodeId': nodeId, 'valid': true},
      {$set: regressionResult, $inc: {'timesOfupdateRegression': 1}}, {new: true}, 
      function(err, result) {
        if (err) return cb(err, null);
        if (!result){
          console.log("[updateRegression] No update result.");
          return cb("No update result.", null); 
        }   
        updateResult = result;
        //console.log("[updateRegression] result: ", updateResult);
        callback();
      });
    }
  }, function(err, results) {
    if (err) {
      cb(err, null);
    } 
    cb(null, updateResult);
  });
}
function filterUnusualValue(data){
  let sum = 0;
  let avg = 0;
  let result = [];

  for(let i in data){
    //console.log("[calculateRefValueRegression] data[i] : ",data[i]);
    //console.log("[calculateRefValueRegression] squareSqrtValue: ",squareSqrtValue(data[i].xValue, data[i].yValue, data[i].zValue) );
    sum = sum + squareSqrtValue(data[i].xValue, data[i].yValue, data[i].zValue); 
  }
  avg = sum / data.length;
  console.log("[calculateRefValueRegression] avg : ",avg);
  for(let k in data){
   
    let ratio = squareSqrtValue(data[k].xValue, data[k].yValue, data[k].zValue)/avg; 
    if (ratio<2 && ratio>0.1 && data[k].temperature<100){
      result.push(data[k]);
    }else{
      console.log("[calculateRefValueRegression] squareSqrtValue : ",squareSqrtValue(data[k].xValue, data[k].yValue, data[k].zValue));
    }
  }
  return result;
  function squareSqrtValue(x, y, z){
    return Math.sqrt(Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)); 
  }
}
function filterUnusualValue2(data){
  let sum = 0;
  let avg = 0;
  let result = [];

  for(let i in data){
    //console.log("[calculateRefValueRegression] data[i][1] : ",data[i][1]);
    //console.log("[calculateRefValueRegression] squareSqrtValue: ",squareSqrtValue(data[i].xValue, data[i].yValue, data[i].zValue) );
    sum += Number(data[i][1]); 
  }
  avg = sum / data.length;
  console.log("[calculateRefValueRegression] sum : ",sum);
  console.log("[calculateRefValueRegression] avg : ",avg);
  for(let k in data){
   
    let ratio =  Number(data[k][1])/avg; 
    //console.log("[calculateRefValueRegression] ratio : ",ratio);
    //console.log("[calculateRefValueRegression] ratio : ",ratio);
    if (ratio<2 && ratio>0.5 && Number(data[k][0])<100){
      //console.log("[calculateRefValueRegression] data[k] : ",data[k]);
      result.push(data[k]);
    }
  }
  return result;
}

function convertArrayForm(data){
  let res = {'x':[],'y':[],'z':[]};
  for(let i in data){
    res.x.push([Number(data[i].temperature), Number(data[i].xValue)]);
    res.y.push([Number(data[i].temperature), Number(data[i].yValue)]);
    res.z.push([Number(data[i].temperature), Number(data[i].zValue)]);
  }
  return res;
}


function calculatePowerLevel(DAC){
  const kx = 0.4797;
  const k = 7.1447;
  return kx*DAC + k;
}

function calculatePowerLevel_type2(DAC){
  const k = 10;
  return DAC/k;
}

function checkIsOneTime(rawWeekdaysSetting){
  if (rawWeekdaysSetting.charAt(0) == "1"){
    return "0";
  }
  return "1";
}

function getSelectWeekDays(rawWeekdaysSetting){
  let selectWeekDays = [];
  for(let i=1; i<8; i++){
    if (rawWeekdaysSetting.charAt(i) == "1"){
      selectWeekDays.push("0"+i.toString());
    }
  }
  return selectWeekDays;
}

function setDeviceTime(time){
  return moment().set({
    'year'  : "20"+time.year, 
    'month' : time.month-1,
    'date'  : time.day,
    'hour'  : time.hour,
    'minute': time.min,
    'second': time.sec,
    'millisecond': 0
  });
}

function checkIsRTCClock(value){
  if (value == "01"){
    return "1";
  }
  return "0";
}

function Hex2Int(str, startChar, endChar){
return parseInt(str.slice(startChar, endChar), 16)
}

function hex2Ascii(hex){
  let hexStr  = hex.toString();
  let str = '';
  for (var n = 0; n < hexStr.length; n += 2) {
    str += String.fromCharCode(parseInt(hexStr.substr(n, 2), 16));
  }
  return str;
}

function bin2Hex(binStr){
  let hexStr = parseInt(binStr, 2).toString(16);
  return hexStr.length<2? "0"+String(hexStr): String(hexStr);
}

function hex2Bin(hexStr){
  let binStr = parseInt(hexStr, 16).toString(2);
  let str = "0";
  return str.repeat(8-binStr.length) + binStr;
}
