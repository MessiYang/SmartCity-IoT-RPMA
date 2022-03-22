import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			nodeId: null,
      _id: null,
			countyId: null,
			districtId: null,
			villageId: null,
			name: null,
			desc: null,
			valid: null,
			countyId:null,
			districtId:null,
			villageId:null,
			geotagId:null,
			devicesZone:null,
			longitude:null,
			latitude:null,
			tagType:null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			setDevicesGroup: {
				// countyId: this.VF('_id'),
				// districtId: this.VF('_id'),
				// villageId: this.VF('_id'),
				// geotagId: this.VF('_id'),
			},
			getTimeZone:{
				longitude: this.VF('coordinate'),
				latitude: this.VF('coordinate')
			}
		}
	}
};

module.exports = UnnameBean;