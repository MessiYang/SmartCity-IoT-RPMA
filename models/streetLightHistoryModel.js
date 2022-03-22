import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import config from 'nconf';

let UnnameModel = new BaseModel({
  // device ID
  nodeId: {
    type: String,
    ref: 'ApprovedDevice',
    required: [true, 'nodeId為必填欄位'],
  },
  //統計的時間
  statisticsDate: {
    type: Date,
    required: [true, 'statisticsDate 為必填欄位'],
  },
  //當日的統計開燈時間 mins
  dailyOpenTime: {
    type: Number
  },
  //當日的總用電量 kWh
  dailyPowerConsumption: {
    type: Number
  },
  //當日的開燈平均亮度 
  avgPWM: {
    type: Number
  }, 
  //當日的平均功率 
  avgPowerLevel: {
    type: Number
  },
  // dailyOpenTime/24hrs
  dailyOpenRatio: {
    type: Number
  },
  //當日有無過夜開燈
  haveOverNight: {
    type: Number,   //0:無過夜  1:有過夜
    default: 0
  },
  //統計的資料列筆
  openHistoryList: [{
    _id: false, 
    hour:{
      type: Number,
    },
    start:{   
      type: Date,
    },  
    end:{
      type: Date,
    }, 
    timePeriod:{
      type: Number,
    },  
    pwm:{
      type: Number,
    },    
    pwmTimeValue:{ //PWM * OpenTime
      type: Number,
    }, 
    powerLevel:{  //W
      type: Number,
    }, 
    lightValue:{  //環境亮度
      type: Number,
    },
    powerConsumption: {
      type: Number
    },
    startMessageId:{  
      type: String,
    },
    endMessageId:{  
      type: String,
    }
  }],
  controlTimeList:[{
    _id: false, 
    time:{   
      type: Date,
    },   
    onOff:{   
      type: String,
    },   
    pwm:{   
      type: Number,
    },  
    powerLevel:{  //W
      type: Number,
    }, 
  }]
}, {
    'versionKey': false,
    'collection': 'SreetLightHistory',
}, { 'minimize': false, 
});

module.exports = mongoose.model('SreetLightHistory', UnnameModel);