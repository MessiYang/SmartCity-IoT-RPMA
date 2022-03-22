import util from 'util';
import config from 'nconf';
import i18next from 'i18next';
import logger from '../config/log';
import moment from 'moment';
import async from 'async';
import accountModel from '../models/accountModel';
import UserType from '../models/type/UserType';
import {uuidv4, tokenSign, refreshTokenSign, tokenVerify, refreshTokenVerify, hashPassword, hashString} from '../utils/stringUtil';
import errorMsg from '../models/type/mongooseErrorCode';
import mongoose from 'mongoose';
let {Types: {ObjectId}} = mongoose;

export const KEY_TOKEN = 'token';
export const SELECT_ACCOUNT = {createTime:0, modifyTime:0, creator:0, modifier:0, __target:0, __targetVer:0, valid:0, userType:0,};
export const SELECT_EMPLOYEE = {createTime:0, modifyTime:0, creator:0, modifier:0, __target:0, __targetVer:0, valid:0,};
export function SELECT_EMPLOYEE_PREFIX(prefix = '') {
	let SELECT = {};
	Object.assign(SELECT,
		...Object.keys(SELECT_EMPLOYEE).map((key) => ({[`${prefix}${key}`]: SELECT_EMPLOYEE[key]}))
	);
	return SELECT;
}
export function loginOutputData(req, custom = {}) {
	if (req.body.user) {
		['iat','exp','iss','levelOneId','levelTwoId','levelThreeId','accountId','role'].forEach(k => {
			req.body.user[k] = undefined;
		});
	}
	return {
		'token': req.body.token,
		'refreshToken': req.body.refreshtoken,
		'tokenExpireIn': '4h',
		'user': req.body.user,
		...custom,
	};
}
export function accountToLowerCase(input) {
	if (input && input.account) {
		input.account = input.account.toLowerCase();
	}
	return input.account;
}
//profile
export function profile(bean, req, callback) {
	let {input, output} = bean;
	accountModel.findOne({
		_id: input.accountId,
		valid: true,
	}).select(
		{...SELECT_ACCOUNT,}
	 ).exec((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'DataNotFound'});
		} else {
			input.accountdata = result;
			return callback && callback(null);
		}
	});
}
//create
export function create(bean, callback) {
	let {input, output} = bean;
	if (input.accountId) {
		return callback && callback(null);
	}
	accountToLowerCase(input);
	new accountModel(input).save((err, result) => {
		if (err) {
			return callback && callback(err);
		} else if (!result) {
			return callback && callback({name: 'CreateError'});
		} else {
			input.accountId = result._id;
			return callback && callback(null);
		}
	});
}
//檢查帳密是否有相符的資料
export function authenticate(bean, callback) {
	let {input, output} = bean;
	let match = {valid: true};
	if (input.xaccountId) {
		match._id = ObjectId(input.xaccountId);
	} else {
		match.account = accountToLowerCase(input);
	}
	accountModel.aggregate([
		{
			$match: match,
		},
		{
			$lookup: {
				'from': 'Employee',
				'localField': '_id',
				'foreignField': 'accountId',
				'as': 'employee',
			}
		},
		{
			$lookup: {
				'from': 'Customer',
				'localField': '_id',
				'foreignField': 'accountId',
				'as': 'customer',
			}
		},
		{
			$addFields: {
				user: {$cond: {if: {$gt: [{$size: '$employee'}, 0] }, then:
					{$arrayElemAt: ['$employee', 0]},
				else:
					{$arrayElemAt: ['$customer', 0]}
				}},
			}
		},
		{
			$project: {
				...SELECT_ACCOUNT, employee:0, customer:0, ...SELECT_EMPLOYEE_PREFIX('user.'),
			}
		},
	], (err, results) => {
		if (err) {
			return callback && callback(err);
		} else if (!results || results.length == 0) {
			return callback && callback({name: 'LoginError'});
		} else {
			let account = results[0];
			if (!account.salt) {
				account.salt = uuidv4();
				account.password = hashPassword(account.password, account.salt, account.account, true);
				accountModel.findOneAndUpdate({_id: account._id}, {$set: {password:account.password, salt:account.salt}}, (err, result) => {});
			}
			if (!input.xaccountId) {
				let db = account.password;
				let check = hashString(input.password, account.salt);
				if (db !== check) {
					return callback && callback({name: 'LoginError'});
				}
			}
			account.password = undefined;
			account.salt = undefined;
			input.accountdata = account;
			return callback && callback(null);
		}
	});
}
//產生token
export function regenToken(bean, req, callback) {
	let {input} = bean;
	let data = input.accountdata;
	let user = data.user;
	tokenSign(user, (err, token) => {
		if (err) {
			return callback && callback(err);
		}
		req.body.token = token;
		req.body.user = user;
		return callback && callback(null);
	});
}
//產生token
export function regenRefreshToken(bean, req, callback) {
	let {input} = bean;
	let data = input.accountdata;
	let user = {
		accountId: data._id,
	};
	refreshTokenSign(user, (err, token) => {
		if (err) {
			return callback && callback(err);
		}
		req.body.refreshtoken = token;
		return callback && callback(null);
	});
}
//getTokenAndVerify
export function getTokenAndVerify(req, res, callback) {
	let token = req.body.token;
	if (!token) {
		let k = 'Bearer ';
		let t = req.headers['authorization'];
		if (t && t.startsWith(k)) {
			token = t.replace(k, '').trim();
		}
	}
	if (!token) {
		((req.headers['cookie']||'').split(';')).some((cookie)=>{
			let index = cookie.indexOf(`${KEY_TOKEN}=`);
			if (index>=0){
				token = cookie.substr(index+KEY_TOKEN.length+1);
			}
			return token != null;
		});
	}
	req.body.token = null;
	req.body.user = null;
	tokenVerify(token, (err, data) => {
		if (err || !data) {
			return callback && callback(err);
		} else {
			req.body.token = token;
			req.body.user = data;
			return callback && callback(null, data);
		}
	});
}
//setTokenInCookie
export function setTokenInCookie(bean, req, res, callback) {
	let {input} = bean;
	if (req.body.token) {
		let expires = moment().add(Number(config.get('COOKIE_EXPIRED')), 's').toDate();
		res.cookie(KEY_TOKEN, req.body.token, {expires: expires, httpOnly: true});
	}
	return callback && callback(null);
}
//verifyRefreshToken
export function verifyRefreshToken(bean, req, res, callback) {
	bean.input.xaccountId = undefined;
	refreshTokenVerify(req.body.token, (err, accountId) => {
		if (err || !accountId) {
			switch(err.name) {
				default:
					err.name = 'AuthenticateError';
				case 'TokenExpiredError':
				case 'JsonWebTokenError':
					return res.status(400).send({'success': false, 'errors': errorMsg(err)});
			}
		} else {
			bean.input.xaccountId = accountId;
			return callback && callback(null);
		}
	});
}