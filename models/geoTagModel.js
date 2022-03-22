import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import TagType from './type/TagType';

let UnnameModel = new BaseModel({
	// 種類
	tagType: {
		type: String,
		enum: TagType.toValues(),
	},
	// devices zone 座標
	devicesZone: {
		type: Object
	},
	// tag name
	name: {
		type: String,
		maxlength: [64, '名稱資料長度({VALUE})不符'],
	},
	name_en: {
		type: String,
		maxlength: [64, '名稱資料長度({VALUE})不符'],
	},	
	// tag desc
	desc: {
		type: String,
		maxlength: [255, '描述資料長度({VALUE})不符'],
	},
	villageId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Village',
		index: true,
	},
//--------------------SmartLamp------------------
  onOff:{
    type: String
  },
  pwm:{
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
//--------------------SmartLamp------------------

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
	}
}, {
		'versionKey': false,
		'collection': 'GeoTag',
}, { 'minimize': false, 
});
delete mongoose.connection.models['GeoTag'];
module.exports = mongoose.model('GeoTag', UnnameModel);