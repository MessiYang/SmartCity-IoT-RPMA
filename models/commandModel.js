import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import config from 'nconf';
import LightEventType from './type/LightEventType';

let UnnameModel = new BaseModel({
  //command uuid
  tag: {
    type: String,
    required: [true, 'tag為必填欄位'],
    index: true,
  },
  // device ID
  nodeId: {
    type: String,
    required: [true, 'nodeId為必填欄位'],
    index: true,
  },
  // device 命令值
  payload: {
    type: String,
    required: [true, 'payload為必填欄位'],
  },
  statusCode:{
    type: String,
  },
  //傳送後回應紀錄中的status (datagramDownlinkResponse) 
  responseStatus:{
    type: String,
  },
  //傳送後回應紀錄有SUCCESS 則標記為"1" 
  isSuccess:{
    type: String,
    default: "0"
  },
  //--------------SmartLamp---------
  pwm:{
    type: Number,
  },
  onOff:{
    type: String,
  },
  eventType:{
    type: String,
    enum: LightEventType.toValues()
  },   
  //---set time---
  year:{   //2018 => 18
    type: String,
  },  
  month:{
    type: String,
  },  
  day:{
    type: String,
  },    
  dayOfWeek:{  //01(MON)~07(SUN)
    type: String,
  }, 
  hour:{  //00~24
    type: String,
  }, 
  min:{  //00~59
    type: String,
  }, 
  sec:{  //00~59
    type: String,
  }, 
  isOneTime:{  // weekly schedule,  "1":只持行一次, "0":每周重複
    type: String,
  },
  selectWeekDays:{  //ex: ["01","02","04","05","07"]   01(MON)~07(SUN)
    type: Array,
  }, 
  //RTC schedule index 00~07
  index:{  
    type: String,
  }, 
  startIndex:{  
    type: String,
  },
  endIndex:{  
    type: String,
  },  
  isWrite:{     // read or write heartbeat, "1":write, "0":read
    type: String,
  }, 
  isRTCClock:{  // clock source,  "1":RTC, "0":system clock
    type: String,
  },
  heartBeatRate:{   //send heartbeat one time per mins 
    type: String,
  }, 

  // levelOneId
  levelOneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LevelOne',
    index: true,
  },
  // levelTwoId
  levelTwoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LevelTwo',
    index: true,
  },
  // levelThreeId
  levelThreeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LevelThree',
    index: true,
  },
}, {
    'versionKey': false,
    'collection': 'Command',
}, { 'minimize': false, 
});

module.exports = mongoose.model('Command', UnnameModel);
