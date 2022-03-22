import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import NodeRSA from 'node-rsa';
import Alipay from 'alipay-node-sdk';
import AlipayMobile from 'alipay-mobile';
import uuidv4 from 'uuid/v4';
import config from 'nconf';
import ParkingFeeStatusType from '../models/type/ParkingFeeStatusType';
import UserParkingModel from '../models/userParkingModel';

const target = config.get('EXECUTE_TARGET');
const {ALIPAY_appId_DEV, ALIPAY_notifyUrl_DEV, ALIPAY_rsaPrivate_DEV, ALIPAY_rsaPublic_DEV
  , ALIPAY_appId_Release, ALIPAY_notifyUrl_Release, ALIPAY_rsaPrivate_Release, ALIPAY_rsaPublic_Release} = config.get(target);
const read = filename => {
  return fs.readFileSync(path.resolve(__dirname, filename))
}

/** @param  {Object}  opts
  * @param  {String}  opts.appId   支付寶的appId 
  * @param  {String}  opts.notifyUrl   支付寶服務器主動通知商戶服務器裡指定的頁面http/https路徑
  * @param  { String}  opts.rsaPrivate   商戶私鑰pem文件路徑
  * @param  {String}  opts.rsaPublic   支付寶公鑰pem文件路徑
  * @param  {String}  opts.signType    簽名方式, 'RSA' or 'RSA2' 
  * @param  {Boolean }  [opts.sandbox]是否是沙盒環境
  * @constructor **/ 
const ALIPAY_SETTING = {
  appId: ALIPAY_appId_Release,
  notifyUrl: ALIPAY_notifyUrl_Release,
  rsaPrivate: path.resolve(ALIPAY_rsaPrivate_Release),
  rsaPublic : path.resolve(ALIPAY_rsaPublic_Release),
  sandbox:  false,
  signType: 'RSA2'
};
const ALIPAY_SETTING_DEV = {
  appId: ALIPAY_appId_DEV,
  notifyUrl: ALIPAY_notifyUrl_DEV,
  rsaPrivate: path.resolve(ALIPAY_rsaPrivate_DEV),
  rsaPublic : path.resolve(ALIPAY_rsaPublic_DEV),
  sandbox:  true,
  signType: 'RSA2'
};

export function generateAppPayParams(req, cb) {
	console.log('---------[generateAppPayParams]-------- ');
  //console.log('[generateAppPayParams] req.outTradeId:', req.outTradeId);

  let ali = new Alipay(ALIPAY_SETTING);
  console.log('[generateAppPayParams]ali:',ali);
/**
	* 生成支付參數供客戶端使用
	* @param  {Object}  opts
	* @param  {String}  opts.subject               商品的標題/交易標題/訂單標題/訂單關鍵字等
	* @param  {String}  [opts. body]                對一筆交易的具體描述信息。如果是多種商品，請將商品描述字符串累加傳給body 
	* @param  {String}  opts.outTradeId            商戶網站唯一訂單號
	* @param  {String}  [opts.timeout]             設置未付款支付寶交易的超時時間，一旦超時，該筆交易就會自動被關閉。
	                                              當用戶進入支付寶收銀台頁面（不包括登錄頁面），會觸發即刻創建支付寶交易，此時開始計時。
	                                              取值範圍：1m～15d。m-分鐘，h-小時，d-天，1c-當天（1c-當天的情況下，無論交易何時創建，都在0點關閉）。
	                                              該參數數值不接受小數點，如1.5h，可轉換為90m。
	* @param  {String}  opts.amount                訂單總金額，單位為元，精確到小數點後兩位，取值範圍[0.01,100000000] 
	* @param  {String}  [opts.sellerId]            收款支付寶用戶ID。如果該值為空，則默認為商戶簽約賬號對應的支付寶用戶ID 
	* @param  {String}  opts.goodsType             商品主類型：0—虛擬類商品，1—實物類商品注：虛擬類商品不支持使用花唄渠道
	* @param  {String}  [opts.passbackParams]      公用回傳參數，如果請求時傳遞了該參數，則返回給商戶時會回傳該參數。支付寶會在異步通知時將該參數原樣返回。本參數必須進行UrlEncode之後才可以發送給支付寶
	* @param  {String}  [opts.promoParams]         優惠參數(僅與支付寶協商後可用) 
	* @param  {String}  [opts.extendParams]        業務擴展參數https://doc.open.alipay.com/docs/doc. htm?spm=a219a.7629140.0.0.3oJPAi&treeId=193&articleId=105465&docType=1#kzcs 
	* @param  {String}  [opts.enablePayChannels]   可用渠道，用戶只能在指定渠道範圍內支付。當有多個渠道時用“,”分隔。注：與disable_pay_channels互斥
	* @param  {String}  [opts.disablePayChannels]禁用渠道，用戶不可用指定渠道支付。當有多個渠道時用“,”分隔。注：與enable_pay_channels互斥
	* @param  {String}  [opts.storeId]             商戶門店編號
*/ 
  let reqestPay = {
    subject: req.subject,
    outTradeId : req.outTradeId,
    timeout:  '10h',
    amount: req.amount,
    goodsType: "0"
  }
  if(req.sellerId) reqestPay.sellerId = req.sellerId;
  if(req.storeId) reqestPay.storeId = req.storeId;
  if(req.body) reqestPay.body = req.body;
  console.log('[generateAppPayParams]appPay reqestPay:',reqestPay);
  let params = ali.appPay(reqestPay);
  console.log('[generateAppPayParams]appPay params:',params);
  cb(null, params);
}

