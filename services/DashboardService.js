import async from 'async';
import i18next from 'i18next';
import moment from 'moment';
import logger from '../config/log';
import deviceHistoryModel from '../models/deviceHistoryModel';
import approvedDeviceModel from '../models/approvedDeviceModel';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import parkingHistoryModel from '../models/parkingHistoryModel';
import tagModel from '../models/tagModel';
import DeviceType from '../models/type/DeviceType';
import UserParkingModel from '../models/userParkingModel';
import ParkingHistoryModel from '../models/parkingHistoryModel';
import CustomerModel from '../models/customerModel'
import { demandStartTimeDate, getUTCOffsetMins} from '../utils/dateUtil';
import mongoose from 'mongoose';
let {Types: {ObjectId}} = mongoose;

const UTCOFFSET = getUTCOffsetMins()* 60 * 1000;

export function getParkingUsageRate(bean, req, cb) {
  let {input, output} = bean;
  let startTime = demandStartTimeDate( new Date(), input.range+1);
  console.log('startTime: ', startTime);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'nodeId': {'$in': input.approveNodeId},
      'parkingDate': {'$gte': startTime},
      'valid': true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$parkingDate',
      'avgDailyParkingCounts': {'$avg': '$dailyParkingCounts'},
      // 'list': {'$push': {
      //   'nodeId':'$nodeId', 
      //   'dailyUsingRatio': '$dailyUsingRatio',
      //   'dailyParkingTime': '$dailyParkingTime'
      // }},
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'avgDailyParkingCounts': 1,
      'LocalParkingDate': {'$add':['$_id', UTCOFFSET]},
    }
  });
  aggregateArray.push({
    $group: {
      '_id': { 
        dayOfWeek: {$dayOfWeek: "$LocalParkingDate"},
      },
      'avgParkingCounts': {'$avg': '$avgDailyParkingCounts'},
      'list': {'$push': {
        'date':'$_id',
        'avgDailyParkingCounts':'$avgDailyParkingCounts'
      }},
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'dayOfWeek': '$_id.dayOfWeek',
      'avgParkingCounts': 1
    }
  });
  aggregateArray.push({
    $sort: {
      'dayOfWeek': 1
    }
  });
  ParkingHistoryModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    }
    let sumParkingCounts = 0 ;
    for (let key in results){
      sumParkingCounts += results[key].avgParkingCounts;
    }
    let holidayParkingCounts = results[0].avgParkingCounts+results[6].avgParkingCounts;
    let weekdayParkingCounts = sumParkingCounts - holidayParkingCounts;
    
    input.usageRate = results;
    return cb && cb(null);
  });
}

export function getUserParkingSumData(bean, req, cb) {
  let {input, output} = bean;
  let startTime = demandStartTimeDate( new Date(), input.range);
  console.log('startTime: ', startTime);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'nodeId': {'$in': input.approveNodeId},
      'userStartParkTime': {'$gte': startTime},
      'valid': true,
    }
  });
  aggregateArray.push({
    $sort: {
      'endParkTimeForFee': 1
    }
  });
  aggregateArray.push({
    $lookup: {
     from: "ApprovedDevice",
     localField: "nodeId",
     foreignField: "nodeId",
     as: "nodeId_docs"
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$nodeId_docs',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': null,
      'parking_counts': {'$sum': 1},
      'totalChargeAmount': {'$sum': '$sumParkingFee'},
      'totalOrderCounts':{'$sum': 
        {$cond: {
        	if: {$gte: ['$endParkTimeForFee', startTime]}, 
          then: 1, 
          else: 0}}},
      
      'orderList': {'$push': {
        'parkingName':'$nodeId_docs.name', 
        'chargeAmount': '$sumParkingFee',
        'time': '$endParkTimeForFee'
      }},
    }
  });

  aggregateArray.push({
    $project: {
      '_id': 0,
      'parking_counts': 1,
      'totalChargeAmount': 1,
      'totalOrderCounts': 1,
      //'orderList': 1,
      'orderList':  {
        $filter: {
           input: "$orderList",
           as: "order",
           cond: { $gt: [ "$$order.chargeAmount", 0 ] }
      }},
    }
  });
  UserParkingModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    }
    input.sumData = results[0];
    return cb && cb(null);
  });
}

