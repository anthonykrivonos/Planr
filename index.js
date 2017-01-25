var http = require('http');
var Yelp = require('yelp');

var EAT = 0, VISIT = 1, SHOP = 2;

var weather = "";
var zip, day, month, hours, activity;
var business_name, business_review, business_location;

exports.handler = (event, context) => {

  try {

    if (event.session.new) {
      // New Session
      console.log("NEW SESSION")
    }

    switch (event.request.type) {

      case "LaunchRequest":
        // Launch Request
        console.log(`LAUNCH REQUEST`)
        context.succeed(
          generateResponse(
            buildSpeechletResponse("Hi, I'm Planr. Let's plan something.", true),
            {}
          )
        )
        break;

      case "IntentRequest":
        // Intent Request
        console.log(`INTENT REQUEST`)

        switch(event.request.intent.name) {
          case "MakePlans":
            day = getDayAndMonthAndHours()[0];
            month = getDayAndMonthAndHours()[1];
            hours = getDayAndMonthAndHours()[2];

            var origin = "http://ip-api.com/json";
            var body = "";
            http.get(origin, (res) => {
                var statusCode = res.statusCode;
                var contentType = res.headers['content-type'];
                var error;
                if (statusCode !== 200) {
                    error = new Error(`Request Failed.\n` + `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error(`Invalid content-type.\n` + `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    console.log(error.message);
                    // consume response data to free up memory
                    res.resume();
                    return;
                }
            res.setEncoding('utf8');
            var rawData = '';
            res.on('data', (chunk) => rawData += chunk);
            res.on('end', () => {
                try {
                    var parsedData = JSON.parse(rawData);
                    zip = parsedData.zip;
                    console.log(parsedData);
                } catch (e) {
                    console.log(e.message);
                }
            });
            }).on('error', (e) => {
                console.log(`Got error: ${e.message}`);
            });

            origin = "http://api.openweathermap.org/data/2.5/weather?q=" + zip + "&APPID=205283d9c9211b776d3580d5de5d6338";
            body = "";
            http.get(origin, (res) => {
                var statusCode = res.statusCode;
                var contentType = res.headers['content-type'];
                var error;
                if (statusCode !== 200) {
                    error = new Error(`Request Failed.\n` + `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error(`Invalid content-type.\n` + `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    console.log(error.message);
                    // consume response data to free up memory
                    res.resume();
                    return;
                }
            res.setEncoding('utf8');
            var rawData = '';
            res.on('data', (chunk) => rawData += chunk);
            res.on('end', () => {
                try {
                    var parsedData = JSON.parse(rawData);
                    weather = parsedData.weather[0].id;
                    console.log(parsedData);
                    setTimeout(function() {
                        if (weather >= 200 && weather < 800)
                            weather = true;
                        else
                            weather = false;
                    }, 500);
                } catch (e) {
                    console.log(e.message);
                }
            });
            }).on('error', (e) => {
                console.log(`Got error: ${e.message}`);
            });

            activity = getActivity();
            //origin = "https://api.yelp.com/v2/search/?term=" + activity + "&location= " + zip + "&limit=20&radius_filter=8000";
            body = "";

            var yelp = new Yelp({
                consumer_key: 'v_iFSeLqG70_lDRbxAAT0Q',
                consumer_secret: '8GH_JJ1T-RmPLbRkPGprweW_8dI',
                token: 'od8WpXP21za837KIiIUstmsW_EGOln63',
                token_secret: 'iag6zw7HfDOiDiN3QcNttTTcfQ4'
            });

            yelp.search({term: activity, location: zip})
            .then(function (data) {
                  console.log(data);
                  setTimeout(function() {
                        var jsonString = JSON.stringify(data);
                        data = JSON.parse(jsonString);
                        var tries = 0, isClosed = true;

                        b = getBusiness(data.businesses.length);

                        business_name = data.businesses[b].name;
                        business_review = data.businesses[b].rating;
                        business_review = data.businesses[b].location.city;

                        while (tries < 20)
                        {
                              if (!data.businesses[b].is_closed)
                              {
                                    b = getBusiness(data.businesses.length);
                                    business_name = data.businesses[b].name;
                                    business_review = data.businesses[b].rating;
                                    business_location = data.businesses[b].location.city;
                                    isClosed = false;
                                    tries += 20;
                              }
                        tries++;
                  }
            }, 500);
            })
            .catch(function (err) {
                  console.error(err);
            });
            /*
            https.get(origin, (response) => {
              response.on('data', (chunk) => { body += chunk })
              response.on('end', () => {
                setTimeout(function() {
                    var parsedData = JSON.parse(body);
                    console.log(parsedData);
                    var tries = 0, isClosed = true;
                    b = getBusiness(parsedData.businesses.length);

                    business_name = parsedData.businesses[b].name;
                    business_review = parsedData.businesses[b].rating;
                    business_review = parsedData.businesses[b].location.city;

                    while (tries < 20)
                    {
                        if (!parsedData.businesses[b].is_closed)
                        {
                            b = getBusiness(parsedData.businesses.length);
                            business_name = parsedData.businesses[b].name;
                            business_review = parsedData.businesses[b].rating;
                            business_location = parsedData.businesses[b].location.city;
                            isClosed = false;
                            tries += 20;
                        }
                        tries++;
                    }
                }, 500);
          })*/
        })
            setTimeout(function() {
                context.succeed(
                    generateResponse(
                        buildSpeechletResponse(getDialogue(business_name, business_review, business_location, isClosed), true), {}
                    )
                );
            }, 2000);
            break;

          default:
            throw "Invalid intent";
        }

        break;

      case "SessionEndedRequest":
        // Session Ended Request
        console.log(`SESSION ENDED REQUEST`)
        break;

      default:
        context.fail(`INVALID REQUEST TYPE: ${event.request.type}`)

    }

  } catch(error) { context.fail(`Exception: ${error}`) }

}

