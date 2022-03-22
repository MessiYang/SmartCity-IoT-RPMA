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
	// tag desc
	desc: {
		type: String,
		maxlength: [255, '描述資料長度({VALUE})不符'],
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
	}
}, {
		'versionKey': false,
		'collection': 'Tag',
}, { 'minimize': false, 
});


module.exports = mongoose.model('Tag', UnnameModel);