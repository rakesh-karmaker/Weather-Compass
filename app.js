//-------- import all the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const https = require("https");

//---- import modules which are created locally
const daysModule = require(__dirname + '/date.js');


//-------- create the app and configuring it with EJS
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");



//-------- API details
const apiKey = "ebe9584751e3188b8783b568299374ff";
const unit = "metric";
const endPoint = "api.openweathermap.org/data/2.5/forecast?";
let city = "Dhaka,Bangladesh";
let url = endPoint + "q=" + city + "&APPID=" + apiKey + "&units=" + unit;




//-------- create the necessary variables to store the data from the API
let daysName = daysModule.days();
let data;
let hourlyDataList = [];
let hourlyData = [];
let dailyData = [];

//-------- create a function to break down the data object to store only the data we need
function distributeData(data) {
    let dataList = data.list;
    let dateIndex = Number((dataList[0].dt_text).slice(8, 10));
    let dayIndex = 0;



    // add the first date's data to the dailyData
    dailyData.push({
        day : daysName[dayIndex],
        max : Number(dataList[0].main.temp_max),
        min : Number(dataList[0].main.temp_min)
    })


    for (let i = 0; i < dataList.length; i++) {
        let weatherDataSet = dataList[i];

        // if is changes to a new date then add the previous date's data to the hourlyDataList
        if (dateIndex !== Number((weatherDataSet.dt_text).slice(8, 10))) {
            dateIndex = Number((weatherDataSet.dt_text).slice(8, 10));

            hourlyDataList.push(hourlyData);
            hourlyData = [];

            dayIndex++;
            // add the new date's data to the dailyData
            dailyData.push({
                day : daysName[dayIndex],
                max : Number(weatherDataSet.main.temp_max),
                min : Number(weatherDataSet.main.temp_min)
            })
        }


        // add the current necessary weather data to the hourlyData
        hourlyData.push ({
            icon : weatherDataSet.weather[0].icon,
            hour : Number(weatherDataSet.dt_txt.slice(11, 16)),

            temp : Number(weatherDataSet.main.temp),
            feelsLike : Number(weatherDataSet.main.feels_like),
            humidity : weatherDataSet.main.humidity + "%",
            clouds : weatherDataSet.clouds.all + "%",
            wind_speed : Number(((weatherDataSet.wind.speed) * 18) / 5) + " km/h",
            visibility : Number((weather.visibility) / 1000) + " km",
            pressure : weatherDataSet.main.pressure + " hPa",  
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
            response.on("data", function(dataString) {
                data = JSON.parse(dataString)
                distributeData(data);
                res.render("weather-app", {
                    days : data.main.temp,
                })
            })
        }
    })
})


//-------- create the post request for subscribing to the newsletter
app.post("/newsletter", function(req,res) {
    res.send("Thank you for subscribing to our newsletter");
})


//-------- redirect the user to the home page if the provide a city
app.post("/location", function(req,res) {
    let location = req.body.city;
    city = location;
    res.redirect("/")
})

//-------- create the serer socket to listen to the port
app.listen(process.env.PORT || 3000, function() {
    console.log("Server is running on port 3000");
})