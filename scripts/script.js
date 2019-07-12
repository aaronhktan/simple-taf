var getTAFButton = document.getElementById('getTAFButton'), useLocationButton = document.getElementById('useLocationButton'), returnButton = document.getElementById('returnButton'), cancelled = false, failedOnce = false, failed = false;

// Set up a listener for given station identifier button click
getTAFButton.addEventListener('click', (event) => {
  cancelled = false;
  var station = document.getElementById('stationIdentifier').value;
  hideElements();
  fetchTAF(station);
});

// Set up event listener for using location button click
useLocationButton.addEventListener('click', (event) => {
  cancelled = false;
  var station = document.getElementById('stationIdentifier').value;
  hideElements();
  getUserLocation();
});

// Set up even listener for using the return button click
returnButton.addEventListener('click', (event) => {
  cancelled = true;
  resetElements();
  window.scrollTo(0, 0);
})

document.getElementById('stationIdentifier').onkeypress = (event) => {
  if (event.keyCode == 13){
    document.getElementById('getTAFButton').click();
    document.getElementById('stationIdentifier').blur(); // To hide the software keyboard after user presses enter
  }
}

// A function to fetch things from a server
function request(URL) {
  var xmlRequest = new XMLHttpRequest(); // Gets stuff from server

  xmlRequest.open('GET', URL, true); // Initialize and send the request
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
  document.getElementById('content').className = 'transition-up';
  document.getElementById('mainInstruction').style.display = 'none';
  document.getElementById('stationIdentifier').style.display = 'none';
  document.getElementById('getTAFButton').style.display = 'none';
  document.getElementById('useLocationButton').style.display = 'none';
  document.getElementById('related').style.display = 'none';
  document.getElementById('loadingText').style.display = 'block';
  document.getElementById('loadingAnimation').style.display = 'inline-block';
  document.getElementById('returnButton').style.display = 'inline-block'; // Show the return button
}

// A function to hide/destroy newly created elements and to show original elements
function resetElements() {
  document.getElementById('content').className = 'transition-down';
  document.getElementById('mainInstruction').style.display = 'block';
  document.getElementById('stationIdentifier').style.display = 'inline-block';
  document.getElementById('getTAFButton').style.display = 'inline-block';
  document.getElementById('useLocationButton').style.display = 'inline-block';
  document.getElementById('related').style.display = 'block';
  document.getElementById('returnButton').style.display = 'none';
  hideLoading();
  var parent = document.getElementById('tafText');
  var tafDivs = parent.getElementsByClassName('tafDiv');
  var numberOfElements = tafDivs.length;
  for (let i = 0; i < numberOfElements; i++) {
    parent.removeChild(tafDivs[0]);
  }
  var translatedTafTextDivs = parent.getElementsByClassName('translatedTafTextDiv');
  var numberOfElements = translatedTafTextDivs.length;
  for (let i = 0; i < numberOfElements; i++) {
    parent.removeChild(translatedTafTextDivs[0]);
  }
  var translatedTafTitleDivs = parent.getElementsByClassName('translatedTafTitleDiv');
  var numberOfElements = translatedTafTitleDivs.length;
  for (let i = 0; i < numberOfElements; i++) {
    parent.removeChild(translatedTafTitleDivs[0]);
  }
  if (failed) {
    failed = false;
  }
  if (failedOnce) {
    failedOnce = false;
  }
}

// A function to hide the loading elements
function hideLoading() {
  document.getElementById('loadingText').style.display = 'none'; // Hide the loading text
  document.getElementById('loadingAnimation').style.display = 'none'; //Hide the loading animation
}

// A function to show failedOnce elements
function showFailed(reason, element) {
  console.log(reason);
  failed = true;
  hideLoading();
  element.innerHTML = 'Uh oh! Something went wrong.<br><br> Error code:<br>' + reason + '<br><br>';
  addElement(element); // Add to the webpage!
}

// A function to add an element to the page
function addElement(element) {
  if (!cancelled) {
    document.getElementById('tafText').appendChild(element);
  }
}

// Function to get user location
function getUserLocation() {
  if (navigator.geolocation) { // If the browser supports getting from geolocation then get location
    document.getElementById('loadingText').innerHTML = 'Getting your location...'
    navigator.geolocation.getCurrentPosition(function(position) { // Getting location succeeded; do something with it!
      var params = position.coords.latitude + ',' + position.coords.longitude; // Add to parameters and fetch
      fetchTAF(params);
    }, function(error) { // Something bad has happened; show to the user
      console.log(error.code);
      var tafDiv = document.createElement('div');
      tafDiv.className = 'tafDiv';
      tafDiv.innerHTML = 'This site couldn\'t determine your location. Try again?<br><br>'
      addElement(tafDiv); // Add to the webpage!
      hideLoading();
    });
  }
}

