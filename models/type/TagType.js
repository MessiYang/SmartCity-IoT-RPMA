import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{NORMAL:          '1', stringValue: 'tag.type.normal'          }, //null
	{LAMPZONE:        '2', stringValue: 'tag.type.lampzone'        }, //智慧路燈區域
	{PARKINGZONE:     '3', stringValue: 'tag.type.parkingzone'     }, //停車區域
	{PARKINGLINEZONE: '4', stringValue: 'tag.type.parkinglinezone' }, //停車線區域
];

module.exports = new Enumeration(value);