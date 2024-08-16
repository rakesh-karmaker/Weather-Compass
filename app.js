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
const endPoint = "https://api.openweathermap.org/data/2.5/forecast?";
// const endPoint = "https://api.openweathermap.org/data/2.5/weather?";
let city = "Dhaka,Bangladesh";
let url = endPoint + "q=" + city + "&APPID=" + apiKey + "&units=" + unit;




//-------- create the necessary variables to store the data from the API
let daysName = daysModule.days();
let hourlyDataList = [];
let dailyData = [];
let hourlyDataListIndex = 0;
let dailyDataIndex = 0;
let websitePassingData;
let websiteHourlyData;


// -------- create a function to convert the time format
function tConvert (time) {
    // Check correct time format and split into components
    time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
        time = time.slice (1);  // Remove full string match value
        time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
        time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join (''); // return adjusted time or original string
}

//-------- create a function to break down the data object to store only the data we need
function distributeData(data) {
    let dataList = data.list;
    let dateIndex = (dataList[0].dt_txt).slice(8, 10);
    // console.log(dateIndex);
    let hourlyData = [];
    let dayIndex = 1;


    // add the first date's data to the dailyData
    dailyData.push({
        day : daysName[0],
        date : dateIndex,
        max : Number(dataList[0].main.temp_max),
        min : Number(dataList[0].main.temp_min)
    })


    for (let i = 0; i < dataList.length; i++) {
        let weatherDataSet = dataList[i];

        // if is changes to a new date then add the previous date's data to the hourlyDataList
        if (dateIndex != String(weatherDataSet.dt_txt).slice(8, 10) && dayIndex < 5) {
            dateIndex = String(weatherDataSet.dt_txt).slice(8, 10);

            hourlyDataList.push(hourlyData);
            hourlyData = [];

            // add the new date's data to the dailyData for 5 days
            dailyData.push({
                day : daysName[dayIndex],
                date : dateIndex,
                max : Number(weatherDataSet.main.temp_max),
                min : Number(weatherDataSet.main.temp_min)
            })
            dayIndex++;
        }


        // add the current necessary weather data to the hourlyData
        hourlyData.push ({
            icon : weatherDataSet.weather[0].icon,
            hour : tConvert(weatherDataSet.dt_txt.slice(11, 16)),

            temp : Number(weatherDataSet.main.temp),
            feelsLike : Number(weatherDataSet.main.feels_like),
            humidity : weatherDataSet.main.humidity + "%",
            clouds : weatherDataSet.clouds.all + "%",
            wind_speed : Math.round(Number((weatherDataSet.wind.speed * 18) / 5)) + " km/h",
            visibility : Number((weatherDataSet.visibility) / 1000) + " km",
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
            let dataString = "";
            //-collecting all the data packets from the API
            response.on("data", function(chunk) {
                dataString += chunk;
            })

            //-once all the data is collected
            response.on("end", function() {
                distributeData(JSON.parse(dataString));

                websitePassingData = hourlyDataList[dailyDataIndex][hourlyDataListIndex];
                websiteHourlyData = hourlyDataList[dailyDataIndex];
                // res.render("weather-app", {
                //     hourlyDataList : hourlyDataList,
                //     dailyData : dailyData
                // })
                console.log(websiteHourlyData);
                res.send("done")
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


//-------- redirect the user to the home page with the hourIndex changed if the user choose a different hour
app.post("/hour", function(req, res) {
    let index = req.body.hour;
    hourlyDataListIndex = index;
    res.redirect("/");
})


//-------- redirect the user to the home page with the dayIndex changed if the user choose a different day
app.post("/day", function(req, res) {
    let index = req.body.day;
    dailyDataIndex = index;
    res.redirect("/");
})



//-------- create the serer socket to listen to the port
app.listen(process.env.PORT || 3000, function() {
    console.log("Server is running on port 3000");
})