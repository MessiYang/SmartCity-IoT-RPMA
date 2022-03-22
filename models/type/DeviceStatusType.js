import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{NORMAL:   '0', stringValue: 'device.status.normal'  }, //正常
	{OFFLINE:  '1', stringValue: 'device.status.offline' }, //裝置離線
	{LOWPOWER: '2', stringValue: 'device.status.lowpower'}, //低電壓
	{OVERLOAD: '3', stringValue: 'device.status.overload'}, //電壓過載
	{OVERHEAT: '4', stringValue: 'device.status.overheat'}, //溫度過熱
	{TOOCOLD:  '5', stringValue: 'device.status.toocold' }, //溫度太低
];

module.exports = new Enumeration(value);
