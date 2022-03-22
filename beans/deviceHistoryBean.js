import BaseBean from './base/baseBean';

class UnnameBean extends BaseBean {
	constructor() {
		super();
		this.input = {
			...this.input,
			nodeId: null,
			startDate: null,
			endDate: null,
			date: null,
			month: null,
			data: null,
			tag: null,
			payload: null,
			onOff: null,
			pwm: null,
			reset: null,
			parkingDate: null,

			eventType: null,
			year: null,
			month: null,
			day: null,
			dayOfWeek: null,
			hour: null,
			min: null,
			sec: null,
      isOneTime: null,
			selectWeekDays: null,
			index: null,
			startIndex: null,
			endIndex: null,
			isWrite: null,
			isRTCClock: null,
			heartBeatRate: null,
			countyId:null,
			districtId:null,
			villageId:null,
			geotagId:null,

			statisticsDate:null,
			isBaiduCoord:null,
		}
	}

	prepareValidateField() {
		this.validateField = {
			getCurrentDevicePayload: {
				nodeId: this.VF('deviceNodeId', true),
			},
			getDeviceHistory: {
				nodeId: this.VF('deviceNodeId'),
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
			},
			send: {
				nodeId: this.VF('deviceNodeId')
			},
			downloadParkingDetails: {
				nodeId: this.VF('deviceNodeId'),
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
			},
			downloadPacketStatistics: {
				startDate: this.VF('startDate', true),
				endDate: this.VF('endDate', true),
				date: this.VF('date', true),
			},
			downloadStreetLightHistory: {
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
			},
			downloadTrackerGPX: {
				nodeId: this.VF('deviceNodeId'),
				startDate: this.VF('startDate'),
				endDate: this.VF('endDate'),
			},
		}
	}
};

module.exports = UnnameBean;
