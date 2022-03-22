import scheduleJobModel from '../models/scheduleJobModel';


export function checkIsJobRunning(jobName, callback){
  scheduleJobModel.findOneAndUpdate({"jobName": jobName, "isJobRunning": "0", "valid" : true},
  {"isJobRunning": "1", "latestJobStartTime": new Date()}, {new: true},
  (err, result)=>{
    if (err) return callback(err, null);
    let response;
    if (!result) {
      scheduleJobModel.findOne({"jobName": jobName, "isJobRunning": "1", "valid" : true},
      {"isJobRunning": 1, "latestJobStartTime": 1}, (err, findResult)=>{
        if (err) return callback(err, null);
        if (!findResult){
          response = {"isJobRunning": "1", "latestJobStartTime":  new Date()};
          return callback(null, response);
        }
        response = {"isJobRunning": "1", "latestJobStartTime": findResult.latestJobStartTime};
        callback(null, response);
      });
    }else{
      response = {"isJobRunning": "0"};
      console.log('[checkIsJobRunning] response:', response);
      callback(null, response);
    }
  });
}

export function jobIsRunning(jobName, callback){
  scheduleJobModel.findOneAndUpdate({"jobName": jobName, "valid" : true},
  {"isJobRunning": "1", "latestJobStartTime": new Date()}, {new: true},
  (err, result)=>{
    if (err) return callback(err, null);
    if (!result) return callback("No result.", null);
    console.log('[jobIsRunning] result:', result);
    callback(null, result);
  });
}

export function jobIsComplete(jobName, callback){
  scheduleJobModel.findOneAndUpdate({"jobName": jobName, "valid" : true},
  {"isJobRunning": "0"}, {new: true},
  function(err, result){
    if (err) return callback(err, null);
    if (!result) return callback("No result.", null);
    console.log('[jobIsComplete] result:', result);
    callback(null, result);
  }); 
}

export function minsTimeDifference(startTime, endTime){
  console.log('[endTime.getTime(): ', endTime.getTime());
  console.log('[startTime.getTime(): ', startTime.getTime());
  return  Math.abs(endTime.getTime()-startTime.getTime())/(1000*60);
}