export function checkPayResponseSign(req, cb) {
  let ali = new Alipay(ALIPAY_SETTING);
  console.log('[checkPayResponseSign]req:',req);
  let signVerifyResult = ali.signVerify(req.result); 
  console.log('[checkPayResponseSign]====== signVerifyResult =======:', signVerifyResult);
  if (signVerifyResult == true){
    let resData;
    if(req.result.alipay_trade_app_pay_response) {
      resData = req.result.alipay_trade_app_pay_response;
    }else{
      return cb(null, {'signVerify': false});
    }
    if(resData.code == "10000" && resData.app_id == ALIPAY_appId_DEV){
      checkUserParking(resData, (err, result)=>{
        if (err) return cb(null, {'signVerify': false});
        return cb(null, {'signVerify': true});
      });
    }else{
      return cb(null, {'signVerify': false});
    }
  }else{
    return cb(null, {'signVerify': false});
  }
}

function checkUserParking(req, cb){
  console.log('[checkUserParking]req:',req);
  UserParkingModel.findOne({'outTradeId': req.out_trade_no, 
  'sumParkingFee': req.total_amount, 'valid': true},
  function(err, result) {
    console.log('[checkUserParking]result:',result);
    if (err) return cb(err, null); 
    if (!result) {
      return cb({msg: 'UserParkingDataNotFound'}, null);  
    }
    console.log('[checkUserParking] result: ', result);
    cb(null, result);
  });
}

export function checkNotifyCallbackSign(req, cb) {
  let ali = new Alipay(ALIPAY_SETTING);
  //console.log('[checkNotifyCallbackSign]req:',req);
  console.log('[checkNotifyCallbackSign]req.resul:',req);
  let result = ali.signVerify(req); 
  console.log('[checkNotifyCallbackSign] result:', result);
  return cb(null, {'signVerify': result});
}

export function parkingBillPaid(outTradeId, cb) {
  let updateData = {
    'parkingFeeStatus': ParkingFeeStatusType.PAID.value,
  }
  UserParkingModel.findOneAndUpdate({'outTradeId': outTradeId, 'valid': true},
  updateData, {new: true}, function(err, result) {
    if (err) return cb(err, null); 
    if (!result) {
      return cb({msg: 'UserParkingDataNotFound'}, null);  
    }
    console.log('[parkingBillPaid] result: ', result);
    cb(null, result);
  });
}

export function parkingBillVerifiedCallback(outTradeId, cb) {
  let updateData = {
    'parkingFeeStatus': ParkingFeeStatusType.VERIFY.value,
  }
  UserParkingModel.findOneAndUpdate({'outTradeId': outTradeId, 'valid': true},
  updateData, {new: true}, function(err, result) {
    if (err) return cb(err, null); 
    if (!result) {
      return cb({msg: 'UserParkingDataNotFound'}, null);  
    }
    console.log('[parkingBillVerified] result: ', result);
    cb(null, result);
  });
}

export function testAlyPay(bean, req, res, cb) {
	console.log('---------[testAlyPay]-------- ');
  let outTradeId =  Date.now().toString();

  console.log('[testAlyPay] outTradeId:', outTradeId);
  //console.log('[testAlyPay] path:',  path.resolve ( './config/keys/app_private_key.pem' ));
/**
	* 
	* @param  {Object}  opts
	* @param  {String}  opts.appId   支付寶的appId 
	* @param  {String}  opts.notifyUrl   支付寶服務器主動通知商戶服務器裡指定的頁面http/https路徑
	* @param  { String}  opts.rsaPrivate   商戶私鑰pem文件路徑
	* @param  {String}  opts.rsaPublic   支付寶公鑰pem文件路徑
	* @param  {String}  opts.signType    簽名方式, 'RSA' or 'RSA2' 
	* @param  {Boolean }  [opts.sandbox]是否是沙盒環境
	* @constructor 
*/ 
  var ali = new Alipay ({
    appId: '2016091400509210' ,
    notifyUrl: "http://101.132.91.247:2001/alipay/notifyCallback" ,
    rsaPrivate: path.resolve ( ALIPAY_rsaPrivate_DEV ),
    rsaPublic : path.resolve ( ALIPAY_rsaPublic_DEV ),
    sandbox:  true ,
    signType: 'RSA2'
  });
  console.log('[testAlyPay]ali:',ali);

}