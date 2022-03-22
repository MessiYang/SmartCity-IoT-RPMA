import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			nodeId: null,
			customerId: null,
			startParkingTime: null,
			endParkingTime: null,
			carId: null,
			parkingId: null,
      _id: null,
      counts: null,
      timeStamp: null,
      longitude : null,
      latitude : null,
      mapLevel: null,
      maxDistance: null,
      range: null
		}
	}

	prepareValidateField() {
		this.validateField = {
			getParking: {
				longitude: this.VF('coordinate'),
				latitude: this.VF('coordinate'),

			},
			syncUserParkingHistory: {
				timeStamp: this.VF('date'),
			},
			startParking: {
				nodeId: this.VF('deviceNodeId', true),
				carId:  this.VF('carId'),
				
			},
			endParking: {
				_id: this.VF('_id'),
				
			},
		}
	}
};

module.exports = UnnameBean;