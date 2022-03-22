import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			_id: null,
			nodeId: null,
			desc: null,
			time_workDay: null,
			time_allDay: null,
			time_holiday: null,
      parkingFeeStandardId: null,
      nodeIdArray: null,
      chargeType: null,
			firstNMinsTime: null,
			firstNMinsCharge_allDay: null,
			firstNMinsCharge_holiday: null,
			firstNMinsCharge_workDay: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			createFeeStandard: {
			},
			setFeeStandard:{},
		  profile: {
				
			},
			update:{},
			invalid:{}
		}
	}
};

module.exports = UnnameBean;