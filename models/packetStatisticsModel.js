import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import config from 'nconf';

let UnnameModel = new BaseModel({
  // device ID
  nodeId: {
    type: String,
    required: [true, 'nodeId為必填欄位'],
  },
  // packet統計時間
  packetDate: {
    type: Date,
    required: [true, 'packetDate 為必填欄位'],
  },
  // receivedPacketQty
  receivedPacketQty: {
    type: Number,
    required: [true, 'receivedPacketQty 為必填欄位'],
  },
  // totalPacketQty
  estimatedPacketQty: {
    type: Number,
    required: [true, 'estimatedPacketQty 為必填欄位'],
  },
  // receivingRate = receivedPacketQty / estimatedPacketQty
  receivingRate: {
    type: Number,
    max: 1.0,
    min: 0.0,
    required: [true, 'receivingRate 為必填欄位'],
  },
}, {
    'versionKey': false,
    'collection': 'PacketStatistics',
}, { 'minimize': false,
});

module.exports = mongoose.model('PacketStatistics', UnnameModel);
