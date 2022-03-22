import async from 'async';
import moment from 'moment';
import UserParkingModel from '../models/userParkingModel';
import ApprovedDeviceModel from '../models/approvedDeviceModel';
import ParkingFeeStandardModel from '../models/parkingFeeStandardModel';


//create
export function createFeeStandard(bean, callback) {
	let {input, output} = bean;

	new ParkingFeeStandardModel(input).save((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'CreateError'});
		} else {
			input.parkingFeeStandard = result;
			return callback && callback(null);
		}
	});
}

export function setFeeStandard(bean, callback) {
	let {input, output} = bean;
	ApprovedDeviceModel.update({"nodeId": {"$in": input.nodeIdArray}},
  {$set: {"parkingFeeStandardId": input.parkingFeeStandardId}}, {multi: true}
  , (err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.data = result;
			return callback && callback(null);
		}
	});
}

export function list(bean, callback) {
	let {input, output} = bean;
	ParkingFeeStandardModel.find({
		'valid': true
	}).exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.data = result;
			return callback && callback(null);
		}
	});
}

//profile
export function profile(bean, callback) {
	let {input, output} = bean;
	ParkingFeeStandardModel.findOne({
		'_id': input._id,
		'valid': true,
	}).exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.data = result;
			return callback && callback(null);
		}
	});
}

export function update(bean, callback) {
	let {input, output} = bean;
	ParkingFeeStandardModel.findOneAndUpdate({'_id': input._id,'valid': true},
	input, {new: true}, (err, result) =>{
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.data = result;
			return callback && callback(null);
		}
	});
}

export function invalid(bean, callback) {
	let {input, output} = bean;
	let deleteData = {
		'valid': false
	}
	ParkingFeeStandardModel.findOneAndUpdate({'_id': input._id,'valid': true},
	deleteData, {new: true}, (err, result) =>{
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.data = result;
			return callback && callback(null);
		}
	});
}