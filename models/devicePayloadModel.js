import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({
	// device ID
	nodeId: {
		type: String,
		required: [true, 'nodeId為必填欄位'],
		index: {unique: true, dropDups: true},
	},
	// function name of payload parser
	methodName: {
		type: String,
	},

}, {
		'versionKey': false,
		'collection': 'DevicePayload',
}, { 'minimize': false, 
});
UnnameModel.index({nodeId: 1});

module.exports = mongoose.model('DevicePayload', UnnameModel);
