//-------- importing all the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const https = require("https");

//---- importing modules which are created locally
const days = require(__dirname + '/date.js');


//-------- creating the app and configuring it with EJS
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");



//-------- API details
const apiKey = "ebe9584751e3188b8783b568299374ff";
const unit = "metric";
const endPoint = "https://api.openweathermap.org/data/2.5/weather?";
let city = "Dhaka,Bangladesh";
let url = endPoint + "q=" + city + "&APPID=" + apiKey + "&units=" + unit;




//-------- creating the necessary variables to store the data from the API
let daysName = days.days();
let data;





//-------- creating the get request for the home page
app.get("/", function(req,res) {
    //-retrieving the weather data as a response form the open weather map API
    https.get(url, function(response) {
        response.on("data", function(dataString) {
            data = JSON.parse(dataString)
            res.render("weather-app", {
                days : data.main.temp,
            })
        })
    })
})


//-------- creating the post request for subscribing to the newsletter
app.post("/newsletter", function(req,res) {
    res.send("Thank you for subscribing to our newsletter");
})


//-------- redirecting the user to the home page if the provide a city
app.post("/location", function(req,res) {
    let location = req.body.city;
    city = location;
    res.redirect("/")
})

//-------- creating the serer socket to listen to the port
app.listen(process.env.PORT || 3000, function() {
    console.log("Server is running on port 3000");
})