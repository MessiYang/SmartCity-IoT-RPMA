import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import DeviceStatusType from './type/DeviceStatusType';
import DeviceType from './type/DeviceType';
import DeviceFunctionType from './type/DeviceFunctionType';

let UnnameModel = new BaseModel({
	// device ID
	nodeId: {
		type: String,
		required: [true, 'nodeId為必填欄位'],
		index: {unique: true, dropDups: true},
	},
	// messageId id
	messageId: {
		type: String,
	},
  // latest raw data source host name
  hostName:{
    type: String,
    index: true
  },
  // latest raw data source user name
  userName:{
    type: String,
    index: true
  },
	// tag _id
	tagId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Tag',
		index: true,
	},
	// 種類
	messageType: {
		type: String,
	},
	// 應用 ID
	applicationId: {
		type: String,
	},
    
  deviceType: {
    type: String,
    enum: DeviceType.toValues(),
    //default: DeviceType.PARKINGSENSOR.value,
  },
  //裝置特例功能類型
  deviceFunctionType: {
    type: String,
    enum: DeviceFunctionType.toValues(),
    //default: DeviceType.PARKINGSENSOR.value,
  },
	// device name
	name: {
		type: String,
		maxlength: [64, '名稱資料長度({VALUE})不符'],
	},
	// device desc
	desc: {
		type: String,
		maxlength: [255, '描述資料長度({VALUE})不符'],
	},
	// devicePayloadId
	devicePayloadId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'DevicePayload',
		index: true,
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
	// 經度
	longitude: Number,
	// 緯度
	latitude: Number,
	// device status
	deviceStatus: {
		type: String,
		enum: DeviceStatusType.toValues(),
		default: DeviceStatusType.NORMAL.value,
	},
	// onlineStatus: 0=online, 1=offline
	onlineStatus: {
		type: String,
		default: '0',
	},
	// device health status
	lastHeartBeatTime: {
		type: Date,
		default: new Date(),
	},
	// battery voltage(V)
	batteryVoltage: {
		type: Number,
		default: 3.6,
	},
	// temperature(°C)
	temperature: {
		type: Number,
		//default: 0,
	},
	// humidity(%)
	humidity: {
		type: Number,
		//default: 0,
	},
	//----Parking---------------------------------------
	//停車費率  (per hour)
	parkingFeeCost:{
    type: Number,
    default: 0
  },
	// parkingFeeStandard _id
	parkingFeeStandardId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'ParkingFeeStandard',
		index: true,
	},
	// parking detect: 0=non-occupancy, 1=occupancy
	parkingDetect: {
		type: String,
		default: "0"
	},
	// move detect: 0=stop, 1=move
	moveDetect: {
		type: String,
		default: '0',
	},
  smithZoneButtom: {
    type: Number,
    default: 90
  },
  smithZoneTop: {
    type: Number,
    default: 150
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
  xWeight: {
    type: Number,
    default: 1
  },
  yWeight: {
    type: Number,
    default: 1
  },
  zWeight: {
    type: Number,
    default: 1
  },
	refValue: {
		type: Number,
		default: 0
	},
	x_temp_weight_const: {
		type: Number
	},
	y_temp_weight_const: {
		type: Number
	},
	z_temp_weight_const: {
		type: Number
	},
	x_temp_weight: {
		type: Number
	},
	y_temp_weight: {
		type: Number
	},
	z_temp_weight: {
		type: Number
	},
	x_temp_weight_order2: {
		type: Number
	},
	y_temp_weight_order2: {
		type: Number
	},
	z_temp_weight_order2: {
		type: Number
	},
	ref_temp: {
		type: Number
	},
	//coefficient of determination (R2)
	x_r2: { 
		type: Number
	},
	y_r2: { 
		type: Number
	},
	z_r2: { 
		type: Number
	},
	timesOfupdateRegression:{
		type: Number,
		default: 0
	},
  // latest parkingDetect "0" to "1"
  lastStartParkingTime: {
    type: Date,
  },
  // latest parkingDetect "1" to "0"
  lastEndParkingTime: {
    type: Date,
  },
	//----Airbox----------------------------------------
	// pm25(ug/m3)
	pm25: {
		type: Number,
		//default: 0,
	},
	// CH2O(ppm)
	ch2o: {
		type: Number,
		//default: 0,
	},
	// CO2(ppm)
	co2: {
		type: Number,
		//default: 0,
	},
	// CO(ppm)
	co: {
		type: Number,
		//default: 0,
	},
	// for PIR (Motion) Sensor: 0=PIR Non Trigged, 1=PIR Trigged
	motionState: {
		type: String,
		//default: '0',
	},
	// for Smoke Sensor: 0=Normal, 1=Smoke Alarm, 2=Tamper Alarm
	smokeState: {
		type: String,
		//default: '0',
	},
	// for Gas Sensor: 0=Normal, 1=Gas Alarm
	gasState: {
		type: String,
		//default: '0',
	},
	// for Siren Sensor: 0=Alarm off, 1=Alarm on
	sirenState: {
		type: String,
		//default: '0',
	},
//--------------------SmartLamp------------------
  onOff:{
    type: String
  },
  pwm:{
    type: Number
  },
  tag:{
    type: String
  },
  lightValue: {
		type: Number,
	},
  // temperature
	// humidity
	powerLevelFactor:{  //功率的矯正係數
    type: Number
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
//--------------------Group Setting------------------
  //城市
  countyId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'County',
		index: true,
	},
	//大區
  districtId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'District',
		index: true,
	}, 
	//小區或里
  villageId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Village',
		index: true,
	},
	//設施或路段
	geotagId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'GeoTag',
		index: true,
	},
//--------------------GPS tracker------------------	
	trackerData:{   //tracker data
    type: Number,
  },
}, {
		'versionKey': false,
		'collection': 'ApprovedDevice',
}, { 'minimize': false, 
});

UnnameModel.index({nodeId: 1});

module.exports = mongoose.model('ApprovedDevice', UnnameModel);
