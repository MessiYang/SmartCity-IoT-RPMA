import util from 'util';
import {_} from 'underscore';
import i18next from 'i18next';
import async from 'async';
import config from 'nconf';
import path from 'path';
import moment from 'moment';
import errorMsg from '../../models/type/mongooseErrorCode';
import logger from '../../config/log';

export {
  util, _, i18next, async, config, path, moment, logger,
};

class Base {
	constructor() {
		this.STATUSCODE_SUCCESS = ["00000", "成功"];
		this.STATUSCODE_PARAMETER = ["E0001", "參數缺少或格式錯誤"];
		this.STATUSCODE_NOTFOUND = ["E0002", "找不到資料"];
		this.STATUSCODE_AUTHERROR = ["E0003", "權限不足"];
		this.STATUSCODE_DBERROR = ["E0004", "資料庫異常"];
		this.STATUSCODE_VERERROR = ["E0005", "版本錯誤"];
	}

	json(response) {
		response.flag = true;
		this.res.json(response);
	}

	success(jsonMap, total) {
		let response = {
			success: true,
			total: total,
			data: jsonMap,
		};
		//logger.info('response: ', JSON.stringify(response));
		return response;
	}

	fail(jsonMap) {
		let e = errorMsg(jsonMap);
		let response = {
			success: false,
			data: {},
			errors: e[0],
			code: e[1],
		};
		logger.info('response fail: ', JSON.stringify(response));
		return response;
	}

	jobQueued() {
		let response = {
			success: true,
			data: {},
		};
		return response;
	}
}

export default Base;
