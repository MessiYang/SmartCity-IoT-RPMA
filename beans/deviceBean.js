import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			nodeId: null,
			startDate: null,
			endDate: null,
			data: null,
			status: null,
			nodeId: null,
			timestamp: null,
			timeRange: null,
			counts:null,
			deviceType:null,
			tagType:null,
			messageId:null,
			action:null,
			countyId:null,
			districtId:null,
			villageId:null,
			geotagId:null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			send: {
				nodeId: this.VF('deviceNodeId'),
				data: this.VF('deviceNodeData'),
			},
			getCurrentStatus: {
				nodeId: this.VF('deviceNodeId', true),
			},
			getHistoryStatus: {
				nodeId: this.VF('deviceNodeId'),
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
				status: this.VF('deviceStatusType', true),
			},
			getPayloadHistory: {
				nodeId: this.VF('deviceNodeId')
		
			},
			getParkingStatus: {
				nodeId: this.VF('deviceNodeId'),
			},
			getLatestParkingTime: {
				
			},
			getRawMessages: {
				
			},
		}
	}
};

module.exports = UnnameBean;
