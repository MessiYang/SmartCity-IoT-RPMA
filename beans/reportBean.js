import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			tagId: null,
			nodeId: null,
			startDate: null,
			endDate: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			generateParkingChartPdf: {
				tagId: this.VF('tagId', true),
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
			},
			generateSingleDeviceParkingChartPdf: {
				nodeId: this.VF('deviceNodeId'),
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
			},
		}
	}
};

module.exports = UnnameBean;
