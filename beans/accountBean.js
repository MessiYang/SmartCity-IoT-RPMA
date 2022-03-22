import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			account: null,
			password: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			login: {
				account: this.VF('account'),
				password: this.VF('password'),
			},
		}
	}
};

module.exports = UnnameBean;
