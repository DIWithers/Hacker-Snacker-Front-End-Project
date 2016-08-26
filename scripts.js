var fyfApp = angular.module('fyfApp', []);

fyfApp.factory('tMasterService', function($http, $q) {
	var base = 'https://app.ticketmaster.com/discovery/v2/events.json?apikey=Xe61EAoXgKAnv40G5NGgdYS2rTofYHS7';
	var tMasterEvents = {};
	tMasterEvents.getData = function(query) {
		var def = $q.defer();
		$http({
			method: 'GET',
			url: base + query
		}).then(function success(rspns) {
			console.log("Url used for TicketMaster: " + base + query);
			def.resolve(rspns);
		}, function fail(rspns) {
			def.reject("tMasterService Factory failed");
		});
		return def.promise;
	};
	return tMasterEvents;
});

fyfApp.factory('locateService', function($window, $q) {
	var locateSvc = {};
	locateSvc.locate = function() {
		var def = $q.defer();
		if (!$window.navigator.geolocation) {
			def.reject('Geolocation not available...');
		} else {
			$window.navigator.geolocation.getCurrentPosition(
				function(position) {
					def.resolve(position);
				}, function (error) {
					def.reject(error);
				}
			);
		}
		return def.promise;
	}
	return locateSvc;
});

fyfApp.factory('geocodeService', function($http, $q) {
	var geocodeSvc = {};
	geocodeSvc.getCoords = function(addressObjArr) {
		var def = $q.defer();
		var base = "https://maps.googleapis.com/maps/api/geocode/json?address=";
		var requestArr = [];
		angular.forEach(addressObjArr, function(value) {
			console.log(value);
			requestArr.push($http.get(base + value.googleAddress));
		});
		console.log(requestArr);
		$q.all(requestArr)
		.then(function(rspns) {
			console.log(rspns);
			rspns.push(addressObjArr);
			def.resolve(rspns);
		}, function(rspns) {
			def.reject(rspns);
		});
		return def.promise;
	}
	geocodeSvc.getOneCoords = function(address) {
		var def = $q.defer();
		var base = "https://maps.googleapis.com/maps/api/geocode/json?address=";
		console.log(base + address);
		$http({
			method: 'GET',
			url: base + address
		}).then(function success(rspns) {
			console.log(rspns);
			def.resolve(rspns);
		}, function fail(rspns) {
			console.log('failed');
			def.reject(rspns);
		});
		return def.promise;
	}
	return geocodeSvc;
});

 // controller -----------------------------------------------------

