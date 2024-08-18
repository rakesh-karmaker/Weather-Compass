//-------- import all the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const https = require("https");
require("dotenv").config();

//---- import modules which are created locally
const daysModule = require(__dirname + '/date.js');


//-------- create the app and configuring it with EJS
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");



//-------- API details
const apiKey = process.env.API_KEY;
const unit = "metric";
const endPoint = "https://api.openweathermap.org/data/2.5/forecast?";
// const endPoint = "https://api.openweathermap.org/data/2.5/weather?";
let city = "Dhaka,Bangladesh";
let url = endPoint + "q=" + city + "&APPID=" + apiKey + "&units=" + unit;



//-------- create the necessary variables to store the data from the API
let cityName = "Dhaka";
let userHourChoose = false;
let daysName = daysModule.days();
let currentDate = daysModule.currentDate();
let hourlyDataList = [];
let dailyData = [];
let hourlyDataListIndex = 1;
let dailyDataIndex = 0;
let websitePassingData;
let websiteHourlyData;


// -------- create a function to convert the time format
function tConvert (time) {
    // Check correct time format and split into components
    time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
        time = time.slice (1);  // Remove full string match value
        time[5] = +time[0] < 12 ? ' AM' : ' PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join (''); // return adjusted time or original string
}

//-------- create a function to break down the data object to store only the data we need
function distributeData(data) {
    let dataList = data.list;
    let dateIndex = (dataList[0].dt_txt).slice(8, 10);
    let startingIndex = (dateIndex != currentDate) ? 1 : 0;

    // console.log(dateIndex);
    let hourlyData = [];
    let dayIndex = 0;
    let currentMax = Math.round(Number(dataList[startingIndex].main.temp_max));
    let currentMin = Math.round(Number(dataList[startingIndex].main.temp_min));
    let dailyDes = dataList[startingIndex].weather[0].main;
    let dailyIcon = dataList[startingIndex].weather[0].icon;


    for (let i = startingIndex; i < dataList.length; i++) {
        let weatherDataSet = dataList[i];

        // if is changes to a new date then add the previous date's data to the hourlyDataList
        if (dateIndex != String(weatherDataSet.dt_txt).slice(8, 10) && dayIndex < 5) {
            
            hourlyDataList.push(hourlyData);
            hourlyData = [];
            
            // add the new date's data to the dailyData for 5 days
            dailyData.push({
                day : daysName[dayIndex],
                date : dateIndex,
                des : dailyDes,
                icon : dailyIcon,
                max : currentMax,
                min : currentMin
            })
            dayIndex++;
            
            currentMax = Math.round(Number(weatherDataSet.main.temp_max));
            currentMin = Math.round(Number(weatherDataSet.main.temp_min));
            dailyDes = weatherDataSet.weather[0].main;
            dailyIcon = weatherDataSet.weather[0].icon;

            dateIndex = String(weatherDataSet.dt_txt).slice(8, 10);
        }


        // add the current necessary weather data to the hourlyData
        hourlyData.push ({
            icon : weatherDataSet.weather[0].icon,
            hour : tConvert(weatherDataSet.dt_txt.slice(11, 16)),

            temp : Math.floor(Number(weatherDataSet.main.temp)),
            feelsLike : Number(weatherDataSet.main.feels_like),
            humidity : weatherDataSet.main.humidity + "%",
            clouds : weatherDataSet.clouds.all + "%",
            wind_speed : Math.round(Number((weatherDataSet.wind.speed * 18) / 5)) + " km/h",
            visibility : Number((weatherDataSet.visibility) / 1000) + " km",
            pressure : weatherDataSet.main.pressure + " hPa",  
        })


        // checks if the currentMax and currentMin is changed than the update the currentMax and currentMin
        currentMax = (currentMax < Math.round(Number(weatherDataSet.main.temp_max))) ? Math.round(Number(weatherDataSet.main.temp_max)) : currentMax;
        currentMin = (currentMin > Math.round(Number(weatherDataSet.main.temp_min))) ? Math.round(Number(weatherDataSet.main.temp_min)) : currentMin;
    }

    // add the last date's data to the dailyData
    if (dayIndex < 5) {
        dailyData.push({
            day : daysName[dayIndex],
            date : dateIndex,
            des : dailyDes,
            icon : dailyIcon,
            max : currentMax,
            min : currentMin
        })
    }
}


//-------- creating the get request for the home page
app.get("/", function(req,res) {
    //-retrieve the weather data as a response form the open weather map API
    https.get(url, function(response) {
        if (response.statusCode === 404) {
            //!------ Handle the error if the city is not found
            res.send("Error, please enter a valid city");
        }
        else if (response.statusCode === 429) {
            //!------ Handle the error if the API limit is reached
            res.send("Error, please try again later");
        }
        
        else {
            //-convert the data and render the webpage
            let dataString = "";
            //-collecting all the data packets from the API
            response.on("data", function(chunk) {
                dataString += chunk;
            })

            //-once all the data is collected
            response.on("end", function() {
                distributeData(JSON.parse(dataString));


                if (!userHourChoose) {
                    hourlyDataListIndex = (hourlyDataList.length === 1) ? 0 : 1;
                }
                websitePassingData = hourlyDataList[dailyDataIndex][hourlyDataListIndex];
                websiteHourlyData = hourlyDataList[dailyDataIndex];
                res.render("weather-app", {
                    passedData : websitePassingData,
                    hourlyData : websiteHourlyData,
                    location : cityName,
                    activeHour : Number(hourlyDataListIndex),
                    dailyDataList : dailyData,
                    activeDay : dailyDataIndex,
                })
                console.log(dailyData);
            })
        }
    })
})


//-------- create the post request for subscribing to the newsletter
app.post("/newsletter", function(req,res) {
    res.send("Thank you for subscribing to our newsletter");
    res.redirect("/");
})


//-------- redirect the user to the home page if the provide a city
app.post("/location", function(req,res) {
    let location = req.body.city;
    city = location;
    for (let i = 0; i < city.length; i++) {
        if (city[i] === " " || city[i] === ",") {
            cityName = city.slice(0, i);
            break;
        }
    }
    res.redirect("/")
})


//-------- redirect the user to the home page with the hourIndex changed if the user choose a different hour
app.post("/hour", function(req, res) {
    let index = req.body.hour;
    hourlyDataListIndex = index;
    userHourChoose = true;
    dailyData = [];
    hourlyDataList = [];
    res.redirect("/");
})


//-------- redirect the user to the home page with the dayIndex changed if the user choose a different day
app.post("/day", function(req, res) {
    let index = req.body.day;
    dailyDataIndex = index;
    userDayChoose = false;
    dailyData = []; 
    hourlyDataList = [];
    res.redirect("/");
})



//-------- create the serer socket to listen to the port
app.listen(process.env.PORT || 3000, function() {
    console.log("Server is running on port 3000");
})