// Function to get TAF provided station identifer
function fetchTAF(params) {

  var URL = 'https://avwx.rest/api/taf/' + params + '?options=info,summary'; // This is the URL with options (extra info and TAF translation)

  document.getElementById('loadingText').innerHTML = 'Fetching TAF...' // Add loading text

  // Make some divs!
  var tafDiv = document.createElement('div'); // This creates a new div to display the TAF
  tafDiv.className = 'tafDiv';
  var translatedTafTitleDiv = document.createElement('div'); // This creates a new div to display the title
  translatedTafTitleDiv.className = 'translatedTafTitleDiv';

  var translatedTafTextDiv = document.createElement('div'); // Creates a div to hold the translated elements
  translatedTafTextDiv.className = 'translatedTafTextDiv'

  request(URL).then((result) => { // Wait for promise to be fulfilled, and then do things with the response
    taf = JSON.parse(result); // Parse JSON
    if (taf.raw !== undefined) { // If there is a raw-report field in the JSON, then show that in the text
      tafDiv.innerHTML += '<b>' + taf.raw.split(' FM')[0] + '</b><br>' // Show the first part of the TAF
      tafDiv.style.paddingBottom = '2em';
      for (var i = 1; i < taf.raw.split(' FM').length; i++) {
        var tafLine = taf.raw.split(' FM')[i];
        if (tafLine.split(' RMK').length > 1) { // This means that it's the last line of the TAF since RMK exists in the string
          tafDiv.innerHTML += '<b> FM' + tafLine.split(' RMK')[0] + '<br>RMK ' + tafLine.split(' RMK')[1] +'</b>'; // Show the raw TAF
        } else {
          tafDiv.innerHTML += '<b> FM' + tafLine + '</b><br>'; // Show the raw TAF line
        }
      }

      var translatedTafText = new Array(taf.forecast.length);  // This creates spans to show the translated TAF
      for (var i = 0; i <= taf.forecast.length; i++) {
        translatedTafText[i] = document.createElement('span');
        translatedTafText[i].className = 'translatedTafText';
      }
      
      translatedTafTitleDiv.innerHTML = 'Translated TAF:' + '<br><br>'; // Title for the translated TAF

      translatedTafText[0].innerHTML += '<b>City</b>: ' + taf.info.city + '<br>'; // Information about TAF Station in first span
      translatedTafText[0].innerHTML += '<b>Airport Name</b>: ' + taf.info.name + '<br>';
      translatedTafText[0].innerHTML += '<b>Altitude</b>: ' + taf.info.elevation_ft  + 'm'; 

      for (var key in taf.forecast) { // Iterate through every element in the TAF Forecast section
        if (taf.forecast[key]['summary'] != null) { // If there is a summary, then display the time and summary
          let start_time = taf.forecast[key]['start_time']['dt'];
          start_time = start_time.slice(start_time.indexOf('T') + 1, start_time.length);

          let end_time = taf.forecast[key]['end_time']['dt'];
          end_time = end_time.slice(end_time.indexOf('T') + 1, end_time.length);
          translatedTafText[parseInt(key) + 1].innerHTML = 'From <b>' + start_time + '</b> to <b>' + end_time + '</b>:<br>' + taf.forecast[key]['summary'] + '<br>';
        }
      }

      if (!cancelled) {
        addElement(tafDiv); // Add to the webpage!
        // Add the new spans to the div and then add the div
        addElement(translatedTafTitleDiv);
        for (var i = 0; i <= taf.forecast.length; i++) {
          translatedTafTextDiv.appendChild(translatedTafText[i]);
        }
        addElement(translatedTafTextDiv);
      }
      hideLoading(); // Hide the loading text

    } else if (failedOnce) { // This means that even after having tried to use a lat long from string, fetching the TAF failed
      console.log('Error fetching taf. The value of failedOnce is ' + failedOnce);
      if (taf.error) {
        showFailed(taf.error, tafDiv);
      } else {
        showFailed('Couldn\'t get TAF, did you spell the station correctly?', tafDiv);
      }
    } else { // This means that it's the first time that it's failed. Get the lat/long using Google's geocoding API and try again
      console.log(failedOnce);
      failedOnce = true;
      document.getElementById('loadingText').innerHTML = 'Fetching address...'; // Add loading text
      var addressURL = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + params.split(' ').join('+') + '&key=AIzaSyCm8CuMVc0DXACkIkysE6oHu6eCiFtJ8uM';
      request(addressURL).then((result) => {
        var geocode = JSON.parse(result);
        try {
          if (geocode.status != 'OK') { // This means that geocoding failed. :(
            showFailed('No places found with that name!', tafDiv);
          } else { // Geocoding succeeded! Get lat and long and fetch TAF again.
            var newParams = geocode.results[0].geometry.location.lat + ',' + geocode.results[0].geometry.location.lng;
            fetchTAF(newParams);
          }
        } catch(error) {
          showFailed(error, tafDiv);
        }
      }).catch((reason) => {
        showFailed(reason, tafDiv);
      });
    }
  }).catch((reason) => { // This means that the query was rejected for some reason
    if (!failedOnce) {
      document.getElementById('loadingText').innerHTML = 'Fetching address...'; // Add loading text
      var addressURL = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + params.split(' ').join('+') + '&key=AIzaSyCm8CuMVc0DXACkIkysE6oHu6eCiFtJ8uM';
      request(addressURL).then((result) => {
        var geocode = JSON.parse(result);
        try {
          if (geocode.status != 'OK') { // This means that geocoding failed. :(
            showFailed('No places found with that name!', tafDiv);
          } else { // Geocoding succeeded! Get lat and long and fetch TAF again.
            var newParams = geocode.results[0].geometry.location.lat + ',' + geocode.results[0].geometry.location.lng;
            failedOnce = true;
            fetchTAF(newParams);
          }
        } catch(error) {
          showFailed(error, tafDiv);
        }
      }).catch((reason) => {
        showFailed(reason, tafDiv);
      });
    } else {
      showFailed(reason, tafDiv); // Show that it failed
    }
  });
}