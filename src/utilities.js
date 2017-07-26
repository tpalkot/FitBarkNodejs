'use strict';

module.exports = {
        getDateWithUTCOffset: function (inputTzOffset){
        const now = new Date(); // get the current time

        const currentTzOffset = -now.getTimezoneOffset() / 60 // in hours, i.e. -4 in NY
        const deltaTzOffset = inputTzOffset - currentTzOffset; // timezone diff

        const nowTimestamp = now.getTime(); // get the number of milliseconds since unix epoch 
        const deltaTzOffsetMilli = deltaTzOffset * 1000 * 60 * 60; // convert hours to milliseconds (tzOffsetMilli*1000*60*60)
        const outputDate = new Date(nowTimestamp + deltaTzOffsetMilli) // your new Date object with the timezone offset applied.

        return outputDate;
    },

    getDateYYYYMMDD : function (d) {
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        const dateArray = [year, month, day];
        const resultString = dateArray.join('-');
        return resultString;
    },
    getRandomInt : function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
