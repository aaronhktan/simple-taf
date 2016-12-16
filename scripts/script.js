console.log("JS initialized");

var getTAFButton = document.getElementById("getTAFButton"), useLocationButton = document.getElementById("useLocationButton"), returnButton = document.getElementById("returnButton"), cancelled = false;

// Set up a listener for given station identifier button click
getTAFButton.addEventListener('click', function(event) {
	cancelled = false;
	var station = document.getElementById("stationIdentifier").value;
	hideElements();
	fetchTAF(station);
});

// Set up event listener for using location button click
useLocationButton.addEventListener('click', function(event) {
	cancelled = false;
	var station = document.getElementById("stationIdentifier").value;
	hideElements();
	getUserLocation();
});

// Set up even listener for using the return button click
returnButton.addEventListener('click', function(event) {
	cancelled = true;
	resetElements();
	hideLoading();
})

document.getElementById('stationIdentifier').onkeypress=function(e){
	if (e.keyCode == 13){
		document.getElementById('getTAFButton').click();
		document.getElementById('stationIdentifier').blur(); // To hide the software keyboard after user presses enter
	}
}

// A function to fetch things from a server
function request(URL) {
	var xmlRequest = new XMLHttpRequest(); // Gets stuff from server

	xmlRequest.open("GET", URL, true); // Initialize and send the request
	xmlRequest.send();

	var resultPromise = new Promise( // Because fetching TAF is async, promise to return value when fetched
		function(resolve, reject) {
			xmlRequest.onreadystatechange = function() { // Fires on ready state change; if the request is done, then return response
				if (this.readyState == XMLHttpRequest.DONE) {
					resolve(xmlRequest.response);
				}
			};
		})

	return resultPromise; // Return this promise
}

// A function to hide original elements
function hideElements() {
	document.getElementById("main-instruction").style.display = "none";
	document.getElementById("stationIdentifier").style.display = "none";
	document.getElementById("getTAFButton").style.display = "none";
	document.getElementById("useLocationButton").style.display = "none";
	document.getElementById("loading-text").style.display = "block";
	document.getElementById("loading-animation").style.display = "inline-block";
	document.getElementById("returnButton").style.display = "inline-block"; // Show the return button
}

// A function to hide/destroy newly created elements and to show original elements
function resetElements() {
	document.getElementById("main-instruction").style.display = "block";
	document.getElementById("stationIdentifier").style.display = "inline-block";
	document.getElementById("getTAFButton").style.display = "inline-block";
	document.getElementById("useLocationButton").style.display = "inline-block";
	document.getElementById("returnButton").style.display = "none";
	document.getElementById("tafDiv").parentNode.removeChild(document.getElementById("tafDiv"));
	document.getElementById("translatedTAFDiv").parentNode.removeChild(document.getElementById("translatedTAFDiv"));
	document.getElementById("TAFText").parentNode.removeChild(document.getElementById("TAFText"));
	hideLoading();
}

// A function to hide the loading elements
function hideLoading() {
	document.getElementById("loading-text").style.display = "none"; // Hide the loading text
	document.getElementById('loading-animation').style.display = "none"; //Hide the loading animation
}

// A function to add an element to the page
function addElement(element) {
	if (!cancelled) {
		document.getElementById("tafText").appendChild(element);
	}
}

// Function to get user location
function getUserLocation() {
	if (navigator.geolocation) { // If the browser supports getting from geolocation then get location
		document.getElementById("loading-text").innerHTML = "Getting your location..."
		navigator.geolocation.getCurrentPosition(function(position) { // Getting location succeeded; do something with it!
			document.getElementById("loading-text").innerHTML = "Fetching TAF..."
			var params = position.coords.latitude + "," + position.coords.longitude; // Add to parameters and fetch
			fetchTAF(params);
		}, function(error) { // Something bad has happened; show to the user
			console.log(error.code);
			var tafDiv = document.createElement('div');
			tafDiv.id = "tafDiv";
			tafDiv.innerHTML = "This site couldn't determine your location. Try again?<br><br>"
			addElement(tafDiv); // Add to the webpage!
			hideLoading();
		});
	}
}

