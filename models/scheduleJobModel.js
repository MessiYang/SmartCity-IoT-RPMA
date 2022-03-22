import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';


let UnnameModel = new BaseModel({
	jobName: {
		type: String
	},
	isJobRunning: {
		type: String
	},
	latestJobStartTime:{
		type: Date
	}

}, {
		'versionKey': false,
		'collection': 'ScheduleJob',
});
UnnameModel.index({jobName: 1});
module.exports = mongoose.model('ScheduleJob', UnnameModel);