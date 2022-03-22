import util from 'util';
import async from 'async';
import config from 'nconf';
import i18next from 'i18next';
import fs from 'fs';
import path from 'path';
import uuidv4 from 'uuid/v4';
import handlebars from 'handlebars';
import htmlPdf from 'html-pdf';

const INPUT_PATH = './reports/chartTemplate';
const TEMPLATE_GROUP_FILE = `${INPUT_PATH}/bar-chart-template.group.html`;
const TEMPLATE_SINGLE_FILE = `${INPUT_PATH}/bar-chart-template.single.html`;
const CHARTJS_FILE = `${INPUT_PATH}/Chart.js`;
const STYLE_CSS_FILE = `${INPUT_PATH}/styles.css`;
const BOOTSTRAP_CSS_FILE = `${INPUT_PATH}/bootstrap.min.css`;
const BOOTSTRAP_JS_FILE = `${INPUT_PATH}/bootstrap.min.js`;
const JQUERY_JS_FILE = `${INPUT_PATH}/jquery-3.2.1.min.js`;

const PDF_OUTPUT_FOLDER_PATH = '../reports/pdfReport/output';
const target = config.get('EXECUTE_TARGET');
const {NODE_PORT, SITE_URL} = config.get(target);

export function generateParkingStatisticsHtml(bean, req, res, cb) {
  console.log('[Generate Parking Report Html]');
  let {input, output} = bean;
  // * read source files: HTML, JS and CSS * //
  const templateSource = !input.nodeId ? fs.readFileSync(TEMPLATE_GROUP_FILE, 'utf8') : fs.readFileSync(TEMPLATE_SINGLE_FILE, 'utf8');
  const chartjsSource = fs.readFileSync(CHARTJS_FILE, 'utf8');
  const styleCssSource = fs.readFileSync(STYLE_CSS_FILE, 'utf8');
  const bootstrapCssSource = fs.readFileSync(BOOTSTRAP_CSS_FILE, 'utf8');
  const bootstrapJsSource = fs.readFileSync(BOOTSTRAP_JS_FILE, 'utf8');
  const jqueryJsSource = fs.readFileSync(JQUERY_JS_FILE, 'utf8');
  // * manipulate bodyHtml in template with rawString approach * //
  handlebars.registerHelper('rawString', function(str) {
    //console.log('[rawString] str = ', str);
    return new handlebars.SafeString(str);
  });
  // * set up tagName and nodeName * //
  let tagName = '', nodeName = '';
  if (input.tagDoc && input.tagDoc.name) tagName = input.tagDoc.name;
  if (input.approvedDeviceDoc && input.approvedDeviceDoc.name) nodeName = input.approvedDeviceDoc.name || input.approvedDeviceDoc.nodeId;
  // * organize parking statistics by nodeId * //
  let parkingStatisticsByNodeIdLabels = [];
  let parkingCountByNodeIdData = [];
  let parkingTimeByNodeIdData = [];
  if (input.parkingStatisticsByNodeId && !input.nodeId) {
    input.parkingStatisticsByNodeId.forEach(function (entry) {
      var label = entry.name || entry.nodeId;
      label = '\'' + label + '\'';
      parkingStatisticsByNodeIdLabels.push(label);
      parkingCountByNodeIdData.push(entry.parkingCount);
      parkingTimeByNodeIdData.push(entry.parkingTime);
    });
  }
  // * organize parking statistics by day of weeek * //
  let parkingStatisticsByDayOfWeekLabels = [];
  let parkingCountByDayOfWeekData = [];
  let parkingTimeByDayOfWeekData = [];
  input.parkingStatisticsByDayOfWeek.forEach(function (entry) {
    var label = '\'' + entry.dayOfWeek + '\'';
    parkingStatisticsByDayOfWeekLabels.push(label);
    parkingCountByDayOfWeekData.push(entry.avgParkingCount);
    parkingTimeByDayOfWeekData.push(entry.avgParkingTime);
  });
  // * organize parking statistics by hour * //
  let parkingStatisticsByHourLabels = [];
  let parkingCountByHourData = [];
  let parkingTimeByHourData = [];
  input.parkingStatisticsByHour.forEach(function (entry) {
    var label = '\'' + entry.hour + '\'';
    parkingStatisticsByHourLabels.push(label);
    parkingCountByHourData.push(entry.parkingCount);
    parkingTimeByHourData.push(entry.parkingTime);
  });
  // * (1) load html body; (2) load Chart.js lib; (3) load style.css * //
  let context = {
    'chartJs': chartjsSource,
    'styleCSS': styleCssSource,
    'bootstrapCss': bootstrapCssSource,
    'bootstrapJs': bootstrapJsSource,
    'jqueryJs': jqueryJsSource,
    'tagName': tagName,
    'nodeName': nodeName,
    'startDate': input.startDate,
    'endDate': input.endDate,
    'parkingCountByNodeIdLabels': parkingStatisticsByNodeIdLabels.join(', '),
    'parkingCountByNodeIdData': parkingCountByNodeIdData.join(', '),
    'parkingTimeByNodeIdLabels': parkingStatisticsByNodeIdLabels.join(', '),
    'parkingTimeByNodeIdData': parkingTimeByNodeIdData.join(', '),
    'parkingCountByDayOfWeekLabels': parkingStatisticsByDayOfWeekLabels.join(', '),
    'parkingCountByDayOfWeekData': parkingCountByDayOfWeekData.join(', '),
    'parkingTimeByDayOfWeekLabels': parkingStatisticsByDayOfWeekLabels.join(', '),
    'parkingTimeByDayOfWeekData': parkingTimeByDayOfWeekData.join(', '),
    'parkingCountByHourLabels': parkingStatisticsByHourLabels.join(', '),
    'parkingCountByHourData': parkingCountByHourData.join(', '),
    'parkingTimeByHourLabels': parkingStatisticsByHourLabels.join(', '),
    'parkingTimeByHourData': parkingTimeByHourData.join(', '),
  };
  let template = handlebars.compile(templateSource);
  let html = template(context);
  input.html = html;
  return cb && cb(null);
}

export function convertHtmlToPdf(bean, req, res, cb) {
  console.log('[Convert Html To Pdf]');
  let {input, output} = bean;
  let html = input.html;
  let options = {
    //'format': 'A4',
    'height': '1911px', //'height': '1811px',
    'width': '1680px', //'width': '1580px',
    'quality': 100,
    'type': 'pdf', // * type: png, jpeg, or pdf * //
    //'timeout': 30000, // * timeout that will cancel phantomjs, in milliseconds * //
  };
  let fileName = uuidv4();
  let filePath = path.join(__dirname, `${PDF_OUTPUT_FOLDER_PATH}/${fileName}.pdf`);
  // * convert html to pdf and save pdf file * //
  htmlPdf.create(html, options).toFile(filePath, function(err, result) {
    if (err) {
      return cb && cb(err);
    } else {
      if(req.hostname == 'localhost' || req.hostname == '127.0.0.1') {
        input.url = `${SITE_URL}:${NODE_PORT}/report/downloadPdf?filename=${fileName}`;
      } else {
        input.url = `${SITE_URL}/report/downloadPdf?filename=${fileName}`;
      }
      input.html = html;
      console.log('PDF file ' + result.filename + ' saved');
      return cb && cb(null);
    }
  });
}
