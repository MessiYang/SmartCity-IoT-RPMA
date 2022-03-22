import base from './base/BaseType';
import Enumeration from 'enumeration';

const evalue = [
	{ADM:   1<<12, stringValue: 'role.type.admin'}, //Administrator
	{SI:    1<<10, stringValue: 'role.type.si'   }, //System Integrator
	{ORG:   1<< 8, stringValue: 'role.type.org'  }, //Organization Manager
	{APP:   1<< 6, stringValue: 'role.type.app'  }, //Application Manager
];

const cvalue = [
	{CUSTOMER:     1<< 4, stringValue: 'role.type.customer' }, //客戶
];

module.exports.employee = new Enumeration(evalue);
module.exports.customer = new Enumeration(cvalue);

function userRoleValue(userrole) {
	let role = [];
	role = userrole || [];
	let roleValue = 0;
	if (typeof role == 'number') {
		roleValue = role;
	} else if (role.length > 0) {
		roleValue = role.reduce((prev, element)=>{
			return prev | element;
		});
	}
	return roleValue;
}

module.exports.userRoleValue = userRoleValue;
module.exports.isRole = function(role, userrole) {
	let roleValue = userRoleValue(userrole);
	return ((role&roleValue) !== 0);
}