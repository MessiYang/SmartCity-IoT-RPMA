import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
  desc: {
    type: String
  },
  //第1小時內_免費時間(min) 例如: firstHr_freeTime=15 前15mins停車免費
  firstHr_freeTime: {
    type: Number,
    default: 0
  },
  //第1小時內_最小單位時間(min) 例如: firstHr_minTimeUnit=60 一小時為最小收費標準
  firstHr_minTimeUnit: {
    type: Number,
    default: 60
  },
  //第1小時內_每單位時間收費價格 例如: firstHr_minTimeUnit=30  firstHr_costOfPerTimeUnit=10, 則 20RMB per hour
  firstHr_costOfPerTimeUnit: {
    type: Number,
  },
  // 最小單位時間(min) 例如: minTimeUnit=30 半小時為最小收費標準
  minTimeUnit: {
    type: Number,
    required: [true, 'minTimeUnit為必填欄位'],
  },
  //每單位時間收費價格 例如: minTimeUnit=60  firstHr_costOfPerTimeUnit=15, 則 15RMB per hour
  costOfPerTimeUnit: {
    type: Number,
    required: [true, 'costOfPerTimeUnit為必填欄位'],
  },
  //每日最高上限收費
  dailyMaxLimit: {
    type: Number,
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
    'collection': 'ParkingFeeType',
}, { 'minimize': false, 
});

module.exports = mongoose.model('ParkingFeeType', UnnameModel);