fyfApp.controller('fyfCtrl', function($scope, $http, locateService, tMasterService, geocodeService) {
	$scope.festArr = [];
	$scope.venueArr = [];
	
	var map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 40.0000, lng: -98.0000},
		zoom: 4
	});

	// var mapOptions = { zoom: "", center: {} };
	// locateService.locate().then(function success(position) {
	// 	console.log(position);
	// 	mapOptions.center = {
	// 		lat: position.coords.latitude,
	// 		lng: position.coords.longitude
	// 	};
	// 	mapOptions.zoom = 6;
	// }, function fail(rspns) {
	// 	console.log("locateService Failed");
	// })
	// .then(function success(rspns) {
	// 	map = new google.maps.Map(document.getElementById('map'), mapOptions);
	// })

	// CHANGE!!! make the initial pop-up to trigger this (by clicking 'yes'?)
	var onLoadQuery = "&countryCode=US&size=30&keyword=festival&classificationId=KZFzniwnSyZfZ7v7nJ";
	tMasterService.getData(onLoadQuery)
	.then(function success(rspns) {
		console.log(rspns);
		//create festObjs and venueObjs
		var data = rspns.data._embedded.events;
		createObjs(data);
		//check venueObjs for coords
		var addressArr = checkCoords();
		//request for Google Geocode
		geocodeService.getCoords(addressArr)
		.then(function success(rspns) {
			//Rcvd gecodes, update venueObjs
			console.log(rspns);
			var arr = rspns[rspns.length - 1];
			console.log(arr);
			for (var i = 0; i < arr.length; i++) {
				arr[i].coords = {
					lat: rspns[i].data.results[0].geometry.location.lat,
					lng: rspns[i].data.results[0].geometry.location.lng
				};
				$scope.venueArr[i] = arr[i];
			}
			console.log($scope.venueArr);
			//update markers
			resetMarkers();
			for (var i = 0; i < $scope.venueArr.length; i++) {
				placeMarkers($scope.venueArr[i], $scope.festArr[i]);
			}
		}, function fail(rspns) {
			console.log("Failed");
		});
	}, function fail(rspns) {
		console.log("Failed due to " + rspns.status);
	});

	
	//--------------MAIN -----------------------
	//Add Artist and Festival
	var keywordArr = [];
	$scope.artistAdded = [];
	$scope.addArtist = function() {
		console.log($scope.artist);
		keywordArr.push($scope.artist);
		$scope.artistAdded.push($scope.artist);
		$scope.artist = "";
	};
	$scope.festivalAdded = [];
	$scope.addFestival = function() {
		console.log($scope.festival);
		keywordArr.push($scope.festival);
		$scope.festivalAdded.push($scope.festival);
		$scope.festival = "";
	};

	$scope.getState = function() {
		console.log($scope.locState);
	}

	$scope.currentLocation = '?';
	$scope.currentLatLng = "";
	$scope.getCurrentLocation = function() {
		locateService.locate().then(function success(position) {
			console.log(position);
			var latLng = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			$scope.currentLatLng = latLng;
			console.log($scope.currentLatLng);
			var lat = latLng.lat.toString();
			var lng = latLng.lng.toString();
			var latDot = lat.indexOf(".");
			var lngDot = lng.indexOf(".");
			var trimmedLat = "";
			var trimmedLng = "";
			for (var i = 0; i < latDot + 3; i++) {
				trimmedLat += lat[i];
			}
			for (var i = 0; i < lngDot + 3; i++) {
				trimmedLng += lng[i];
			}	
			$scope.currentLocation = "   " + trimmedLat + ", " + trimmedLng;
		}, function fail(rspns) {
			console.log("locateService failed");
		});
	};

	$scope.search = function() {
		$scope.festArr = [];
		$scope.venueArr = [];
		var radiusQuery = "&radius=2000";
		var restOfQuery = "&size=40&classificationId=KZFzniwnSyZfZ7v7nJ" + gatherSearchInput();
		console.log(restOfQuery);

		if ($scope.currentLatLng !== "") {
			latLngQuery = "&latLong=" + $scope.currentLatLng.lat + "," + $scope.currentLatLng.lng;
			var query = restOfQuery + latLngQuery;
			tMasterService.getData(query)
			.then(function success(rspns) {
				// if (rspns.data._embedded.events) {
					// add later
				// }
				var data = rspns.data._embedded.events;
				createObjs(data);
				//check venueObjs for coords
				var addressArr = checkCoords();
				//request for Google Geocode
				geocodeService.getCoords(addressArr)
				.then(function success(rspns) {
					//Rcvd gecodes, update venueObjs
					console.log(rspns);
					var arr = rspns[rspns.length - 1];
					console.log(arr);
					for (var i = 0; i < arr.length; i++) {
						arr[i].coords = {
							lat: rspns[i].data.results[0].geometry.location.lat,
							lng: rspns[i].data.results[0].geometry.location.lng
						};
						$scope.venueArr[i] = arr[i];
					}
					console.log($scope.venueArr);
					//update markers
					resetMarkers();
					for (var i = 0; i < $scope.venueArr.length; i++) {
						placeMarkers($scope.venueArr[i], $scope.festArr[i]);
					}
				}, function fail(rspns) {
					console.log("Failed");
				});
			}, function fail(rspns) {
				console.log("search-tMasterSvc Failed");
			});
		} else if ($scope.currentLatLng == "") {
			//Location
			//Collect Location Info for Geocode
			var locObj = {
				city: "",
				state: "",
				postalCode: "",
				radius: "",
			};
			var city = $scope.locCity;
			var state = $scope.locState;
			var zip = $scope.locZip;
			if ((city) || (state) || (zip)) {
				locObj.city = city;
				locObj.state = state;
				locObj.postalCode = zip;
				console.log(locObj);
				var arr = [];
				for (var prop in locObj) {
					if (locObj[prop] !== "") {
						console.log("locRequest rcvd, calling for geocoding");
						arr.push(locObj[prop]);
					}
				}
			}
			var addressForGeocode = arr.join(", ");
			console.log(addressForGeocode);
			geocodeService.getOneCoords(addressForGeocode)
			.then(function success(rspns) {
				console.log(rspns);
				var coords = rspns.data.results[0].geometry.location;
				latLngQuery = "&latlong=" + coords.lat + "," + coords.lng;
				console.log("latLngQuery: " + latLngQuery);
				var query = restOfQuery + latLngQuery;
				tMasterService.getData(query)
				.then(function success(rspns) {
					console.log(rspns);
					//create festObjs and venueObjs
					var data = rspns.data._embedded.events;
					createObjs(data);
					//check venueObjs for coords
					var addressArr = checkCoords();
					//request for Google Geocode
					geocodeService.getCoords(addressArr)
					.then(function success(rspns) {
						//Rcvd gecodes, update venueObjs
						console.log(rspns);
						var arr = rspns[rspns.length - 1];
						console.log(arr);
						for (var i = 0; i < arr.length; i++) {
							arr[i].coords = {
								lat: rspns[i].data.results[0].geometry.location.lat,
								lng: rspns[i].data.results[0].geometry.location.lng
							};
							$scope.venueArr[i] = arr[i];
						}
						console.log($scope.venueArr);
						//update markers
						resetMarkers();
						for (var i = 0; i < $scope.venueArr.length; i++) {
							placeMarkers($scope.venueArr[i], $scope.festArr[i]);
						}
					}, function fail(rspns) {
						console.log("Failed");
					});
				}, function fail(rspns) {
					console.log("Failed due to " + rspns.status);
				});
			}, function fail(rspns) {
				console.log("failed");
			});
		} else {
			tMasterService.getData(restOfQuery)
			.then(function success(rspns) {
				console.log(rspns);
				//create festObjs and venueObjs
				var data = rspns.data._embedded.events;
				createObjs(data);
				//check venueObjs for coords
				var addressArr = checkCoords();
				//request for Google Geocode
				geocodeService.getCoords(addressArr)
				.then(function success(rspns) {
					//Rcvd gecodes, update venueObjs
					console.log(rspns);
					var arr = rspns[rspns.length - 1];
					console.log(arr);
					for (var i = 0; i < arr.length; i++) {
						arr[i].coords = {
							lat: rspns[i].data.results[0].geometry.location.lat,
							lng: rspns[i].data.results[0].geometry.location.lng
						};
						$scope.venueArr[i] = arr[i];
					}
					//update markers
					resetMarkers();
					for (var i = 0; i < $scope.venueArr.length; i++) {
						placeMarkers($scope.venueArr[i], $scope.festArr[i]);
					}
				}, function fail(rspns) {
					console.log("Failed");
				});
			}, function fail(rspns) {
				console.log("Failed");
			});
		}
	};

	//----------functions----------------------------------//

	function createObjs(data) {
		for (var i = 0; i < data.length; i++) {
			var obj = data[i];
			var target = {};
			for (prop in obj) {
				if (prop == "name") {
					target.name = obj.name;
				} 
				if (prop == "id") {
					target.id = obj.id;
				}
				if (prop == "info") {
					target.desc = obj.info;
				}
				if (prop == "dates") {
					target.dates = obj.dates;
				} 
				if (prop == "images") {
					target.images = obj.images;
				}
				if (prop == "priceRanges") {
					target.prices = obj.priceRanges;
				}
				if (prop == "url") {
					target.link = obj.url;
				}
				if (prop == "pleaseNote") {
					target.note = obj.pleaseNote;
				}
				if (prop == "_embedded") {
					target.venueObj = obj._embedded.venues[0];
				}
				target.index = i;
			}
			$scope.festArr.push(target);
			$scope.venueArr.push(target.venueObj);
		}			
		console.log($scope.festArr);
		console.log($scope.venueArr);		
	}

	function convertDateForAPI(inputDate) {
		var tempYr = inputDate.getFullYear().toString();
		var tempMo = (inputDate.getMonth() + 1).toString();
		var mo = "0";
		var tempDt = (inputDate.getDate()).toString();
		var dt = "0";
		if (tempMo.length === 1) {
			tempMo = mo + tempMo;
		}
		if (tempDt.length === 1) {
			tempDt = dt + tempDt;
		}
		inputDate = tempYr + "-" + tempMo + "-" + tempDt + "T00:00:00Z";
		console.log(inputDate);
		return inputDate; 
	}

	function gatherSearchInput() {
		var keywordQuery = "&keyword=festival";
		var startDateQuery = "";
		var endDateQuery = ""; 
		var radiusQuery = "&radius=2000";
		var genreQuery = "";
		//Dates
		var starteDate = "";
		var endDate = "";
		if ($scope.startDate) {
			startDate = $scope.startDate;
			startDate = convertDateForAPI(startDate);
			startDateQuery += "&startDateTime=" + startDate;
		} 
		if ($scope.endDate) {
			endDate = $scope.endDate;
			endDate = convertDateForAPI(endDate);
			endDateQuery += "&endDateTime=" + endDate;
		}
		//Genres
		console.log($scope.genre);
		if ($scope.genre) {
			for (var i = 0; i < $scope.genre.length; i++) {
				if ($scope.genre[i] === "all") {
					genreQuery = "";
				} else {
					genreQuery = "&classificationName=" + $scope.genre.join(",");	
				}
			}
		}
		console.log(genreQuery);
		//keywords
		if (keywordArr.length !== 0) {
			keywordQuery = "&keyword=";
			for (var i = 0; i < keywordArr.length; i++) {
				keywordQuery += keywordArr[i];
			}
		}
		console.log(keywordQuery);
		//Radius
		var radius = $scope.radius;
		if (radius !== "2000") {
			radiusQuery = "&radius=" + radius;
			console.log(radiusQuery);
		} 
		var query = keywordQuery + genreQuery + startDateQuery + endDateQuery + radiusQuery;
		return query;
	}

	function checkCoords() {
		var addressArr = [];
		for (var i = 0; i < $scope.venueArr.length; i++) {
			$scope.venueArr[i].coords = {
				lat: "",
				lng: ""
			};
			if ($scope.venueArr[i].location) {
				$scope.venueArr[i].coords = {
					lat: Number($scope.venueArr[i].location.latitude), 
					lng: Number($scope.venueArr[i].location.longitude)
				};
			} else {
				var address = "";
				var target = $scope.venueArr[i];
				if (target.address) {
					address += target.address.line1 + ", ";
				} else {
					address = "";		
				}
				address += target.city.name + ", " + target.state.stateCode + " ";
				address += target.postalCode; 
				target.googleAddress = address;
				target.index = i;
				addressArr.push(target);
			}
		}
		console.log(addressArr);	
		return addressArr;
	}

	var markers = [];
	function resetMarkers() {
		if (markers.length !== 0) {
			for (var i = 0; i < markers.length; i++) {
				markers[i].setMap(null);
			}
		}
		markers = [];
	}

	var infoWindow = new google.maps.InfoWindow({});
	function placeMarkers(venue, fest) {
		var content = '<h6>' + fest.name + '<br/><small>' + venue.name + '</small>';
		var lat = venue.coords.lat;
		var lng = venue.coords.lng;
		var icon = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=•%7CFE7569';
		var marker = new google.maps.Marker({
			position: {lat: lat, lng: lng},
			map: map,
			title: venue.name,
			icon: icon,
			animation: google.maps.Animation.DROP,
		});
		
		marker.addListener('click', function() {
			infoWindow.setContent(content);
			infoWindow.open(map, marker);
			map.setZoom(12);
			map.setCenter(marker.getPosition());
		});
		markers.push(marker);
	} 
});
