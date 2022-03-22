import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{NUMBER:  '1', stringValue: 'tag.type.number'  }, //按次數收費
	{TIME:    '2', stringValue: 'tag.type.time'    }, //按時間收費
	{PERIOD:  '3', stringValue: 'tag.type.period'  }, //按時段收費
	{TABLE:   '4', stringValue: 'tag.type.table'   }, //按階梯(表格)收費
	{OTHERS:  '0', stringValue: 'tag.type.others'  }, //特殊規則
];

module.exports = new Enumeration(value);