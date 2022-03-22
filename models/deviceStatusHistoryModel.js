import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import LightEventType from './type/LightEventType';
import config from 'nconf';

let UnnameModel = new BaseModel({
  // device ID
  nodeId: {
    type: String,
    required: [true, 'nodeId為必填欄位'],
    index: true
  },
  messageId: {
    type: String,
    //ref: 'Case',
    required: [true, 'messageId為必填欄位'],
    index: true
  },
  // 種類
  messageType: {
    type: String,
    //enum: CaseType.toValues(),
    required: [true, 'messageType為必填欄位'],
  },
  // 應用 ID
  applicationId: {
    type: String
    //required: [true, 'applicationId為必填欄位'],
  },
  // device 量測時間
  timestamp: {
    type: Date,
    required: [true, 'timestamp為必填欄位'],
  },
  // device 量測值
  payload: {
    type: String
   //required: [true, 'payload為必填欄位'],
  },
  basicData: {
    type: String
  },
  tranmissionCounter: {
    type: String
  },
  batteryVoltage: {
    type: Number
  },
  installStates: {
    type: String
  },
  temperature: {
    type: String
  },
  xValue: {
    type: String
  },
  yValue: {
    type: String
  },
  zValue: {
    type: String
  },
  ref_xValue: {
    type: Number,
    default: 0
  },
  ref_yValue: {
    type: Number,
    default: 0
  },
  ref_zValue: {
    type: Number,
    default: 0
  },
  ref_xValue_tempWeighted: {
    type: Number,
    default: 0
  },
  ref_yValue_tempWeighted: {
    type: Number,
    default: 0
  },
  ref_zValue_tempWeighted: {
    type: Number,
    default: 0
  },
  refValue: {
    type: Number,
    default: 0
  },
  parkingDetect: {
    type: String
  },
  moveDetect: {
    type: String
  },
  airSensorType: {
    type: String
  },
  humidity: {
    type: String
  },
  PM25_Value: {
    type: String
  },
  CH2O_Value: {
    type: String
  },
  CO2_Value: {
    type: String
  },
  CO_Value: {
    type: String
  },
  motionState: {
    type: String
  },
  smokeState: {
    type: String
  },
  gasState: {
    type: String
  },
  sirenState: {
    type: String
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
//----SmartLamp----------------------------------------
  eventType:{
    type: String,
    enum: LightEventType.toValues()
  },
  onOff:{
    type: String
  },
  pwm:{
    type: Number
  },
  tag:{
    type: String
  },
  power:{
    type: Number
  },
  lightValue: {
    type: Number,
  },
  powerLevel:{  //W
    type: Number
  },
  RTCSetting:[{
    _id: false, 
    year:{   //2018 => 18
      type: String,
    },  
    month:{
      type: String,
    },  
    day:{
      type: String,
    },    
    hour:{  //00~24
      type: String,
    }, 
    min:{  //00~59
      type: String,
    }, 
    isOneTime:{  // weekly schedule,  "1":只持行一次, "0":每周重複
      type: String,
    },
    selectWeekDays:{  //ex: ["01","02","04","05","07"]   01(MON)~07(SUN)
      type: Array,
    },
    pwm:{  //RTC setting pwm
      type: Number
    },
    onOff:{  //RTC setting onOff
      type: String
    }
  }],
  isRTCClock:{  // clock source,  "1":RTC, "0":system clock
    type: String,
  },
  heartBeatRate:{   //send heartbeat one time per mins 
    type: Number,
  },
  deviceTime:{   //device timestamp
    type: Date,
  },  
//--------------------GPS tracker------------------   
  // 經度
  longitude: Number,
  // 緯度
  latitude: Number,
  //tracker data
  trackerData:{  
    type: Number,
  },
}, {
    'versionKey': false,
    'collection': 'DeviceStatusHistory',
}, { 'minimize': false, 
});

module.exports = mongoose.model('DeviceStatusHistory', UnnameModel);
