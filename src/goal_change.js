'use strict';

var Alexa = require("alexa-sdk");
var Client = require('node-rest-client').Client;
var constants = require("./constants.js");
var utilities = require("./utilities.js");

var stateHandlers = {
        startGoalDogChoice: function(dogsOwnedByUser){

        var speech = "Choose which dog to set a goal for. ";
        var i = 0;
        this.attributes.dogs = new Array();
        for(var dogRelationIndex in dogsOwnedByUser){    
            var dogRelation = dogsOwnedByUser[dogRelationIndex];

            var dog = dogRelation.dog;
            this.attributes.dogs[i] = {"name":dog.name,"goal":dog.daily_goal,
                "slug":dog.slug,"tzoffset":dog.tzoffset};
            i++;
            
            speech+="Say " + i + " for " + dog.name + ". ";
        }
        if (i == 1){
            //if there is only one dog, don't ask this question.  Jump directly to
            //after a choice has been made
            this.handler.state = constants.CONVERSATION_STATES.CHOOSEDOG;
            this.attributes["chosenDogIndex"] = 0;
            this.emitWithState("AnswerNumber");
        }else{
            this.handler.state = constants.CONVERSATION_STATES.CHOOSEDOG;
            this.emit(":ask",speech, speech);
        }
    },
    chooseDogHandlers : Alexa.CreateStateHandler(constants.CONVERSATION_STATES.CHOOSEDOG, {
        "AnswerNumber": function () {
            handleDogChoice.call(this);
        },
        "AMAZON.HelpIntent" : function(){
            var speech = "Ask " + constants.skillName + " to set a goal, then specify a dog by number, and a activity point goal"; 
            this.emit(":ask",speech);
        },    
        "AMAZON.CancelIntent": function () {
            this.emit(":tell", "No problem, your dog's goals remain unchanged.");
        },
        "Unhandled": function () {
            var speechOutput = "I did not understand which dog.  Say a number";
            this.emit(":ask", speechOutput, speechOutput);
        },
        "SessionEndedRequest": function () {
            console.log("Session ended during goal set");
        }
    }),
    confirmGoalHandlers : Alexa.CreateStateHandler(constants.CONVERSATION_STATES.CONFIRMGOAL, {
        "AMAZON.YesIntent": function () {
            handleNewGoal.call(this);
        },    
        "AMAZON.NoIntent": function () {
            this.emitWithState("AMAZON.CancelIntent");
        },
        "AMAZON.CancelIntent": function () {
            this.emit(":tell", "No problem, your dog's goals remain unchanged.");
        },
        "Unhandled": function () {
            var speechOutput = "Please say yes or no.";
            this.emit(":ask", speechOutput, speechOutput);
        },
        "SessionEndedRequest": function () {
            console.log("Session ended during goal set");
        }
    }),
    goalSettingHandlers : Alexa.CreateStateHandler(constants.CONVERSATION_STATES.GOAL, {
        "AnswerNumber": function () {
            handleConfirmNewGoal.call(this);
        },
        "AMAZON.CancelIntent": function () {
            this.emit(":tell", "No problem, your dog's goals remain unchanged.");
        },
        "Unhandled": function () {
            var speechOutput = "I did not understand your goal value, could you repeat it?";
            this.emit(":ask", speechOutput, speechOutput);
        },
        "SessionEndedRequest": function () {
            console.log("Session ended during goal set");
        }
    })
}

module.exports = stateHandlers;

function handleDogChoice(){

    if (this.attributes["chosenDogIndex"] == undefined){
        var answerIsValid = isAnswerSlotValid(this.event.request.intent);

        var dogIndex = Number(this.event.request.intent.slots.AnswerValue.value)-1;
        if (dogIndex > this.attributes.dogs.length)
        {
            answerIsValid = false;
        }   
        
    }else{
        dogIndex = this.attributes.chosenDogIndex;
    }
    var dogInfo = this.attributes.dogs[dogIndex];
    this.attributes["chosenDogIndex"] = dogIndex;

    var speech = "The current goal for " + dogInfo.name + " is " + dogInfo.goal + ". What do you want the new goal to be?"
    this.handler.state = constants.CONVERSATION_STATES.GOAL;
    this.emit(":ask",speech,speech);

}

function handleConfirmNewGoal(){

    var answerIsValid = isAnswerSlotValid(this.event.request.intent);

    var newGoalValue = Number(this.event.request.intent.slots.AnswerValue.value);

    var dogIndex = this.attributes["chosenDogIndex"];
    this.attributes["newGoal"] = newGoalValue;

    var speech = "Your new goal for " + this.attributes.dogs[dogIndex].name + " will be set to " + newGoalValue
        + ".  Is this correct?";
    this.handler.state = constants.CONVERSATION_STATES.CONFIRMGOAL;

    this.emit(":ask",speech,speech);

}


function handleNewGoal(){    

    var newGoalValue = this.attributes["newGoal"];

    var dogIndex = this.attributes["chosenDogIndex"];

    var dogInfo = this.attributes.dogs[dogIndex];
    var accessToken = this.event.session.user.accessToken;        
        
    var client = new Client();

    var aws = this;

    
    var targetDate = utilities.getDateYYYYMMDD(new Date());
    var args = {
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken },
        data: {"daily_goal" : newGoalValue,"date" : targetDate}
    };
    
    var result = client.put("https://app.fitbark.com/api/v2/daily_goal/"+dogInfo.slug,args, function (data, response) {

        if (response.headers.status == "401 Unauthorized"){
            aws.emit('RequestCredentials');
            return;
        }
        var speech = "Your new goal for " + dogInfo.name + " is now changed to " + newGoalValue;
        aws.emit(":tell",speech);        
    }).on('error', function (err) {
        console.error('Something went wrong on the client', err);
        aws.emit(":tell", "Sorry, something has gone wrong retrieving your fitbark information");
    });

}

function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent && intent.slots && intent.slots.AnswerValue && intent.slots.AnswerValue.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.AnswerValue.value));
    return answerSlotIsInt && parseInt(intent.slots.AnswerValue.value) > 0;
}


