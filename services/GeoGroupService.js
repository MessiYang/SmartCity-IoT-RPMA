import mongoose from 'mongoose';
import geoTz from 'geo-tz';
import momentTz from 'moment-timezone';
import config from 'nconf';
import approvedDeviceModel from '../models/approvedDeviceModel';
import VillageModel from '../models/villageModel';
import DistrictModel from '../models/districtModel';
import CountyModel from '../models/countyModel';
import GeoTagModel from '../models/geoTagModel';

let {Types: {ObjectId}} = mongoose;
const SELECT = '-__target -__targetVer -valid -levelOneId';
const SELECT_POPULATE = '-__target -__targetVer -valid -levelOneId -createTime -modifyTime';

const target = config.get('EXECUTE_TARGET');
const {DASBOARD_LANGUAGE_EN} = config.get(target);

export function getTimeZone(bean, cb){
  let {input, output} = bean;
  let data = {};
  data.timeZone = geoTz(input.latitude, input.longitude);

  data.UTCData = momentTz.tz(data.timeZone).format('Z z');
  data.localTime = momentTz.tz(data.timeZone).format();
  data.UTCOffset = momentTz.tz(data.timeZone).utcOffset();

  input.results = data;
  return cb && cb(null);
}

export function getCounty(bean, req, cb) {
  let {input, output} = bean;
  let where = intialUserQuery(req.body.user);
  CountyModel.find(where)
  .select(SELECT)
  .exec((err, data)=>{
 	  if (err) return cb && cb(err);
    input.results = changeDisplayLanguage(data);
    return cb && cb(null);
  });
}

export function getDistrict(bean, req, cb) {
  let {input, output} = bean;
  let where = intialUserQuery(req.body.user);
  if (input.countyId) {
  	where['countyId'] = input.countyId;
  }
  DistrictModel.find(where)
  .populate({
    path: 'countyId',
    match: {'valid': true},
    select: SELECT_POPULATE
  })
  .select(SELECT)
  .exec((err, data)=>{
 	  if (err) return cb && cb(err);
    input.results = changeDisplayLanguage(data);
    return cb && cb(null);
  });
}

export function getVillage(bean, req, cb) {
  let {input, output} = bean;
  let where = intialUserQuery(req.body.user);
  if (input.districtId) {
  	where['districtId'] = input.districtId;
  }
  VillageModel.find(where)
  .populate({
    path: 'districtId',
    match: {'valid': true},
    select: SELECT_POPULATE
  })
  .select(SELECT)
  // .sort("-modifyTime")
  //.limit((bean.counts > 10000) ? 10000 : bean.counts)
  .exec((err, data)=>{
 	  if (err) return cb && cb(err);
    input.results = changeDisplayLanguage(data);
    return cb && cb(null);
  });
}
export function createVillage(bean, req, cb) {
  let {input, output} = bean;
  bean.input = setUserCode(bean.input, req.body.user);
	console.log('[createVillage] bean.input:',bean.input)
	let db = new VillageModel(bean.input);
	db.save((err, result)=>{
		if (err) {
			return cb && cb(err);
		} else if (!result) {
			return cb && cb({name: 'CreateError'});
		} else {
			console.log('[createVillage] result:',result)
			input.results = result;
			return cb && cb(null);
		}
	});
}
export function updateVillage(bean, req, cb) {
  let {input, output} = bean;
	console.log('[updateVillage] bean.input:',bean.input)
	VillageModel.findOneAndUpdate({'_id': input._id, 'valid': true },
	{$set: input },{new: true },(err, result)=>{
		if (err) {
			return cb && cb(err);
		} else if (!result) {
			return cb && cb({name: 'DataNotFound'});
		} else {
			console.log('[updateVillage] result:',result)
			input.results = result;
			return cb && cb(null);
		}
	});
}

export function getGeoTag(bean, req, cb) {
  let {input, output} = bean;
  let where = intialUserQuery(req.body.user);
  if (input.villageId) {
  	where['villageId'] = input.villageId;
  }
  if (input.tagType){
    where['tagType'] = input.tagType;
  }else{
    where['tagType'] = null;
  }
  GeoTagModel.find(where)
  .populate({
    path: 'villageId',
    match: {'valid': true},
    select: SELECT_POPULATE
  })
  .select(SELECT)
  .exec((err, data)=>{
 	  if (err) return cb && cb(err);
    input.results = changeDisplayLanguage(data);
    return cb && cb(null);
  });
}
export function createGeoTag(bean, req, cb) {
  let {input, output} = bean;
  bean.input = setUserCode(bean.input, req.body.user);
	console.log('[createGeoTag] bean.input:',bean.input)
	let db = new GeoTagModel(bean.input);
  db.save((err, result)=>{
		if (err) {
			return cb && cb(err);
		} else if (!result) {
			return cb && cb({name: 'CreateError'});
		} else {
			console.log('[createGeoTag] result:',result)
			input.results = result;
			return cb && cb(null);
		}
	});
}
export function updateGeoTag(bean, req, cb) {
  let {input, output} = bean;
	console.log('[updateVillage] bean.input:',bean.input)
	GeoTagModel.findOneAndUpdate({'_id': input._id, 'valid': true },
	{$set: input },{new: true },(err, result)=>{
		if (err) {
			return cb && cb(err);
		} else if (!result) {
			return cb && cb({name: 'DataNotFound'});
		} else {
			console.log('[updateGeoTag] result:',result)
			input.results = result;
			return cb && cb(null);
		}
	});
}

export function setDevicesGroup(bean, req, cb) {
  let {input, output} = bean;
  let updateData = {
    'countyId': input.countyId,
    'districtId': input.districtId, 
    'villageId': input.villageId, 
    'geotagId': input.geotagId
  }
  if (input.longitude) updateData.longitude = input.longitude;
  if (input.latitude) updateData.latitude = input.latitude;
  console.log('[setDeviceGroup] bean.input:',bean.input)
  approvedDeviceModel.update({"valid": true, "nodeId": {$in: input.nodeId}},
  {$set: updateData}, {multi: true}, (err, result)=>{
    if (err) {
      return cb && cb(err);
    } else if (!result) {
      return cb && cb({name: 'DataNotFound'});
    } else {
      console.log('[setDeviceGroup] result:',result)
      input.results = result;
      return cb && cb(null);
    }
  });
}

function intialUserQuery(userData){
  let where = {
    'valid': true
  };
  //if (!userData.code || userData.code != 'compal_adm') {
  	where['levelOneId'] = ObjectId(userData.levelOneId);
  //}
  if (userData.levelTwoId) {
  	where['levelTwoId'] = ObjectId(userData.levelTwoId);
  }
  return where;
}

function setUserCode(input, userData){
  if (userData.levelOneId) {
    input.levelOneId = ObjectId(userData.levelOneId);
  }
  if (userData.levelTwoId) {
    input.levelTwoId = ObjectId(userData.levelTwoId);
  }
  return input;
}

function changeDisplayLanguage(data){
  if(DASBOARD_LANGUAGE_EN){
    data.forEach((ele, i)=>{
      if(ele.name_en) data[i].name = ele.name_en;
    });
  }
  return data
}