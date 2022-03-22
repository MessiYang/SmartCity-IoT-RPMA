import BaseController, { util, i18next, async, config, logger, } from './base/baseController';
import path from 'path';
import ReportBean from '../beans/reportBean';
import { generateParkingStatisticsByNodeId, generateParkingStatisticsByDayOfWeek, generateParkingStatisticsByHour, profileTag } from '../services/ParkingService';
import { profileApprovedDevice } from '../services/DeviceService';
import { generateParkingStatisticsHtml, convertHtmlToPdf } from '../services/ReportService';

const EXCEL_OUTPUT_FOLDER_PATH = '../reports/excelReport/output';
const PDF_OUTPUT_FOLDER_PATH = '../reports/pdfReport/output';
const GPX_OUTPUT_FOLDER_PATH = '../reports/gpxReport/output';

class Controller extends BaseController {
  downloadExcel(req, res, next) {
    if (req.query.filename && req.query.filename.length == 36) {
      const filePath = path.join(__dirname, `${EXCEL_OUTPUT_FOLDER_PATH}/${req.query.filename}.xlsx`);
      res.download(filePath);
    } else {
      res.status(401).send('invalid file name');
    }
  }

  downloadPdf(req, res, next) {
    if (req.query.filename && req.query.filename.length == 36) {
      const filePath = path.join(__dirname, `${PDF_OUTPUT_FOLDER_PATH}/${req.query.filename}.pdf`);
      res.sendFile(filePath); // * file will be displayed on browser * //
    } else {
      res.status(401).send('invalid file name');
    }
  }

  downloadGpx(req, res, next) {
    if (req.query.filename && req.query.filename.length == 36) {
      const filePath = path.join(__dirname, `${GPX_OUTPUT_FOLDER_PATH}/${req.query.filename}.gpx`);      
      res.download(filePath); // * file will be displayed on browser * //
    } else {
      res.status(401).send('invalid file name');
    }
  }

  generateParkingChartPdf(req, res, next) {
		let bean = new ReportBean();
		bean.bind(req, 'generateParkingChartPdf');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
    let {input, output} = bean;
		async.waterfall([
			async.apply(profileTag, bean, req, res),
			async.apply(generateParkingStatisticsByNodeId, bean, req, res),
			async.apply(generateParkingStatisticsByDayOfWeek, bean, req, res),
			async.apply(generateParkingStatisticsByHour, bean, req, res),
			async.apply(generateParkingStatisticsHtml, bean, req, res),
			async.apply(convertHtmlToPdf, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
        return res.json(super.success({ 'pdfUrl': input.url }));
			}
		});
	}

  generateSingleDeviceParkingChartPdf(req, res, next) {
		let bean = new ReportBean();
		bean.bind(req, 'generateSingleDeviceParkingChartPdf');
		if (bean.hasError()) {
			return res.json(super.fail(bean.errors));
		}
    let {input, output} = bean;
		async.waterfall([
			async.apply(profileApprovedDevice, bean, req, res),
			async.apply(generateParkingStatisticsByDayOfWeek, bean, req, res),
			async.apply(generateParkingStatisticsByHour, bean, req, res),
			async.apply(generateParkingStatisticsHtml, bean, req, res),
			async.apply(convertHtmlToPdf, bean, req, res),
		], (err, results) => {
			if (err) {
				return res.json(super.fail(err));
			} else {
        return res.json(super.success({ 'pdfUrl': input.url }));
			}
		});
	}
}

module.exports = function(router) {
	let ctr = new Controller();
	router.route('/downloadExcel').get(ctr.downloadExcel);
	router.route('/downloadPdf').get(ctr.downloadPdf);
	router.route('/downloadGpx').get(ctr.downloadGpx);
	router.route('/generateParkingChartPdf').post(ctr.generateParkingChartPdf);
	router.route('/generateSingleDeviceParkingChartPdf').post(ctr.generateSingleDeviceParkingChartPdf);
};
