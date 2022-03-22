// ref: https://www.npmjs.com/package/enumeration
import Enumeration from 'enumeration';

export function _customize(value, codes=[]) {
	if (!Array.isArray(codes)) {
		codes = [].concat(codes);
	}
	let n = [].concat(codes.map((code) => {
			let found;
			value.some((v)=>{
				Object.keys(v).some((key)=>{
					if (v[key] == code) {
						found = v;
						return true;
					}
				});
				if (found) return true;
			});
			return found;
	}));
	return new Enumeration(n);
}

Enumeration.prototype.toJSON = function() {
	let results = [];
	this.getKeys().forEach((item, index) => {
		if (typeof this[item] == 'object') {
			let obj = {
				'name': item,
				'value': this[item].value,
				'code': this[item].toStringValue(),
			};
			results.push(obj);
		}
	});
	return JSON.stringify(results);
}

Enumeration.prototype.toValues = function() {
	let results = [];
	this.getKeys().forEach((item, index) => {
		if (typeof this[item] == 'object') {
			results.push(this[item].value);
		}
	});
	return results;
}

