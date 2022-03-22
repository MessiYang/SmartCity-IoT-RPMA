import mongoose from 'mongoose';
import timestamps from 'mongoose-timestamp';
import util from 'util';

function BaseModel() {
	mongoose.Schema.apply(this, arguments);
	this.add({
		__target: String,
		__targetVer: Number,
		creator: String,
		modifier: String,
		deletor: String,
		valid: {type: Boolean, default: true},
		invalidTime: Date,
	});
	this.plugin(timestamps, {createdAt: 'createTime', updatedAt: 'modifyTime'});
	this.plugin(function objectDelete(schema) {
		schema.statics.delete = function objectDelete(id, cb) {
			let update = {
				valid: false,
				modifyTime: new Date(),
				invalidTime: new Date(),
			};
			// 判斷id是否為array
			if (Array.isArray(id)) {
				this.update({_id: {$in: id}}, {$set: update}, {multi: true}, cb);
			} else {
				this.findByIdAndUpdate(id, {$set: update}, cb);
			}
		}
	});
}
util.inherits(BaseModel, mongoose.Schema);

module.exports = BaseModel;
