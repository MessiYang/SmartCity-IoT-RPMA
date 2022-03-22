import geolib from 'geolib';
import clustering from 'density-clustering';
import approvedDeviceModel from '../models/approvedDeviceModel';

const testcoordsArray =[
 [121.572166,25.062324], //車位41 0
 [121.572193,25.062345], //車位42 1
 [121.572261,25.062349], //車位43
 [121.572265,25.062349], //車位44
 [121.572337,25.062361], //車位45
 [121.572387,25.062095], //車位46 5
 [121.572476,25.062099], //車位47
 [121.574277,25.06248],  //車位49
 [121.574417,25.062484], //車位51
 [121.574587,25.062496], //車位52
 [121.575872,25.0625],   //車位53 10
 [121.575975,25.062516], //車位54
 [121.57474,25.0625],    //車位57 
 [121.574677,25.062496], //車位58
 [121.574358,25.06248],  //車位59
 [121.574246,25.062475], //車位60 15
 [121.574156,25.062471], //車位61
 [121.572341,25.062357]  //車位90 17
];

export function filterSortDistance(center, coords, maxDistance) {
  let coords_filtered = [];
  console.log("coords.length:", coords.length);
	coords.forEach(function(element) {
	  //console.log(element);
	  let distance = geolib.getDistance(center, element, 1, 1);
    if (distance <= maxDistance){
    	element.distance = distance;
      coords_filtered.push(element);
    }
	});
	console.log("coords_filtered.length:", coords_filtered.length);
  return coords_filtered.sort(function(a, b){return a.distance - b.distance});
}

export function lineGroupCoordinate(parkingList){
  let lineGroup = []; 
  let nonLineGroup = [];
	parkingList.forEach(function(element) {
    if (element.geotagId && element.geotagId._id){
    	lineGroup.push(element);
    }else{
      nonLineGroup.push(element);
    }
	});

	let lineGroupData = groupArray(lineGroup);
  lineGroupData.push({'line':null, "parkingLists": nonLineGroup});

	return lineGroupData;
}

export function circleGroupCoordinate(parkingList, maxDistance){
  let coordsArray = [];
	//console.log('parkingList:', parkingList);
	parkingList.forEach(function(element) {
    if (element.longitude != null && element.latitude != null){
    	let elePonit = [];
    	elePonit.push(element.longitude);
    	elePonit.push(element.latitude);
    	coordsArray.push(elePonit);
    }
	});

  let clusters = regDensityClustering(coordsArray, maxDistance);
  // let testcluster = testregDensityClustering(testcoordsArray, maxDistance);
  // console.log('testcluster:', testcluster);

  let clustersData = [];
  clusters.forEach(function(element) {
  	let group = [];
  	element.forEach(function(elem) {
  		group.push(parkingList[elem]);
  	});
    clustersData.push(group);
	});
	//console.log('clustersData:', clustersData);
  
  let centerOfCircle = []; 
  clustersData.forEach(function(element) {
  	let data = geolib.getCenterOfBounds(element);
  	let distanceSortOfPoints = geolib.orderByDistance(data, element);
  	//console.log('distanceSortOfPoints:', distanceSortOfPoints);
  	data.maxRadius = distanceSortOfPoints[distanceSortOfPoints.length-1].distance;
  	data.parkingLists = element;
  	centerOfCircle.push(data);
  });	
  console.log('centerOfCircle:', centerOfCircle);

	return centerOfCircle;
}

function kMeansClustering(coordsArray){
	let numClusters = Math.round(Math.sqrt(coordsArray.length/2));
	//console.log('coordsArray:', coordsArray);
  console.log('numClusters:', numClusters);
  let kmeans = new clustering.KMEANS();
  let clusters = kmeans.run(coordsArray, numClusters);
  return clusters;
}

function testregDensityClustering(coordsArray, maxDistance){
	let neighborhoodOfRadius = (30/(250*1000));
	console.log('[testregDensityClustering]neighborhoodOfRadius:', neighborhoodOfRadius);
	//let neighborhoodOfRadius = 1;
  let neighborhoodNum = 2;//number of points in neighborhood to form a cluster
  
  let optics = new clustering.OPTICS();
  let clusters = optics.run(coordsArray, neighborhoodOfRadius, neighborhoodNum);
  var plot = optics.getReachabilityPlot();
  console.log('plot:', plot);
  return clusters;
}

function regDensityClustering(coordsArray, maxDistance){
	let neighborhoodOfRadius = (maxDistance/(250*1000))/3;
	//console.log('[neighborhoodOfRadius]neighborhoodOfRadius:', neighborhoodOfRadius);
	//let neighborhoodOfRadius = 1;
  let neighborhoodNum = 2;//number of points in neighborhood to form a cluster
  
  let optics = new clustering.OPTICS();
  let clusters = optics.run(coordsArray, neighborhoodOfRadius, neighborhoodNum);
  var plot = optics.getReachabilityPlot();
  //console.log('plot:', plot);
  return clusters;
}

function groupArray(myArray){
	var groups = {};
	for (var i = 0; i < myArray.length; i++) {
	  var groupName = myArray[i].geotagId._id;
	  if (!groups[groupName]) {
	    groups[groupName] = [];
	  }
	  groups[groupName].push(myArray[i]);
	}
	
	let result = [];
	for (var groupName in groups) {
		let line = groups[groupName][0].geotagId.devicesZone;
		for (var key in groups[groupName]) {
			delete groups[groupName][key].geotagId;
		};
	  result.push({'line': line, 'parkingLists':groups[groupName]});
	}	
  return result;
}