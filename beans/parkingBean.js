import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			nodeId: null,
			ref_zValue: null,
			ref_yValue: null,
			ref_xValue: null,
			xWeight: null,
			yWeight: null,
			zWeight: null,
      startTime: null,
      x_temp_weight: null,
      y_temp_weight: null,
      z_temp_weight: null,
      ref_temp: null,
      smithZoneTop: null,
      smithZoneButtom: null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			updateRefValue: {
			},
		  reCalculateParkingStatus: {
				startTime: this.VF('date')
			},
		}
	}
};

module.exports = UnnameBean;
