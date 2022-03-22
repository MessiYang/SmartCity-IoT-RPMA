const errorCode = {
	'TokenExpiredError': ['10010','token expired'],
	'JsonWebTokenError': ['10020','token error'],
	'AuthenticateError': ['10030','login first please'],
	'LoginError':        ['10040','account or password not match'],
	'IngenuTokenError':  ['10090','ingenu token error'],
	'PermissionDeniedError': ['10050','permission denied error'],

	'ParamMalformedError': ['30010','parameter is missing or malformed'],
	'NoMessageData':       ['30020','no message data'],
	
	'CreateError':    ['50010','create data fail'],
	'11000':          ['50020','data exists(unique)'],
	'DataNotFound':   ['50030','data not found'],
	'NodeIdNotFound': ['50040','nodeId not found'],
	'TagNotFound':    ['50050','tag not found'],
	'UserParkingDataNotFound':    ['50060','user parking data not found'],
	'UserParkingTimeNotComplete':    ['50070','user parking time not complete'],

	'ReferenceError': ['99999','Internal Server Error'],
};

module.exports = function(error) {
	if (error.code || error.name) {
		let errMsg = errorCode[error.code];
		if (errMsg) return [{system: {message: errMsg[1]}}, errMsg[0]];
		errMsg = errorCode[error.name];
		if (errMsg) return [{system: {message: errMsg[1]}}, errMsg[0]];
		errMsg = error.toString();
		return [{system: {message: errMsg}}, errorCode['ReferenceError'][0]];
	} else {
		Object.keys(error).forEach(key => {
			let v = error[key];
			v.el = undefined;
			v.id = undefined;
			v.clazz = undefined;
			v.placeId = undefined;
		});
		return [error, errorCode['ParamMalformedError'][0]];
	}
}
