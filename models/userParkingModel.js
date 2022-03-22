import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import config from 'nconf';
import ParkingFeeStatusType from './type/ParkingFeeStatusType';

let UnnameModel = new BaseModel({
  // 商戶唯一訂單號
  outTradeId: {
    type: String,
    ref: 'AliyCallback',
    required: [true, 'nodeId為必填欄位'],
    index: {unique: true, dropDups: true},
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true,
  },
  approvedDeviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovedDevice',
    index: true,
  },
  carId: {
    type: String,
    //required: [true, 'carId 為必填欄位'],
  }, 
  // device ID
  nodeId: {
    type: String,
    required: [true, 'nodeId為必填欄位'],
    ref: 'ApprovedDevice',
    index: true,
  },
  startParkMessageId: {
    type: String,
    //required: [true, 'startParkMessageId 為必填欄位'],
  },
  endParkMessageId: {
    type: String
  },
  userStartParkTime: {
    type: Date,
    //required: [true, 'userStartParkTime 為必填欄位'],
  },
  userEndParkTime: {
    type: Date, 
  },
  deviceStartParkTime: {
    type: Date,
    //required: [true, 'userStartParkTime 為必填欄位'],
  },
  deviceEndParkTime: {
    type: Date, 
  },
  startParkTimeForFee: {
    type: Date,
    //required: [true, 'userStartParkTime 為必填欄位'],
  },
  endParkTimeForFee: {
    type: Date, 
  },
  //總停車時間
  sumParkingTime: {
    type: Number,
    default: 0
  },
  //總停車費 
  sumParkingFee: {
    type: Number,
    default: 0
  },
  //"0": 尚未結算ParkingTime "1":正常結算ParkingTime 
  parkingFeeStatus: {
    type: String,
    default: "0",
    enum: ParkingFeeStatusType.toValues(),
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
    'collection': 'userParking',
}, { 'minimize': false, 
});

module.exports = mongoose.model('userParking', UnnameModel);
