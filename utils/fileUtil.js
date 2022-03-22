import fs from 'fs';

export function move(file, path, name, cb) {
	//if (!fs.existsSync(file)) {
		//return cb();
	//}
	//判斷資料夾是否存在
	fs.existsSync(path) || fs.mkdirSync(path);
  //fs.renameSync(file.path, `${path}/${name}`);
  //cb();

	var stream = fs.createReadStream(file.path).pipe(fs.createWriteStream(`${path}/${name}`));
	stream.on('error', function (err) {
		console.log('file move: ', err);
		return cb();
	});
	stream.on('close', function () {
		return cb();
	});
}

export function remove(path, name, cb) {
	//判斷資料夾是否存在
	const file = `${path}/${name}`;
	if(fs.existsSync(file)) {
		fs.unlink(file, cb);
	} else {
		return cb();
	}
}

export function filesize(path, name) {
	if (fs.existsSync(`${path}/${name}`)) {
		const stats = fs.statSync(`${path}/${name}`);
		return stats.size;
	} else {
		return 0;
	}
}
