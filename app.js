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










//-------- creating the get request for the home page
app.get("/", function(req,res) {
    res.render("weather-app", {
        days : days.days(),
    })
})


//-------- creating the post request for subscribing to the newsletter
app.post("/newsletter", function(req,res) {
    res.send("Thank you for subscribing to our newsletter");
})



//-------- creating the serer socket to listen to the port
app.listen(process.env.PORT || 3000, function() {
    console.log("Server is running on port 3000");
})