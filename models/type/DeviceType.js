import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{OTHERS:        '0', stringValue: 'device.status.others'       }, //未分類裝置
	{PARKINGSENSOR: '1', stringValue: 'device.status.parkingsensor'}, //停車裝置
	{AIRSENSOR:     '2', stringValue: 'device.status.airsensor'    }, //空氣盒子
	{SMARTLAMP:     '3', stringValue: 'device.status.smartlamp'    }, //智慧路燈
	{TRACKER:       '4', stringValue: 'device.status.tracker'      }, //GPS
];

module.exports = new Enumeration(value);