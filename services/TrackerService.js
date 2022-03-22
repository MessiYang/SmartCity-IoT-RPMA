import async from 'async';
import config from 'nconf';
import moment from 'moment';
import path from 'path';
import uuid from 'uuid';
import fs from 'fs';
import coordtransform from 'coordtransform';
import jsonToExcel from 'json2xls';
import { buildGPX, BaseBuilder } from 'gpx-builder';
import logger from '../config/log';
import approvedDeviceModel from '../models/approvedDeviceModel';
import deviceStatusHistoryModel from '../models/deviceStatusHistoryModel';
import DeviceType from '../models/type/DeviceType';

const target = config.get('EXECUTE_TARGET');
const OUTPUT_FOLDER_PATH = '../reports/gpxReport/output';
const {NODE_PORT, SITE_URL} = config.get(target);

export function downloadTrackerGPX(bean, req, cb) {
  let {input, output} = bean;
  let approveNodeId;
  if(input.currentStatus && input.currentStatus.length){
    input.currentStatus.forEach(function(element) {
      approveNodeId = element.nodeId;
    });
  }
  console.log('[downloadTrackerGPX] approveNodeId: ', approveNodeId);
  let where = {
    'nodeId': approveNodeId,
    'timestamp': {
      $gte: moment(input.startDate).startOf('day').toDate(),
      $lte: moment(input.endDate).endOf('day').toDate(),
    }
  };
  deviceStatusHistoryModel.find(where)
  .select('nodeId deviceTime longitude latitude batteryVoltage trackerData timestamp')
  .sort({'timestamp': 1})
  .exec(function (err, results) {
    if(err) {
      console.log('parkingHistoryModel.find err');
      return cb && cb(err);
    }else if (!results || !results.length) {
      console.log('parkingHistory not found');
      input.message = { 'error': 'parkingHistory not found' };
      return cb && cb(null);
    }else{
      let url;
      let gpxData = buildToGPX(results, input.isBaiduCoord);
      const fileName = uuid();
      const filePath = path.join(__dirname, `${OUTPUT_FOLDER_PATH}/${fileName}.gpx`);
      fs.writeFileSync(filePath, gpxData, 'binary');
      if(req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        url = `${SITE_URL}:${NODE_PORT}/report/downloadGpx?filename=${fileName}`;
      }else{
        url = `${SITE_URL}/report/downloadGpx?filename=${fileName}`;
      }
      console.log('url: ',url);   
      input.gpxURL = url; 
      return cb && cb(null);
    }
  });
}

function buildToGPX(data, isBaiduCoord){
  let points = [];
  const { Point } = BaseBuilder.MODELS;
  data.forEach((element)=>{
    if(element.latitude && element.longitude && element.deviceTime){
      let lat, long;
      if (isBaiduCoord) {
        lat = element.latitude;
        long = element.longitude;        
      }else{
        let wgs84Coord = coordTransformBaidu2WGS(element.longitude, element.latitude);
        lat = wgs84Coord[1];
        long = wgs84Coord[0];   
      }
      points.push(    
        new Point(lat, long, {
          //ele: 314.715,
          time: new Date(element.deviceTime)
        })
      );
    }
  });
  //console.log('points: ',points);   
  const gpxData = new BaseBuilder();
  gpxData.setSegmentPoints(points);
  return buildGPX(gpxData.toObject());
}

function coordTransformBaidu2WGS(long, lat){
  let bd09togcj02_result = coordtransform.bd09togcj02(long, lat);
  let gcj02towgs84_result = coordtransform.gcj02towgs84(bd09togcj02_result[0], bd09togcj02_result[1]);  
  return gcj02towgs84_result;
}