import async from 'async';
import approvedDeviceModel from '../models/approvedDeviceModel';
import DeviceType from '../models/type/DeviceType';
import LightEventType from '../models/type/LightEventType';

export function payloadEncode(nodeId, input, cb) {
  let decodeType = "0";
  let encodeResult;
  async.series({
    checkApprovedDevice: function(callback) {
      approvedDeviceModel.findOne({'nodeId': nodeId, 'valid': true}, 
      function(err, result) {
        if (!result || !result.deviceType){
          console.log('[checkApprovedDevice] It is not approved device!! nodeId:', nodeId);
          return cb(null, null);
        }else{
          decodeType = result.deviceType;
          callback();
        }
      });
    },
    encodeByType: function(callback) {
      switch(decodeType){
        case "0":
          callback();
        break;
        case DeviceType.SMARTLAMP.value:
          smartLampEncode(input, (err, result)=>{
          	if(err) return cb(err, null);
            encodeResult = result;
            callback();
          });
        break;
      }
    }
  }, function(err, results) {
    if (err) {
      cb(err, null);
    } 
    cb(null, encodeResult);
  });
}

// function smartLampEncode(input, cb){
// 	let payload = "0702FF"
// 	if (input.onOff && input.pwm) {
//     payload = payload.concat("01"); //eventType   
//     if(input.onOff == "1" ) {
//       payload = payload.concat("01"); 
//     }else{
//       payload = payload.concat("00");
//     } 
//     payload = payload.concat(dec2Hex(input.pwm)); //PWM 
// 	// }else if(input.pwm){
// 	// 	payload = payload.concat("02"); //eventType
//  //    payload = payload.concat("01"); //data
//  //    payload = payload.concat(encodePwm(input.pwm));
//   }else if(input.setTime == "1"){
//     payload = payload.concat("00"); //eventType

// 	}else if(input.reset == "1"){
// 		payload = payload.concat("00"); //eventType
//     payload = payload.concat("00"); //data
//     payload = payload.concat("00"); //value
// 	}else if(input.status == "1"){  //Ask device to report status
//     payload = payload.concat("FF"); //eventType
//     payload = payload.concat("00"); //data
//     payload = payload.concat("00"); //value
//   }else{
// 		cb("EncodeErr", null);
// 	}
//   payload = payload.concat("03");   //end
//   cb(null, payload);
// }

function smartLampEncode(input, cb){
  let payload = "02FF"
  if (!input.eventType) return cb("EncodeErr", null);
  payload = payload.concat(input.eventType); //eventType   
  switch(input.eventType){
    case LightEventType.RESET.value:    //00
      payload = payload.concat("0000"); // n/a 
      break;

    case LightEventType.CONTROL.value:  //01
      if(input.onOff == "1" ) {
        payload = payload.concat("01"); 
      }else{
        payload = payload.concat("00");
      } 
      payload = payload.concat(dec2Hex(input.pwm)); //PWM 
      break;

    case LightEventType.DIMMING.value:  //02
      payload = payload.concat("01"); //Channel
      payload = payload.concat(dec2Hex(input.pwm));
      break;

    case LightEventType.SETTIME.value:  //03
      payload = payload.concat((input.year).slice(2));
      payload = payload.concat(input.month);
      payload = payload.concat(input.day);
      payload = payload.concat(input.dayOfWeek); // 01(MON)~07(SUN)
      payload = payload.concat(input.hour); 
      payload = payload.concat(input.min); 
      payload = payload.concat(input.sec); 
      break;

    case LightEventType.RTCADD.value:  //04
      payload = payload.concat((input.year).slice(2));
      payload = payload.concat(input.month);
      payload = payload.concat(input.day);
      payload = payload.concat(encodeRTCDayOfWeek(input.isOneTime, input.selectWeekDays)); 
      payload = payload.concat(input.hour); 
      payload = payload.concat(input.min); 
      if(input.onOff == "1" ) {
        payload = payload.concat("01"); 
      }else{
        payload = payload.concat("00");
      } 
      payload = payload.concat(dec2Hex(input.pwm)); //PWM 
      payload = payload.concat(input.index); //index 
      break;

    case LightEventType.RTCDELETE.value: //05
      payload = payload.concat(input.startIndex); //start index 
      payload = payload.concat(input.endIndex);   //end index 
      break;

    case LightEventType.RTCREAD.value:  //06
      payload = payload.concat(input.startIndex); //start index 
      payload = payload.concat(input.endIndex);   //end index 
      break;

    case LightEventType.TIMEREAD.value: //07
      payload = payload.concat("0000"); // n/a 
      break;   

    case LightEventType.SETHEARTBEAT.value: //08
      if(input.isWrite == "1" ) {
        payload = payload.concat("01"); //write
      }else{
        payload = payload.concat("00"); //read
      }
      if(input.isRTCClock == "1" ) {
        payload = payload.concat("01"); //RTC
      }else{
        payload = payload.concat("00"); //System Clock
      }
      payload = payload.concat(dec2Hex(Number(input.heartBeatRate)/10)); //report one time per n*10 mins 
      break; 

    case LightEventType.STATUS.value:
      payload = payload.concat("0000"); // n/a 
      break;     

    default: 
      return cb("EncodeErr", null);
      break;
  }
  payload = payload.concat("03");   //end
  payload = dec2Hex((payload.length/2)+1).concat(payload); // TotalBytes
  payload = payload.toUpperCase();
  console.log('payload: ', payload);
  cb(null, payload);  
}

function encodeRTCDayOfWeek(isOneTime, selectWeekDays){
  console.log('[encodeRTCDayOfWeek] selectWeekDays: ', selectWeekDays);
  let binary = "";
  const WEEK = ["07", "06", "05", "04", "03", "02", "01"];
  if (isOneTime == "1"){
    binary = binary.concat("0"); 
  }else{
    binary = binary.concat("1"); 
  } 
  for(let key in WEEK){
    checkWeekDays(WEEK[key]);
  }
  console.log('[encodeRTCDayOfWeek] binary: ', binary);
  return bin2Hex(binary);

  function checkWeekDays(weekDays){
    if (selectWeekDays.includes(weekDays)){
      binary = binary.concat("1"); 
    }else{
      binary = binary.concat("0"); 
    }
  }
}


function encodePwm(percentage){
  let pwm64 = Math.round(0.64*percentage);
  return pwm64<10? "0"+String(pwm64): String(pwm64);
}

function bin2Hex(binStr){
  let hexStr = parseInt(binStr, 2).toString(16);
  return hexStr.length<2? "0"+String(hexStr): String(hexStr);
}

function dec2Hex(number){
  let hexStr = Number(number).toString(16);
  return hexStr.length<2? "0"+String(hexStr): String(hexStr);
}