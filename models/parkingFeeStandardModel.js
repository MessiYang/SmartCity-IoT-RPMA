import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import ParkingChargeType from './type/ParkingChargeType';

let UnnameModel = new BaseModel({
  desc: {
    type: String
  },
  chargeType: {
    type: String,
    enum: ParkingChargeType.toValues(),
  },
  //按次數收費 每次的費用
  // costPerTime: {
  //   type: Number,
  //   // default: 0
  // },
  //按階梯(表格)收費 表格
  // chargeTable: [{
  //   _id: false,
  //   costPerHour: {
  //     type: Number,
  //     // default: 0
  //   },
  // }],
  //前N分鐘
  firstNMinsTime:{
    type: Number
  },  
  //前N分收費_工作日
  firstNMinsCharge_workDay:{
    type: Number
  },
  //前N分收費_假日
  firstNMinsCharge_holiday:{
    type: Number
  },
  //前N分收費_不分工作或假日
  firstNMinsCharge_allDay:{
    type: Number
  },
  //每日的計算時段_工作日
  time_workDay: [{
    _id: false,
    startTime: {
      type: Number,
      max: [24, '最大({VALUE})不符'],
      min: [0, '最小({VALUE})不符'],
    },
    endTime: {
      type: Number,
      max: [24, '最大({VALUE})不符'],
      min: [0, '最小({VALUE})不符'],
    },
    //按次數收費 每次的費用
    costPerTime: {
      type: Number,
      // default: 0
    },
    //第1小時內_免費時間(min) 例如: firstHr_freeTime=15 前15mins停車免費
    firstHr_freeTime: {
      type: Number,
      // default: 0
    },
    //第1小時內_最小單位時間(min) 例如: firstHr_minTimeUnit=60 一小時為最小收費標準
    firstHr_minTimeUnit: {
      type: Number,
      // default: 60
    },
    //第1小時內_每單位時間收費價格 例如: firstHr_minTimeUnit=30  firstHr_costOfPerTimeUnit=10, 則 20RMB per hour
    firstHr_costOfPerTimeUnit: {
      type: Number,
    },
    // 最小單位時間(min) 例如: minTimeUnit=30 半小時為最小收費標準
    minTimeUnit: {
      type: Number,
      //required: [true, 'minTimeUnit為必填欄位'],
    },
    //每單位時間收費價格 例如: minTimeUnit=60  firstHr_costOfPerTimeUnit=15, 則 15RMB per hour
    costOfPerTimeUnit: {
      type: Number,
      //required: [true, 'costOfPerTimeUnit為必填欄位'],
    },
    //每日最高上限收費
    dailyMaxLimit: {
      type: Number,
    }
  }],
  //每日的計算時段_假日
  time_holiday: [{
    _id: false,    
    startTime: {
      type: Number,
      max: [24, '最大({VALUE})不符'],
      min: [0, '最小({VALUE})不符'],
    },
    endTime: {
      type: Number,
      max: [24, '最大({VALUE})不符'],
      min: [0, '最小({VALUE})不符'],
    },
    //按次數收費 每次的費用
    costPerTime: {
      type: Number,
      // default: 0
    },    
    //第1小時內_免費時間(min) 例如: firstHr_freeTime=15 前15mins停車免費
    firstHr_freeTime: {
      type: Number,
      // default: 0
    },
    //第1小時內_最小單位時間(min) 例如: firstHr_minTimeUnit=60 一小時為最小收費標準
    firstHr_minTimeUnit: {
      type: Number,
      // default: 60
    },
    //第1小時內_每單位時間收費價格 例如: firstHr_minTimeUnit=30  firstHr_costOfPerTimeUnit=10, 則 20RMB per hour
    firstHr_costOfPerTimeUnit: {
      type: Number,
    },
    // 最小單位時間(min) 例如: minTimeUnit=30 半小時為最小收費標準
    minTimeUnit: {
      type: Number,
      //required: [true, 'minTimeUnit為必填欄位'],
    },
    //每單位時間收費價格 例如: minTimeUnit=60  firstHr_costOfPerTimeUnit=15, 則 15RMB per hour
    costOfPerTimeUnit: {
      type: Number,
      //required: [true, 'costOfPerTimeUnit為必填欄位'],
    },
    //每日最高上限收費
    dailyMaxLimit: {
      type: Number,
    }
  }],
  //每日的計算時段_不分工作或假日
  time_allDay: [{
    _id: false,
    startTime: {
      type: Number,
      max: [24, '最大({VALUE})不符'],
      min: [0, '最小({VALUE})不符'],
    },
    endTime: {
      type: Number,
      max: [24, '最大({VALUE})不符'],
      min: [0, '最小({VALUE})不符'],
    },
    //按次數收費 每次的費用
    costPerTime: {
      type: Number,
      // default: 0
    },    
    //第1小時內_免費時間(min) 例如: firstHr_freeTime=15 前15mins停車免費
    firstHr_freeTime: {
      type: Number,
      // default: 0
    },
    //第1小時內_最小單位時間(min) 例如: firstHr_minTimeUnit=60 一小時為最小收費標準
    firstHr_minTimeUnit: {
      type: Number,
      // default: 60
    },
    //第1小時內_每單位時間收費價格 例如: firstHr_minTimeUnit=30  firstHr_costOfPerTimeUnit=10, 則 20RMB per hour
    firstHr_costOfPerTimeUnit: {
      type: Number,
    },
    // 最小單位時間(min) 例如: minTimeUnit=30 半小時為最小收費標準
    minTimeUnit: {
      type: Number
      //required: [true, 'minTimeUnit為必填欄位'],
    },
    //每單位時間收費價格 例如: minTimeUnit=60  firstHr_costOfPerTimeUnit=15, 則 15RMB per hour
    costOfPerTimeUnit: {
      type: Number
      //required: [true, 'costOfPerTimeUnit為必填欄位'],
    },
    //每日最高上限收費
    dailyMaxLimit: {
      type: Number
    }
  }],
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
  'collection': 'ParkingFeeStandard',
});
delete mongoose.connection.models['ParkingFeeStandard'];

module.exports = mongoose.model('ParkingFeeStandard', UnnameModel);