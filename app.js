//-------- import all the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const https = require("https");
require("dotenv").config();
const session = require('express-session');

//---- import modules which are created locally
const daysModule = require(__dirname + '/date.js');

//-------- create the app and configure it with EJS
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

//-------- configure express-session middleware
app.use(session({
    secret: 'yourSecretKey', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true in production with HTTPS
}));

//-------- API details
const apiKey = process.env.API_KEY;
const unit = "metric";
const endPoint = "https://api.openweathermap.org/data/2.5/forecast?";
const weatherEndPoint = "https://api.openweathermap.org/data/2.5/weather?";
let city = "Dhaka,Bangladesh";
let url = endPoint + "q=" + city + "&APPID=" + apiKey + "&units=" + unit;
let weatherUrl = weatherEndPoint + "q=" + city + "&APPID=" + apiKey + "&units=" + unit;

// -------- create a function to convert the time format
function tConvert(time) {
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) {
        time = time.slice(1);
        time[5] = +time[0] < 12 ? ' AM' : ' PM';
        time[0] = +time[0] % 12 || 12;
    }
    return time.join('');
}


//-------- create a function to break down the data object to store only the data we need
function distributeData(data, sessionData) {
    let dataList = data.list;
    let daysName = daysModule.days();
    let dateIndex = (dataList[0].dt_txt).slice(8, 10);
    let startingIndex = 0;
    if (dateIndex != (daysModule.currentDate())) {
        dateIndex = (dataList[1].dt_txt).slice(8, 10);
        startingIndex = 1;
    }

    let hourlyData = [];
    let dayIndex = 0;
    let currentMax = Math.round(Number(dataList[startingIndex].main.temp_max));
    let currentMin = Math.round(Number(dataList[startingIndex].main.temp_min));
    let dailyDes = dataList[startingIndex].weather[0].main;
    let dailyIcon = dataList[startingIndex].weather[0].icon;

    for (let i = startingIndex; i < dataList.length; i++) {
        let weatherDataSet = dataList[i];

        if (dateIndex != String(weatherDataSet.dt_txt).slice(8, 10) && dayIndex < 5) {
            sessionData.hourlyDataList.push(hourlyData);
            hourlyData = [];

            sessionData.dailyData.push({
                day: daysName[dayIndex],
                date: dateIndex,
                des: dailyDes,
                icon: dailyIcon,
                max: currentMax,
                min: currentMin
            });
            dayIndex++;

            currentMax = Math.round(Number(weatherDataSet.main.temp_max));
            currentMin = Math.round(Number(weatherDataSet.main.temp_min));
            dailyDes = weatherDataSet.weather[0].main;
            dailyIcon = weatherDataSet.weather[0].icon;

            dateIndex = String(weatherDataSet.dt_txt).slice(8, 10);
        }

        hourlyData.push({
            icon: weatherDataSet.weather[0].icon,
            hour: tConvert(weatherDataSet.dt_txt.slice(11, 16)),
            temp: Math.floor(Number(weatherDataSet.main.temp)),
            feelsLike: Number(weatherDataSet.main.feels_like),
            humidity: weatherDataSet.main.humidity + "%",
            clouds: weatherDataSet.clouds.all + "%",
            wind_speed: Math.round(Number((weatherDataSet.wind.speed * 18) / 5)) + " km/h",
            visibility: Number((weatherDataSet.visibility) / 1000) + " km",
            pressure: weatherDataSet.main.pressure + " hPa",
        });

        currentMax = (currentMax < Math.round(Number(weatherDataSet.main.temp_max))) ? Math.round(Number(weatherDataSet.main.temp_max)) : currentMax;
        currentMin = (currentMin > Math.round(Number(weatherDataSet.main.temp_min))) ? Math.round(Number(weatherDataSet.main.temp_min)) : currentMin;
    }

    if (dayIndex < 5) {
        sessionData.dailyData.push({
            day: daysName[dayIndex],
            date: dateIndex,
            des: dailyDes,
            icon: dailyIcon,
            max: currentMax,
            min: currentMin
        });
    }
}


//------- setting a timeout for protecting from API overload
function timeOut(req) {
    req.session.userInteracted = true;
    setTimeout(function () {
        req.session.userInteracted = false; // Allow new requests after 10 seconds
    }, 10000);
}


//-------- create a function to set the overall current weather data
function distributeCurrentData(data, sessionData) {
    sessionData.weatherData = {
        icon: data.weather[0].icon,
        temp: Math.round(Number(data.main.temp)),
        humidity: data.main.humidity + "%",
        clouds: data.clouds.all + "%",
        wind_speed: Math.round(Number((data.wind.speed * 18) / 5)) + " km/h",
        visibility: Number((data.visibility) / 1000) + " km",
        pressure: data.main.pressure + " hPa",
        feelsLike: data.main.feels_like
    };
}

