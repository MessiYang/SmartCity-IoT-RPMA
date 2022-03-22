import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
  {RESET:        '00', stringValue: 'command.event.reset'       }, //reset device
	{CONTROL:      '01', stringValue: 'command.event.control'     }, //開關PWM控制
	{DIMMING:      '02', stringValue: 'command.event.dimming'     }, //PWM控制
	{SETTIME:      '03', stringValue: 'command.event.settime'     }, //設定device時間
	{RTCADD:       '04', stringValue: 'command.event.rtcadd'      }, //新增一排程
	{RTCDELETE:    '05', stringValue: 'command.event.rtcdelete'   }, //移除一排程
	{RTCREAD:      '06', stringValue: 'command.event.rtcread'     }, //讀取排程
	{TIMEREAD:     '07', stringValue: 'command.event.timeread'    }, //讀取device時間
	{SETHEARTBEAT: '08', stringValue: 'command.event.setheartbeat'}, //心跳包設定	
	{REONLINE:     '0E', stringValue: 'command.event.reonline'    }, //重新上線或上電	
	{STATUS:       'FF', stringValue: 'command.event.status'      }, //回報狀態
];

module.exports = new Enumeration(value);