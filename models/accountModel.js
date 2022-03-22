import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import {uuidv4, hashString, hashPassword} from '../utils/stringUtil';
import UserType from './type/UserType';

let UnnameModel = new BaseModel({
	// 帳號
	account: {
		type: String,
		index: {unique: true, dropDups: true},
		maxlength: [64, '帳號資料長度({VALUE})不符'],
		minlength: [3, '帳號資料長度({VALUE})不符'],
		required: [true, '帳號為必填欄位'],
		lowercase: true,
		trim: true,
	},
	// 密碼
	password: {
		type: String,
		maxlength: [64, '密碼資料長度({VALUE})不符'],
		minlength: [5, '密碼資料長度({VALUE})不符'],
		required: [true, '密碼為必填欄位'],
	},
	// password HASH加鹽
	salt: String,
	// 用戶類型: 員工、客人
	userType: {
		type: String,
		enum: UserType.toValues(),
	},
}, {
		'versionKey': false,
		'collection': 'Account',
});
UnnameModel.pre('save', function(next) {
	if (!this.salt) {
		this.salt = uuidv4();
		this.password = hashPassword(this.password, this.salt, this.account, true);
	}
	next();
});
UnnameModel.index({account: 1});
module.exports = mongoose.model('Account', UnnameModel);