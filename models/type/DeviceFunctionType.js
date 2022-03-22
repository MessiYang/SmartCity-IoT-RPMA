import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{OTHERS:        '0', stringValue: 'device.status.others'       }, //未分類
	{NOPOWERMETER:  '1', stringValue: 'device.status.nopowermeter' }, //無power meter

];

module.exports = new Enumeration(value);