//-------- creating the get request for the home page
app.get("/", function (req, res) {
    if (!req.session.weatherData) {
        req.session.weatherData = {};
        req.session.hourlyDataList = [];
        req.session.dailyData = [];
        req.session.userInteracted = false;
        req.session.hourlyDataListIndex = 1;
        req.session.dailyDataIndex = 0;
        req.session.overAllNeed = "True";
        req.session.city = city;
        req.session.cityName = "Dhaka";
        req.session.url = url;
        req.session.weatherUrl = weatherUrl;
    }

    // console.log(!req.session.userInteracted + " happened");

    if (!req.session.userInteracted) {
        req.session.weatherData = {};
        req.session.hourlyDataList = [];
        req.session.dailyData = [];
        https.get(req.session.url, function (response) {
            if (response.statusCode === 404) {
                res.send("Error, please enter a valid city");
            } else if (response.statusCode === 429) {
                res.send("Error, please try again later");
            } else {
                let dataString = "";
                response.on("data", function (chunk) {
                    dataString += chunk;
                });

                response.on("end", function () {
                    https.get(req.session.weatherUrl, function (weatherResponse) {
                        if (weatherResponse.statusCode === 404) {
                            res.send("Error, please enter a valid city");
                        } else if (weatherResponse.statusCode === 429) {
                            res.send("Error, please try again later");
                        } else {
                            weatherResponse.on("data", function (data) {
                                distributeCurrentData(JSON.parse(data), req.session);
                                distributeData(JSON.parse(dataString), req.session);

                                if (!req.session.userInteracted) {
                                    req.session.hourlyDataListIndex = (req.session.hourlyDataList.length === 1) ? 0 : 1;
                                }

                                let websitePassingData = req.session.hourlyDataList[req.session.dailyDataIndex][req.session.hourlyDataListIndex];
                                let websiteHourlyData = req.session.hourlyDataList[req.session.dailyDataIndex];

                                let renderedData = {
                                    passedData: (req.session.userInteracted) ? websitePassingData : req.session.weatherData,
                                    hourlyData: websiteHourlyData,
                                    location: req.session.cityName,
                                    activeHour: Number(req.session.hourlyDataListIndex),
                                    dailyDataList: req.session.dailyData,
                                    activeDay: req.session.dailyDataIndex,
                                };

                                res.render("weather-app", renderedData);
                                console.log("data has been taken");
                                timeOut(req);
                            });
                        }
                    });
                });
            }
        });
    } else {
        let websitePassingData = req.session.hourlyDataList[req.session.dailyDataIndex][req.session.hourlyDataListIndex];
        let websiteHourlyData = req.session.hourlyDataList[req.session.dailyDataIndex];
        let renderedData = {
            passedData: (req.session.userInteracted) ? websitePassingData : req.session.weatherData,
            hourlyData: websiteHourlyData,
            location: req.session.cityName,
            activeHour: Number(req.session.hourlyDataListIndex),
            dailyDataList: req.session.dailyData,
            activeDay: req.session.dailyDataIndex,
        };

        res.render("weather-app", renderedData);
    }
});

//-------- handle POST requests
app.post("/newsletter", function (req, res) {
    res.send("Thank you for subscribing to our newsletter");
    res.redirect("/");
});

app.post("/", function (req, res) {
    req.session.userInteracted = false;
    res.redirect("/");
})

app.post("/location", function (req, res) {
    let location = req.body.city;
    req.session.city = location;
    for (let i = 0; i < location.length; i++) {
        if (location[i] === " " || location[i] === ",") {
            req.session.cityName = location.slice(0, i);
            break;
        }
    }
    req.session.url = endPoint + "q=" + req.session.city + "&APPID=" + apiKey + "&units=" + unit;
    req.session.weatherUrl = weatherEndPoint + "q=" + req.session.city + "&APPID=" + apiKey + "&units=" + unit;
    req.session.userInteracted = false;
    req.session.hourlyDataListIndex = 0;
    req.session.dailyDataIndex = 0;
    res.redirect("/");
});

app.post("/hour", function (req, res) {
    req.session.hourlyDataListIndex = req.body.hour;
    timeOut(req);
    res.redirect("/");
});

app.post("/day", function (req, res) {
    req.session.dailyDataIndex = req.body.day;
    req.session.hourlyDataListIndex = 0;
    timeOut(req);
    res.redirect("/");
});

//-------- creating the server and configuring it to run in port 3000
app.listen(process.env.PORT || 3000, function () {
    console.log("Server is running");
});
