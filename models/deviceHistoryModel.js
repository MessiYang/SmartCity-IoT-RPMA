import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
//import CaseType from './type/CaseType';
import config from 'nconf';

let UnnameModel = new BaseModel({
  // id
  messageId: {
    type: String,
    //ref: 'Case',
    required: [true, 'messageId為必填欄位'],
    index: {unique: true, dropDups: true},
    index: true
  },
  // 種類
  messageType: {
    type: String,
    //enum: CaseType.toValues(),
    required: [true, 'messageType為必填欄位'],
  },
  // device ID
  nodeId: {
    type: String,
    required: [true, 'nodeId為必填欄位'],
    index: true
  },
  // 應用 ID
  applicationId: {
    type: String,
   // required: [true, 'applicationId為必填欄位'],
  },
  // device 量測時間
  timestamp: {
    type: Date,
    index: true,
    required: [true, 'timestamp為必填欄位'],
  },
  // device 量測值
  payload: {
    type: String,
   // required: [true, 'payload為必填欄位'],
  },
  //傳送資料後的回應紀錄 (datagramDownlinkResponse) 
  tag:{
    type: String,
  },
  //傳送資料後的回應紀錄 (datagramDownlinkResponse) 
  status:{
    type: String,
  },
  paramName:{
    type: String
  },
  paramValue:{
    type: String
  },
  // "0" new data, "1" payload had decoded. ,"2" decode have err. ,"3" no need decode.
  isDecoded:{
    type: String,
    default: "0",
    index: true
  },
  // raw data source host name
  hostName:{
    type: String,
    index: true
  },
  // raw data source user name
  userName:{
    type: String,
    index: true
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
    'collection': 'DeviceHistory',
}, { 'minimize': false, 
});
UnnameModel.index({messageId: 1});
module.exports = mongoose.model('DeviceHistory', UnnameModel);
