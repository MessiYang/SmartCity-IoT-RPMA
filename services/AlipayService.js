import async from 'async';
import moment from 'moment';
import logger from '../config/log';
import UserParkingModel from '../models/userParkingModel';
import ApprovedDeviceModel from '../models/approvedDeviceModel';
import AliyCallbackModel from '../models/aliyCallbackModel';
import { generateAppPayParams, parkingBillVerifiedCallback, checkPayResponseSign, checkNotifyCallbackSign } from '../utils/alipayUtil';
import { generateOutTradeId } from '../utils/stringUtil';

export function getAppPayParams(bean, req, res, callback) {
  let {input, output} = bean;
  generateAppPayParams(req.body, (err, result)=>{
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'CreateError'});
		} else {
			input.appPayParams = result;
			return callback && callback(null);
		}
  });

}

export function checkSign(bean, req, res, callback) {
  let {input, output} = bean;
  console.log("req.body: ",req.body);
  checkPayResponseSign(input, (err, result)=>{
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'CreateError'});
		} else {
			console.log('[checkSign] result: ',result);
			input.checkResult = result.signVerify;
			return callback && callback(null);
		}
  });

}

export function notifyCallback(req, callback) {
	//let {input, output} = bean;
	logger.info('[notifyCallback] ###! req: ', req);
  checkNotifyCallbackSign(req, (err, result)=>{
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'CreateError'});
		} else {
			console.log('[notifyCallback] result: ',result);
      if (result.signVerify == true){
				if (req.notify_time)  req.notify_time = moment(req.notify_time, 'YYYY-MM-DD HH:mm:ss');
			  if (req.gmt_create)  req.gmt_create  = moment(req.gmt_create, 'YYYY-MM-DD HH:mm:ss');
			  if (req.gmt_payment) req.gmt_payment = moment(req.gmt_payment, 'YYYY-MM-DD HH:mm:ss');
			  if (req.gmt_refund)  req.gmt_refund  = moment(req.gmt_refund, 'YYYY-MM-DD HH:mm:ss');
			  if (req.gmt_close)   req.gmt_close   = moment(req.gmt_close, 'YYYY-MM-DD HH:mm:ss');
			  console.log('[notifyCallback] req2: ', req);
			  if (!req.out_trade_no) return callback && callback({name: 'CreateError'});

			  AliyCallbackModel.update({'out_trade_no': req.out_trade_no}, req, {upsert: true}, 
			  (err, results)=>{
			   	if (err) {
						return callback && callback(err);
					} else if (!results) {
						return callback && callback({name: 'CreateError'});
					} else {
						//input.parkingFeeStandard = result;
						parkingBillVerifiedCallback(req.out_trade_no, (err, userParkingResults)=>{
			        if(err) console.log('[notifyCallback] parkingBillVerifiedCallback err: ', err);
			        console.log('[notifyCallback] parkingBillVerifiedCallback userParkingResults: ', userParkingResults);
						});
						return callback && callback(null);
					}
			  });
      }else{
        return callback && callback({name: 'CreateError'});
      }
		}
  });
  
	// new AliyCallbackModel(req).save((err, result) => {
	// 	if (err) {
	// 		return callback && callback(err);
	// 	} else if (!result) {
	// 		return callback && callback({name: 'CreateError'});
	// 	} else {
	// 		//input.parkingFeeStandard = result;
	// 		return callback && callback(null);
	// 	}
	// });
}
function updateEachMessageId(reqUpdate, callback){
  messageModel.update({'messageId': reqUpdate.messageId}, 
  reqUpdate, {upsert: true}, (err, result)=>{
    if(err) return callback(null,{'[updateEachMessageId] err': err} );
    callback(null,{'[updateEachMessageId] success': reqUpdate.messageId} )
  });
}

//profile
export function profile(bean, req, callback) {
	let {input, output} = bean;
	accountModel.findOne({
		_id: input.accountId,
		valid: true,
	}).select(
		{...SELECT_ACCOUNT,}
	 ).exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.accountdata = result;
			return callback && callback(null);
		}
	});
}