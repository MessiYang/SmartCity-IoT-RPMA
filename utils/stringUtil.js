import crypto from 'crypto';
import moment from 'moment';
import escapeRegExp from 'escape-string-regexp';
import jwt from 'jsonwebtoken';
import uuidv4 from 'uuid/v4';
import config from 'nconf';
import fs from 'fs';

export {
  uuidv4, getSendMsgConfig
};

export function guid(prefix) {
  let uuid = ((prefix||'')+'xxxxxxx-xxxx-wxxx-yxxx-xxxxxxxxxxxx').replace(/[xyw]/g, (c) => {
    let r = Math.floor((1 + Math.random()) * 0x10000 % 16).toString(16);
    return (c=='x' ? r : (c=='y' ? (r&0x3|0x8) : (r&0x3|0x1))).toString(16);
  });
  return uuid;
}

export function isPersonalId(id) {
  //建立字母分數陣列(A~Z)
  let city = new Array(
    1,10,19,28,37,46,55,64,39,73,82, 2,11,
    20,48,29,38,47,56,65,74,83,21,3,12,30
    )
  // 使用「正規表達式」檢驗格式
  if (id.search(/^[A-Z](1|2)\d{8}$/i) == -1) {
    return false;
  } else {
    //將字串分割為陣列(IE必需這麼做才不會出錯)
    id = id.split('');
    //計算總分
    let total = city[id[0].charCodeAt(0)-65];
    for(let i=1; i<=8; i++){
      total += eval(id[i]) * (9 - i);
    }
    total += eval(id[9]);
    //檢查比對碼(餘數應為0);
    return ((total%10 == 0 ));
  }
}

export function hashString(plain, salt) {
  let key = crypto.pbkdf2Sync(plain, salt, 1, 28, 'sha512');
  return key.toString('hex');
}

export function hashPassword(password, salt, account, force=false) {
  if (force && account) {
    password = hashString(password, account);
  }
  password = hashString(password, salt);
  return password.toString('hex');
}

export function makeRegExp(pattern, attributes='i') {
  return new RegExp(escapeRegExp(pattern), attributes);
}

//http://travistidwell.com/blog/2013/09/06/an-online-rsa-public-and-private-key-generator/
export function tokenSign(data, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_token`;
	let expired = config.get('TOKEN_EXPIRED');
	let cert = config.get('TOKEN_PRIVATE_CERT');
	let privateCert = fs.readFileSync(cert);
	jwt.sign(data, privateCert, {expiresIn : expired, algorithm: 'RS512', issuer: issuer}, (err, token) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, token);
		}
	});
}

export function tokenVerify(token, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_token`;
	let cert = config.get('TOKEN_PUBLIC_CERT');
	let publicCert = fs.readFileSync(cert);
	jwt.verify(token, publicCert, {issuer: issuer}, (err, data) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, data);
		}
	});
}

export function refreshTokenSign(data, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_retoken`;
	let expired = config.get('REFRESH_TOKEN_EXPIRED');
	let cert = config.get('TOKEN_PRIVATE_CERT');
	let privateCert = fs.readFileSync(cert);
	jwt.sign(data, privateCert, {expiresIn : expired, algorithm: 'RS512', issuer: issuer}, (err, token) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, token);
		}
	});
}

export function refreshTokenVerify(retoken, callback) {
	let issuer = `${config.get('SESSION_SECRET')}_retoken`;
	let cert = config.get('TOKEN_PUBLIC_CERT');
	let publicCert = fs.readFileSync(cert);
	jwt.verify(retoken, publicCert, {issuer: issuer}, (err, data) => {
		if (err) {
			return callback && callback(err);
		} else {
			return callback && callback(null, data.accountId);
		}
	});
}

export function generateOutTradeId(code) {
	let outTradeId;
  if(code) {
  	outTradeId = code.slice(0, 3).toUpperCase();
  }else{
  	outTradeId = 'COM';
  }
  outTradeId =  outTradeId.concat(moment().format("YYYYMMDDHHmmssSS"));
  console.log('outTradeId: ', outTradeId);
  let r = Math.floor((Math.random() * 10000) + 1);
  console.log('r: ', r);
  return outTradeId.concat(r);
}

function getSendMsgConfig(req){
	const target = config.get('EXECUTE_TARGET');
  const {MESSAGE_HOST, MESSAGE_USERNAME, MESSAGE_PASSWORD, MESSAGE_HOST_2, MESSAGE_USERNAME_2, MESSAGE_PASSWORD_2, MESSAGE_HOST_3, MESSAGE_USERNAME_3, MESSAGE_PASSWORD_3, MESSAGE_TOKEN_API, MESSAGE_SEND_API, MESSAGE_GET_MSG_API} = config.get(target);
  let data = {};
  if (req.hostName && req.userName) {
    data.tokenUrl = req.hostName + MESSAGE_TOKEN_API;
    data.sendUrl = req.hostName + MESSAGE_SEND_API;
    data.username = req.userName;
    data.password = getMsgPassword(req.hostName, req.userName);
  }else{
    data.tokenUrl = MESSAGE_HOST + MESSAGE_TOKEN_API;
    data.sendUrl = MESSAGE_HOST + MESSAGE_SEND_API;
    data.username = MESSAGE_USERNAME;
    data.password = MESSAGE_PASSWORD;
  }
  return data;

  function getMsgPassword(host, user){
		if(host==MESSAGE_HOST   && user==MESSAGE_USERNAME  ) return MESSAGE_PASSWORD;
	  if(host==MESSAGE_HOST_2 && user==MESSAGE_USERNAME_2) return MESSAGE_PASSWORD_2;
	  if(host==MESSAGE_HOST_3 && user==MESSAGE_USERNAME_3) return MESSAGE_PASSWORD_3;
  }
}


export function combineXmlBody(tag, nodeId, payload){
  let body = "<downlink xmlns='http://www.ingenu.com/data/v1/schema'><datagramDownlinkRequest>" +
  "<tag>" + tag + "</tag>" + "<nodeId>" + nodeId + "</nodeId>" +
  "<payload>" + payload + "</payload></datagramDownlinkRequest></downlink>";
  return body;
}

