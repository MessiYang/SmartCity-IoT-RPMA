import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import {employee as EmployeeType} from './type/RoleType';

let UnnameModel = new BaseModel({
	code: String,
	// 姓名
	name: {
		type: String,
		index: true,
		trim: true,
		maxlength: [64, '姓名資料長度({VALUE})不符'],
		minlength: [1, '姓名資料長度({VALUE})不符'],
		required: [true, '姓名為必填欄位'],
	},
	// 手機門號
	mobile: {
		type: String,
		index: true,
		trim: true,
		maxlength: [16, '手機號碼資料長度({VALUE})不符'],
		minlength: [9, '手機號碼資料長度({VALUE})不符'],
	},
	// 授權角色--可複選
	role: [{
		type: Number,
		enum: EmployeeType.toValues(),
	}],
	// accountId
	accountId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Account',
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

}, {
	'versionKey': false,
	'collection': 'Employee',
});

module.exports = mongoose.model('Employee', UnnameModel);
