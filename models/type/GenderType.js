import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{NULL  : null, stringValue: 'user.gender.null'   }, //請選取
	{FEMALE: '0' , stringValue: 'user.gender.female' }, //女性
	{MALE  : '1' , stringValue: 'user.gender.male'   }, //男性
];

module.exports = new Enumeration(value);
