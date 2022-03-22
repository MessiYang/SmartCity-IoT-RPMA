import logger from '../config/log';
import config from 'nconf';
const target = config.get('EXECUTE_TARGET');
const {SOCKETIO_PORT} = config.get(target);
// socket.io
let io = null;
module.exports = function(server) {
  if (io == null) {
    io = require('socket.io')(server);
    io.on('connect', (socket) => {
      logger.info('[SOCKET-IO] client connected...');
    })
  }
}

module.exports.send = function(topic, message) {
  if (io) {
    io.emit(topic, message);
  }
}
