import base from './base/BaseType';
import Enumeration from 'enumeration';

const value = [
	{EMPLOYEE: 'e', stringValue: 'user.type.employee' }, //員工
	{CUSTOMER: 'c', stringValue: 'user.type.customer' }, //客戶
];

module.exports = new Enumeration(value);