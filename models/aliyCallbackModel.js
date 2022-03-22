import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';

let UnnameModel = new BaseModel({

	// 通知的發送時間。格式為yyyy-MM-dd HH:mm:ss
	notify_time: {
		type: Date
	},
	// 通知的類型
	notify_type: {
		type: String
	},
	// 通知校驗ID
	notify_id: {
		type: String
	},
	// 支付寶分配給開發者的應用Id
	app_id: {
		type: String
	},
	auth_app_id: {
		type: String
	},
	// 編碼格式，如utf-8、gbk、gb2312等
	charset: {
		type: String
	},
	// 調用的接口版本，固定為：1.0
	version: {
		type: String
	},
	// 商戶生成簽名字符串所使用的簽名算法類型，目前支持RSA2和RSA，推薦使用RSA2
	sign_type: {
		type: String
	},
	// 簽名
	sign: {
		type: String
	},
	// 支付寶交易憑證號
	trade_no: {
		type: String
	},
	// 原支付請求的商戶訂單號
	out_trade_no: {
		type: String,
		required: [true, 'out_trade_no為必填欄位'],
		index: true
	},
	// 商戶業務ID，主要是退款通知中返回退款申請的流水號
	out_biz_no: {
		type: String
	},
	// 買家支付寶賬號對應的支付寶唯一用戶號。以2088開頭的純16位數字  ex.2088102122524333
	buyer_id: {
		type: String
	},
	// 買家支付寶賬號   ex. 15901825620
	buyer_logon_id: {
		type: String
	},
	// 賣家支付寶用戶號
	seller_id: {
		type: String
	},
	// 賣家支付寶賬號
	seller_email: {
		type: String
	},
	// 交易目前所處的狀態  ex.TRADE_CLOSED
	trade_status: {
		type: String
	},
	// 本次交易支付的訂單金額，單位為人民幣（元）
	total_amount: {
		type: Number
	},
	//商家在交易中實際收到的款項，單位為元
	receipt_amount: {
		type: Number
	},
	//用戶在交易中支付的可開發票的金額
	invoice_amount: {
		type: Number
	},
	// 用戶在交易中支付的金額
	buyer_pay_amount: {
		type: Number
	},
	//集分寶金額 使用集分寶支付的金額
	point_amount: {
		type: Number
	},
	//總退款金額 退款通知中，​​返回總退款金額，單位為元，支持兩位小數
	refund_fee: {
		type: Number
	},
	//訂單標題
	subject: {
		type: String
	},
	//商品描述
	body: {
		type: String
	},
	//交易創建時間
	gmt_create: {
		type: Date
	},
	//交易付款時間
	gmt_payment: {
		type: Date
	},
	//交易退款時間
	gmt_refund: {
		type: Date
	},
	//交易結束時間
	gmt_close: {
		type: Date
	},
	//支付金額信息
	fund_bill_list: {
		type: String
	},
	//回傳參數
	passback_params: {
		type: String
	},
	//優惠券信息
	voucher_detail_list: {
		type: String
	}
}, {
		'versionKey': false,
		'collection': 'AliyCallback',
}, { 'minimize': false, 
});


module.exports = mongoose.model('AliyCallback', UnnameModel);