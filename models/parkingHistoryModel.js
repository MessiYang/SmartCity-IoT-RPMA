import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import config from 'nconf';

let UnnameModel = new BaseModel({
  // device ID
  nodeId: {
    type: String,
    required: [true, 'nodeId為必填欄位'],
  },
  //統計的時間
  parkingDate: {
    type: Date,
    required: [true, 'parkingDate 為必填欄位'],
  },
  //當日的統計停車時間 mins
  dailyParkingTime: {
    type: Number
  },
  //當日的統計停車次數(車離開車位) 
  dailyParkingCounts: {
    type: Number
  },
  // dailyParkingTime/dailyParkingCounts
  averageDailyParkingTime: {
    type: Number
  },

  // dailyParkingTime/24hrs
  dailyUsingRatio: {
    type: Number
  },
  //當日有無過夜停車
  haveOverNight: {
    type: Number,   //0:無過夜停車  1:有過夜停車
    default: 0
  },
  //統計的資料列筆
  parkingHistoryList:{
  	type: Object
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
    'collection': 'ParkingHistory',
}, { 'minimize': false, 
});

module.exports = mongoose.model('ParkingHistory', UnnameModel);