import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			_id: null,
			nodeId: null,
			desc: null,
			subject: null,
			body: null,
			amount: null,
			sellerId: null,
			goodsType: null,
			passbackParams: null,
			promoParams: null,
			extendParams: null,
			enablePayChannels: null,
			disablePayChannels: null,
			storeId: null,
			memo: null,
			result: null,
			sign: null,
			sign_type: null,
			resultStatus: null,
			alipay_trade_app_pay_response: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			notifyCallback: {
			},
		  getAppPayParams: {
			},
		}
	}
};

module.exports = UnnameBean;