import validateFramework from 'validate-framework';
import moment from 'moment';
import dir from 'require-dir';
import { isPersonalId } from '../../utils/stringUtil';

const VF = {
	_id: {
		rules: 'required | maxLength(24) | minLength(24)',
		messages: 'id不能為空 | id為非法格式 | id為非法格式',
	},
	account: {
		rules: 'required | DMAccount | maxLength(64) | minLength(3)',
		messages: '帳號不能為空 | 帳號為非法格式 | 帳號不能超過{{param}}個字 | 帳號不能少於{{param}}個字',
	},
	password: {
		rules: 'required | maxLength(64) | minLength(5)',
		messages: '密碼不能為空 | 密碼不能超過{{param}}個字 | 密碼不能少於{{param}}個字',
	},
	name: {
		rules: 'required | maxLength(64) | minLength(1)',
		messages: '姓名不能為空 | 姓名不能超過{{param}}個字 | 姓名不能少於{{param}}個字',
	},
	personalId: {
		rules: 'required | PersonalId',
		messages: '身分證號不能為空 | 身分證號為非法格式',
	},
	mobile: {
		rules: 'required | maxLength(16) | minLength(9)',
		messages: '手機門號不能為空 | 手機門號不能超過{{param}}個字 | 手機門號不能少於{{param}}個字',
	},
	gender: {
		rules: 'required | GenderType',
		messages: '性別不能為空 | 性別為非法格式',
	},
	deviceNodeId: {
		rules: 'required | DeviceNodeId | maxLength(64)',
		messages: ' nodeId不能為空 | nodeId為非法格式 | nodeId不能超過{{param}}個字',
	},
	deviceNodeData: {
		rules: 'required | DeviceNodeData | maxLength(464)',
		messages: 'nodeData不能為空 | nodeData為非法格式 | nodeData不能超過{{param}}個字',
	},
	deviceStatusType: {
		rules: 'required | DeviceStatusType',
		messages: '裝置狀態不能為空 | 裝置狀態為非法格式',
	},
	startDate: {
		rules: 'required | isDate',
		messages: 'startDate不能為空 | startDate為非法格式',
	},
	endDate: {
		rules: 'required | isDate',
		messages: 'endDate不能為空 | endDate為非法格式',
	},
	date: {
		rules: 'required | isDate',
		messages: 'date不能為空 | date為非法格式',
	},
	userStartParkTime: {
		rules: 'required | isDate',
		messages: 'userStartParkTime不能為空 | userStartParkTime為非法格式',
	},
	careId: {
		rules: 'required | maxLength(16) | minLength(3)',
		messages: 'careId不能為空 | careId不能超過{{param}}個字 | careId不能少於{{param}}個字',
	},
	tagId: {
		rules: 'required | maxLength(24) | minLength(24)',
		messages: '標籤Id不能為空 | 標籤Id不能超過{{param}}個字 | 標籤Id不能少於{{param}}個字',
	},
	coordinate: {
    rules: 'required',
		messages: 'coordinate不能為空',
	}
};
// 預先掃描 models/type 資料夾下所有oooType.js檔案,備份起來
let oooTypes = [];
{
	let files = dir('../../models/type/');
	Object.keys(files).forEach((file) => {
		if (file.endsWith('Type') && file != 'RoleType') {
			oooTypes.push(file);
		}
	});
}

class BaseBean {
	constructor() {
		this.input = {skip:0, limit:10, sort:{ createTime:-1}};
		this.output = {};
		this.validateField = {};
		this.errors = {};
		this.validatedIndex = null;
		this.validator = null;
	}

	VF(param, removeRequired = false) {
		let v = Object.assign({}, VF[param]);
		if (v['rules']) v['rules'] = v['rules'].replace(/[\s]+/g, '');
		if (v['messages']) v['messages'] = v['messages'].replace(/[\s]+/g, '');
		if (removeRequired === true && v['rules']) {
			let rules = v['rules'].split('|');
			let messages = v['messages'].split('|');
			for(let i = 0; i < rules.length; ) {
				if ('required' == rules[i].trim()) {
					rules.splice(i, 1);
					messages.splice(i, 1);
				} else {
					++i;
				}
			}
			v['rules'] = rules.join('|');
			v['messages'] = messages.join('|');
		}
		return v;
	}

