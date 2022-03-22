import moment from 'moment';

export function demandStartTimeDate(time, range){
  if (!time) {
  time = new Date();
  //console.log('queryDate = ', queryDate);
  }
  if (!range) {
    range = 0;
  }
  let timeDate = new Date(time);
  let startDate = new Date(timeDate).setDate(timeDate.getDate() - range);
  return  new Date(startDate);
}

export function getUTCOffsetMins(){
  return moment().utcOffset();
}