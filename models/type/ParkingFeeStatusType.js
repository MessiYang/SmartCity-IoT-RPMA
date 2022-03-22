import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{UNFINISHED:'0', stringValue: 'tag.type.unfinished'}, //尚未結算ParkingTime
	{NORMAL:    '1', stringValue: 'tag.type.normal'    }, //正常結算ParkingTime
	{UNNORMAL:  '2', stringValue: 'tag.type.unnormal'  }, //非正常結算 無使用者上車或下車時間
	{PAID:      'p', stringValue: 'tag.type.paid'      }, //已付款 但未取得異步通知
	{VERIFY:    'v', stringValue: 'tag.type.verify'    }, //已取得異步通知
];

module.exports = new Enumeration(value);