// Helpers
buildSpeechletResponse = (outputText, shouldEndSession) => {

  return {
    outputSpeech: {
      type: "PlainText",
      text: outputText
    },
    shouldEndSession: shouldEndSession
  }

}

generateResponse = (speechletResponse, sessionAttributes) => {

  return {
    version: "1.0",
    sessionAttributes: sessionAttributes,
    response: speechletResponse
  }

}

function getDayAndMonthAndHours() {
    var date = new Date();
    var hours = new Date().getHours();
	date = date.toISOString();
	date.split("-");
	var month = date[1];
	var day = date[2];
	var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	return [day, monthNames[month+1], hours];
}

function getActivity() {
    var rand = Math.floor((Math.random * 3) + 1);
    if (rand == EAT)
        return "food";
    else if (rand == VISIT)
        return "visit";
    else
        return "shop";
    return rand;
}

function getBusiness(length) {
    return Math.floor((Math.random * length));
}

function getDialogue(name, review, location, closed) {
    var rand = Math.floor((Math.random * 3) + 1);
    var str = "";
    switch (rand) {
        case 1:
            str += "You should really go to " + name + " in " + location + ". According to Yelp, it has a " + review + " review, ";
            if (review < 3)
                "but it probably won't be awful, right?";
            else if (review < 4)
                "which is pretty decent.";
            else
                "and I'm sure you'll love it.";
            break;
        case 2:
            str += "How about travelling to " + location + " and finding " + name + "? Yelp gives it a " + review + " review.";
            break;
        case 3:
            str += "I think you should go to " + name + " in " + location + ". It has a " + review + " Yelp review.";
            break;
        default:
            break;
    }
    if (closed)
    {
        rand = Math.floor((Math.random * 2) + 1);
        switch (rand)
        {
            case 1:
                str += " However, I think it's closed.";
                break;
            default:
                str += " But it may be closed at this hour. You should try tomorrow.";
                break;
        }
    }
    return str;
}