export function getarkingIncomePerHour(bean, req, cb) {
  let {input, output} = bean;
  let startTime = demandStartTimeDate( new Date(), input.range);
  console.log('startTime: ', startTime);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'nodeId': {'$in': input.approveNodeId},
      'userStartParkTime': {'$gte': startTime},
      'endParkTimeForFee': {'$gte': startTime},
      'valid': true,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'endParkTimeForFee': 1,
      'LocalEndParkTime': {'$add':['$endParkTimeForFee', UTCOFFSET]},
      'sumParkingFee': 1,
      'parkingFeeStatus': 1 
    }
  });
  aggregateArray.push({
    $group: {
      '_id': {
        year: {$year: "$LocalEndParkTime" },
        month: {$month: "$LocalEndParkTime"},
        day:{$dayOfMonth: "$LocalEndParkTime"},
        hour:{$hour: "$LocalEndParkTime"}
      },
      'parkingCounts': {'$sum': 1},
      'income': {'$sum': '$sumParkingFee'},
      'orderCounts':{'$sum': 
        {$cond: {
          if: {$gte: ['$endParkTimeForFee', startTime]}, 
          then: 1, 
          else: 0}}},
      
      'orderList': {'$push': {
        'chargeAmount': '$sumParkingFee',
        'time': '$endParkTimeForFee'
      }},
    }
  });

  aggregateArray.push({
    $project: {
      '_id': 0,
      'time': '$_id',
      'parkingCounts': 1,
      'income': 1,
      'orderCounts': 1,
      'orderList': 1,
      // 'orderList':  {
      //   $filter: {
      //      input: "$orderList",
      //      as: "order",
      //      cond: { $gt: [ "$$order.chargeAmount", 0 ] }
      // }},
    }
  });
  aggregateArray.push({
    $sort: {
      'time.month': 1,
      'time.day': 1,
      'time.hour': 1
    }
  });
  UserParkingModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    }
    input.incomePerHourData = results;
    return cb && cb(null);
  });
}

export function getParkingGroupsList(bean, req, cb) {
  let {input, output} = bean;
  let startTime = demandStartTimeDate( new Date(), input.range);
  console.log('startTime: ', startTime);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'nodeId': {'$in': input.approveNodeId},
      'userStartParkTime': {'$gte': startTime},
      'valid': true,
    }
  });
  aggregateArray.push({
    $sort: {
      'endParkTimeForFee': 1
    }
  });
  aggregateArray.push({
    $lookup: {
     from: "ApprovedDevice",
     localField: "nodeId",
     foreignField: "nodeId",
     as: "nodeId_docs"
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$nodeId_docs',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $project: {
      'tagId': '$nodeId_docs.tagId',
      'parkingName':'$nodeId_docs.name',
      'sumParkingFee': 1,
      'endParkTimeForFee': 1,
    }
  });
  aggregateArray.push({
    $lookup: {
     from: "Tag",
     localField: "tagId",
     foreignField: "_id",
     as: "tagId_docs"
    }
  });
  aggregateArray.push({
    $unwind: {
      path: '$tagId_docs',
      preserveNullAndEmptyArrays: true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': '$tagId_docs._id',
      'parkingZoneName': {'$first': '$tagId_docs.name'},
      'parking_counts': {'$sum': 1},
      'totalChargeAmount': {'$sum': '$sumParkingFee'},
      'totalOrderCounts':{'$sum': 
        {$cond: {
          if: {$gte: ['$endParkTimeForFee', startTime]}, 
          then: 1, 
          else: 0}}},
      
      'orderList': {'$push': {
        'parkingName':'$parkingName', 
        'chargeAmount': '$sumParkingFee',
        'time': '$endParkTimeForFee'
      }},
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'parkingZoneName': 1,
      'parking_counts': 1,
      'totalChargeAmount': 1,
      'totalOrderCounts': 1,
      //'orderList': 1,
      // 'orderList':  {
      //   $filter: {
      //      input: "$orderList",
      //      as: "order",
      //      cond: { $gt: [ "$$order.chargeAmount", 0 ] }
      // }},
    }
  });
  UserParkingModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    }
    input.parkingGroupsList = results;
    return cb && cb(null);
  });
}

export function getCustomerCounts(bean, req, cb) {
  let {input, output} = bean;
  let startTime = demandStartTimeDate( new Date(), input.range);
  console.log('startTime: ', startTime);
  let aggregateArray = [];
  aggregateArray.push({
    $match:{
      'levelOneId':  ObjectId(req.body.user.levelOneId),
      'valid': true,
    }
  });
  aggregateArray.push({
    $group: {
      '_id': null,
      'userCounts': {'$sum': 1}
    }
  });

  aggregateArray.push({
    $project: {
      '_id': 0,
      'userCounts': 1,
    }
  });
  CustomerModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    }
    console.log('results: ', results);
    input.customerCountsData = results[0];
    return cb && cb(null);
  });
}

export function getCustomersIncreaseByMonth(bean, req, cb) {
  let {input, output} = bean;
  let startTime = demandStartTimeDate( new Date(), input.range);
  console.log('startTime: ', startTime);
  let aggregateArray = [];
 
  aggregateArray.push({
    $match:{
      'levelOneId':  ObjectId(req.body.user.levelOneId),
      'valid': true,
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 1,
      'createTime': '$createTime',
      'LocalCreateTime': {'$add':['$createTime', UTCOFFSET]},

    }
  });
  aggregateArray.push({
    $group:{
      '_id': {
        month: {$month: "$LocalCreateTime"}, 
        year: {$year: "$LocalCreateTime" }
      },
      'counts': {'$sum': 1}
    }
  });
  aggregateArray.push({
    $project: {
      '_id': 0,
      'time': '$_id',
      'counts': 1
    }
  });

  CustomerModel.aggregate(aggregateArray, function(err, results){
    if (err) {
      return cb && cb(err);
    }
    console.log('results: ', results);
    input.customersIncreaseData = results;
    return cb && cb(null);
  });
}
