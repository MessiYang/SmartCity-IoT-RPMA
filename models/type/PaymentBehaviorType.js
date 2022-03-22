import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{OTHERS:      '0', stringValue: 'tag.type.others'     }, //其他付款行為
	{SELFSERVICE: '1', stringValue: 'tag.type.selfservice'}, //自助繳費
	{WECHAT:      '2', stringValue: 'tag.type.wechat'  }, //微信付款

];

module.exports = new Enumeration(value);