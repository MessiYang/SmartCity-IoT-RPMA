import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	name: {
		type: String,
		maxlength: [64, '名稱資料長度({VALUE})不符'],
	},
	name_en: {
		type: String,
		maxlength: [64, '名稱資料長度({VALUE})不符'],
	},	
	desc: {
		type: String,
		maxlength: [255, '描述資料長度({VALUE})不符'],
	},
	districtId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'District',
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
	}
}, {
		'versionKey': false,
		'collection': 'Village',
}, { 'minimize': false, 
});


module.exports = mongoose.model('Village', UnnameModel);