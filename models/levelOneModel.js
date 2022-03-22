import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	// 代碼
	code: {
		type: String,
		lowercase: true,
	},
	// 簡稱
	displayname: {
		type: String,
		trim: true,
		maxlength: [64, '簡稱資料長度({VALUE})不符'],
		minlength: [1, '簡稱資料長度({VALUE})不符'],
		required: [true, '簡稱為必填欄位'],
	},
	// 全名
	fullname: {
		type: String,
		trim: true,
		maxlength: [64, '全名資料長度({VALUE})不符'],
		minlength: [1, '全名資料長度({VALUE})不符'],
		required: [true, '全名為必填欄位'],
	},
	// 電話
	phone: {
		type: String,
		trim: true,
		maxlength: [64, '電話資料長度({VALUE})不符'],
		minlength: [1, '電話資料長度({VALUE})不符'],
	},
	// 地址
	address: {
		type: String,
		trim: true,
		maxlength: [255, '地址已超出字數上限({MAXLENGTH})']
	},
	// 備註
	memo: {
		type: String,
		trim: true,
		maxlength: [255, '備註已超出字數上限({MAXLENGTH})']
	},
	// 經度
	longitude: Number,
	// 緯度
	latitude: Number,

}, {
	'versionKey': false,
	'collection': 'LevelOne',
});

module.exports = mongoose.model('LevelOne', UnnameModel);
