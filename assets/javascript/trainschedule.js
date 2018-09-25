
// Firebase API key and config info
var config = {
    apiKey: "AIzaSyBD0Mxe0VarwSj2DbHZf6opy7UgFqW5_XA",
    authDomain: "mytraintracking.firebaseapp.com",
    databaseURL: "https://mytraintracking.firebaseio.com",
    projectId: "mytraintracking",
    storageBucket: "mytraintracking.appspot.com",
    messagingSenderId: "228902046169"
};

firebase.initializeApp(config);

var database = firebase.database();
var trainRef = database.ref('traindb/trainschedule');
var trainArrayObj = [];
var numberofentries = 0;
var intervalId;
var screenDate;
var screenDatetemp;

// Submit button that stores the data to firebase
$("#add-train-btn").on("click", function (event) {
    event.preventDefault();

    var trainname = $('#train-name-input').val().trim();
    var destination = $('#destination-input').val().trim();
    var firstTrainTime = $('#first-train-input').val().trim();
    var frequency = $('#frequency-input').val().trim();

    var newExpense = {
        tname: trainname,
        tdest: destination,
        tfirsttrain: firstTrainTime,
        tfreq: frequency,
    };

    trainRef.push(newExpense);
    console.log("Train schedule successfully added");

 $('#train-name-input').val("");
 $('#destination-input').val("");
 $('#first-train-input').val("");
 $('#frequency-input').val("");

});


trainRef.on("value", function (childSnapshot) {

    if (intervalId) {
        clearInterval(intervalId);
    };

    $('#table-body').empty();
    for (let i = 0; i < trainArrayObj.length; i++) {
        calculateNextArrival(i);

        var newRow = $("<tr>").append(
            $('<td id="tname' + i + '">').text(trainArrayObj[i].tname),
            $('<td id="tdest' + i + '">').text(trainArrayObj[i].tdest),
            $('<td id="tfreq' + i + '">').text(trainArrayObj[i].tfreq),
            $('<td id="tnext' + i + '">').text(trainArrayObj[i].tnext),
            $('<td id="tmin' + i + '">').text(trainArrayObj[i].tmin)
        );

        // Append the new row to the table
        $("#train-schedule-table > tbody").append(newRow);
    }
    setScreenDate();

// Offset the seconds differences due to latency to sync the timer with the system date. This is done
// once during the value event of firebase and further down the logic the count routine ensures that the
// offset is still in sync.
    var now = new Date();
    var secsOffset = (60 - now.getSeconds());

    var intervalMilli = secsOffset * 1000;
    intervalId = setInterval(count, intervalMilli);

});

// This routine displays the date on the screen
function setScreenDate() {
    var scr_date_n = new Date().getTime();
    screenDate = moment(scr_date_n).format('LLLL');
    $("#currdate").empty();
    $("#currdate").text(screenDate);
    screenDatetemp = scr_date_n;
}

// The train info fetched from firebase is maintained in the Array. The array is processed every minute
// to calculate the next arrival and to update the minutes to arriaval on screen every minute
function count() {

    // The current interval is cleared to avoid latency and then recalibarated and set again after the calculations
    // are completed.
    if (intervalId) {
        clearInterval(intervalId);
    };

    for (let i = 0; i < trainArrayObj.length; i++) {
        calculateNextArrival(i);
        $('#tnext' + i).empty();
        $('#tnext' + i).text(trainArrayObj[i].tnext);

        $('#tmin' + i).empty();
        $('#tmin' + i).text(trainArrayObj[i].tmin);
    }
    setScreenDate();

    var now = new Date();
    var secsOffset = (60 - now.getSeconds());

    var intervalMilli = secsOffset * 1000;
    intervalId = setInterval(count, intervalMilli);
}

// Ths routine triggers when a new row is added to firebase. The data is fetched and pushed into the local array
trainRef.on("child_added", function (childSnapshot) {
    var trainname = childSnapshot.val().tname;
    var destination = childSnapshot.val().tdest;
    var firstTrainTime = childSnapshot.val().tfirsttrain;
    var frequency = childSnapshot.val().tfreq;

    var newTrain = {
        tname: trainname,
        tdest: destination,
        tfirsttrain: firstTrainTime,
        tfreq: frequency,
        tnext: "00:00",
        tmin: 0
    };

    trainArrayObj.push(newTrain);
    numberofentries++;
});


// This routine calculates the next arrival based on the first train of the day and the duration. 
function calculateNextArrival(trainSeq) {

// Derive the first train time and current date
    var currentDate = moment().format("YYYY-MM-DD");
    var firstTraintoday = currentDate + "T" + trainArrayObj[trainSeq].tfirsttrain + ":00";
    var input_date = new Date(firstTraintoday).getTime();
    var curr_date = new Date().getTime();

// Iterate thru the train array to get the next train past the current time
    expired = false;
    trainNumber = 0;
    while (!expired) {
        nextTrainTime = moment(input_date).add(trainArrayObj[trainSeq].tfreq, "minutes")
        trainNumber++

        if (input_date > curr_date) {
            expired = true;
        } else {
            input_date = nextTrainTime;
        }
    }

    var nextTrainTimeMilitary = moment(input_date).format("hh:mm a");

// Calcualte the minutes away
    var now = moment(new Date(curr_date)); //todays date
    var end = moment(new Date(input_date)); // another date
    var duration = moment.duration(end.diff(now));
    var min = Math.ceil(duration.asMinutes());
    trainArrayObj[trainSeq].tnext = nextTrainTimeMilitary;
    trainArrayObj[trainSeq].tmin = min;
}