	bind(req, validatedIndex/*哪一個驗證規則:null表示不驗證*/, nobinding=true/*是否移除沒送出的參數*/) {
		this.validatedIndex = validatedIndex || null;
		for(let k in this.input) {
			//let p = req.body[k] || req.query[k] || (req.files && req.files[k]) || null;
			let p = req.body[k];
			if (!(p||p===0||p===false||p===''||p===' '||p==='null')) {
				p = req.query[k];
				if (!(p||p===0||p===false||p===''||p===' '||p==='null')) {
					p = (req.files && req.files[k]);
					if (!(p||p===0||p===false||p===''||p===' '||p==='null')) {
						p = null;
					}
				}
			}
			if(p||p===0||p===false||p===''||p===' '||p==='null') {
				if (k !== 'sort' && typeof p === 'object' && (this.input[k] != null)) {
					Object.assign(this.input[k], p);
				} else {
					this.input[k] = p;
				}
			}
		}
		if (validatedIndex) {
			this.prepareValidateField();
		}
		if (nobinding) {
			for(let k in this.input) {
				let p = req.body[k];
				if (!(p||p===0||p===false||p===''||p===' '||p==='null')) {
					p = req.query[k];
					if (!(p||p===0||p===false||p===''||p===' '||p==='null')) {
						p = (req.files && req.files[k]);
						if (!(p||p===0||p===false||p===''||p===' '||p==='null')) {
							p = null;
						}
					}
				}
				if(p === undefined || p === null) {
					if (validatedIndex) {
						this.prepareValidateField();
						let m = this.validateField[validatedIndex][k];
						if (m && m['rules'] && m['rules'].includes('required')) {
							continue;
						}
					}
					//if (['skip','limit','sort'].includes(k)) {
					//	continue;
					//}
					delete this.input[k];
				} else if (p === '' || p === ' ' || p === 'null') {
					this.input[k] = null;
				}
			}
		}
		if (validatedIndex) {
			this.prepareValidateField();
			this.validate();
		}
		//if (req && req.session && req.session.user) {
		//	this.input.modifier = req.session.user.name;
		//}
		//delete this.input.companyId;
	}

	prepareValidateField(){}

	validate() {

		this.validator = new validateFramework({
			bodyData: this.input,
			fields: this.validateField[this.validatedIndex],
			callback: (errors, event) => {
				if (errors) this.errors = errors;
			},
		});
		//是否是ldap帳號,格式:firstName_LastName,其中firstName英數字,lastName英文
		this.validator.addMethod('LdapAccount', (field, param) => {
			return /^([A-Za-z0-9]+[_][A-Za-z]+)$/.test(field.value);
		});
		//是否是dm帳號,格式:英文數字_.@
		this.validator.addMethod('DMAccount', (field, param) => {
			return /^([A-Za-z0-9_.@]+)$/.test(field.value);
		});
		//身份證驗證
		this.validator.addMethod('PersonalId', (field, param) => {
			let id = field.value;
			id = id.toUpperCase();
			// 開發階段byPass的身份證格式(DM\d{8})
			//if ((id.startsWith('DM') && /^DM\d{8}$/i.test(id))) {
			//	return true;
			//}
			return isPersonalId(id);
		})
		//是否是日期格式
		this.validator.addMethod('isDate', function(field, param) {
			if (field.value == '0')
				return true;
			else
				return moment(field.value).isValid();
		})
		//是否是NodeId格式
		this.validator.addMethod('DeviceNodeId', function(field, param) {
			return /^([0][x][A-Fa-f0-9]+)$/.test(field.value);
		})
		//是否是NodeData格式
		this.validator.addMethod('DeviceNodeData', function(field, param) {
			return true;
		})
		//是否是OOO類型
		oooTypes.forEach((oooType) => {
			this.validator.addMethod(oooType, (field, param) => {
				let oooTypeObj = require(`../../models/type/${oooType}`);
				return oooTypeObj.hasValue(field.value);
			});
		});
		this.validator.validate();
	}

	getValidator() {
		return this.validator;
	}

	hasError() {
		return this.errors != null && Object.keys(this.errors).length > 0;
	}

	/*creatorStamp(req) {
		if (req && req.session && req.session.user) {
			this.input.companyId = req.session.user.companyId;
			this.input.creator = req.session.user.name;
		}
	}*/

};
export default BaseBean;