// Function to get TAF provided station identifer
function fetchTAF(params) {

	var URL = "https://avwx.rest/api/taf/" + params + "?options=info,summary"; // This is the URL with options (extra info and TAF translation)

	// Make some divs!
	var tafDiv = document.createElement('div'); // This creates a new div to display the TAF
	tafDiv.id = "tafDiv";
	var translatedTAFDiv = document.createElement('div'); // This creates a new div to display the title
	translatedTAFDiv.id = "translatedTAFDiv";

	var TAFText = document.createElement('div'); // Creates a div to hold the translated elements
	TAFText.id = "TAFText"

	request(URL).then(function(result) { // Wait for promise to be fulfilled, and then do things with the response
		taf = JSON.parse(result); // Parse JSON
		if (taf["Raw-Report"] !== undefined) { // If there is a raw-report field in the JSON, then show that in the text

			tafDiv.innerHTML += "<b>" + taf["Raw-Report"].split(" FM")[0] + "</b><br>" // Show the first part of the TAF
			for (var i = 1; i < taf["Raw-Report"].split(" FM").length; i++) {
				var tafLine = taf["Raw-Report"].split(" FM")[i];
				if (tafLine.split(" RMK").length > 1) { // This means that it's the last line of the TAF since RMK exists in the string
					tafDiv.innerHTML += "<b> FM" + tafLine.split(" RMK")[0] + "<br>RMK " + tafLine.split(" RMK")[1] +"</b>"; // Show the raw TAF
				} else {
					tafDiv.innerHTML += "<b> FM" + tafLine + "</b><br>"; // Show the raw TAF line
				}
			}

			var translatedTAFText = new Array(taf.Forecast.length);  // This creates spans to show the translated TAF
			for (var i = 0; i <= taf.Forecast.length; i++) {
				translatedTAFText[i] = document.createElement('span');
				translatedTAFText[i].className = "translatedTAFText";
			}
			
			translatedTAFDiv.innerHTML = "Translated TAF:" + "<br><br>"; // Title for the translated TAF

			translatedTAFText[0].innerHTML += "<b>City</b>: " + taf.Info.City + "<br>"; // Information about TAF Station in first span
			translatedTAFText[0].innerHTML += "<b>Airport Name</b>: " + taf.Info.Name + "<br>";
			translatedTAFText[0].innerHTML += "<b>Altitude</b>: " + taf.Info.Elevation  + "m"; 

			for (var key in taf.Forecast) { // Iterate through every element in the TAF Forecast section
				if (taf.Forecast[key]["Summary"] != null) { // If there is a summary, then display the time and summary
					translatedTAFText[parseInt(key) + 1].innerHTML = "From <b>" + taf.Forecast[key]["Start-Time"].substring(2, 4) + "00</b> to <b>" + taf.Forecast[key]["End-Time"].substring(2, 4) + "00</b>:<br>" + taf.Forecast[key]["Summary"] + "<br>";
				}
			}

		} else { // If there isn't, tell the user that their query was invalid
			tafDiv.innerHTML = "Your request was invalid!" + "<br><br>";
		}

		addElement(tafDiv); // Add to the webpage!

		// Add the new spans to the div and then add the div
		addElement(translatedTAFDiv);
		for (var i = 0; i <= taf.Forecast.length; i++) {
			TAFText.appendChild(translatedTAFText[i]);
		}
		addElement(TAFText);

		hideLoading(); // Hide the loading text
	}).catch(function(reason) { // This means that the query was rejected for some reason
		console.log(reason); // Log the reason and tell the user
		tafDiv.innerHTML = "Your request was invalid!" + "<br><br>";
		addElement(tafDiv); // Add to the webpage!
		hideLoading();
	});
}