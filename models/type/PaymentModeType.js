import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{OTHERS:  '0', stringValue: 'tag.type.others'  }, //其他付款模式
	{ALIPAY:  '1', stringValue: 'tag.type.alipay'  }, //支付寶付款
	{WECHAT:  '2', stringValue: 'tag.type.wechat'  }, //微信付款

];

module.exports = new Enumeration(value);