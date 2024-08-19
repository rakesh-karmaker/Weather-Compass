// days function to give you the first 5 days short name of the week from today
exports.days = function() { 
    const daysName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = ["Today"];
    const date = new Date();
    const options = { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const bangladeshDate = new Date(date.toLocaleString('en-US', options));
    
    const currentDay = bangladeshDate.getDay();
    let index = currentDay + 1;

    for(let i = 0; i < 4; i++) {
        if (index > (daysName.length - 1)) {
            index = 0;
        }
        days.push(daysName[index]);
        index++;
    }

    return days;
}

exports.currentDate = function () {
    const date = new Date();
    const options = { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const bangladeshDate = new Date(date.toLocaleString('en-US', options));
    return bangladeshDate.getDate();
}