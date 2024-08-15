// days function to give you the first 5 days short name of the week from today
exports.days = function() { 
    const daysName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = [];
    const dateObject = new Date();
    const currentDay = dateObject.getDay();
    let index = currentDay;

    for(let i = 0; i < 5; i++) {
        if (index > (daysName.length - 1)) {
            index = 0;
        }
        days.push(daysName[index]);
        index++;
    }

    return days;
}