/*
Alexa skill for reading Fitbark dog monitor information.

The skill requires users to first authorize the app through an
Oath exchange, and the token I get is used for calling FitBark APIs.

The skill relies on users to already sync their data, and is not
capable of directly reading data from the dog monitors.

*/

'use strict';
var Alexa = require("alexa-sdk");
var Client = require('node-rest-client').Client;
var constants = require("./constants.js");
var goalChange = require("./goal_change.js");
var utilities = require("./utilities.js");

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers,goalChange.chooseDogHandlers,goalChange.confirmGoalHandlers,goalChange.goalSettingHandlers);
    alexa.execute();
};


/*
Handlers registered with Alexa.  Each represents an event
either sent by Alexa or triggered internally.
*/
var handlers = {
    'LaunchRequest': function () {
        if (this.event.session.user.accessToken == undefined){
            this.emit('RequestCredentials');
        } else {
            this.emit('DogRelations');
        }
    },
    "AMAZON.HelpIntent" : function(){
        let speech = "Say <emphasis>launch " + constants.skillName + "</emphasis> for the most recent activity points. "
            + " Say <emphasis>ask " +  constants.skillName + "</emphasis> for a daily report, for a comparison with other dogs,"
            + " for a comparison by breed, "
            + " to set a new goal,"
            + " or for the current battery levels. "; 
        this.emit(":tell",speech);
    },
    "SessionEndedRequest": function () {
        console.log("Session ended after LaunchRequest with no response.");
    },
    'RequestCredentials':function(){
        this.emit(':tellWithLinkAccountCard', "You must link your fitbark account through the Alexa app before you can continue.");
    },
    'ChangeGoal': function() {
        if (this.event.session.user.accessToken == undefined){
            this.emit('RequestCredentials');
        } else {            
            this.attributes["requestType"] = "setgoal";
            this.emit('DogRelations');
        }  
    },    
    'DailyReport': function() {
        if (this.event.session.user.accessToken == undefined){
            this.emit('RequestCredentials');
        } else {
            this.attributes["requestType"] = "report";
            this.emit('DogRelations');
        }  
    },
    'BatteryIntent': function () {
        if (this.event.session.user.accessToken == undefined){
            this.emit('RequestCredentials');
        } else {
            this.attributes["requestType"] = "battery";
            this.emit('DogRelations');
        }       
    },   
    'CompareIntent': function () {
            this.emit('CompareAgeWeight');
    },     
    'CompareAgeWeight': function () {
        if (this.event.session.user.accessToken == undefined){
            this.emit('RequestCredentials');
        } else {
            this.attributes["requestType"] = "sizecomparison";
            this.emit('DogRelations');
        }       
    },
    'CompareBreedIntent': function () {
        if (this.event.session.user.accessToken == undefined){
            this.emit('RequestCredentials');
        } else {
            this.attributes["requestType"] = "breedcomparison";
            this.emit('DogRelations');
        }       
    },    
    'DogRelations': function () {

        const accessToken = this.event.session.user.accessToken;
        
        const client = new Client();
    
        const aws = this;

        const requestType = this.attributes.requestType;
        const args = {
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken }
        };
        
        const result = client.get("https://app.fitbark.com/api/v2/dog_relations",args, function (data, response) {
            
            if (response.headers.status == "401 Unauthorized"){
                aws.emit('RequestCredentials');
                return;
            }
            const dogsOwnedByUser = new Array();
            for(let dogRelationIndex in data.dog_relations){    		                
                const dogRelation = data.dog_relations[dogRelationIndex];
                if ("OWNER" != dogRelation.status){
                    continue;
                }
                dogsOwnedByUser.push(dogRelation);
            }
            if (requestType == "setgoal"){
                goalChange.startGoalDogChoice.call(aws,dogsOwnedByUser);
            }
            if (requestType == "report"){    
                getBasicSummary.call(aws,dogsOwnedByUser,true);
                
            }else if (requestType == "sizecomparison"){
                getComparison.call(aws,dogsOwnedByUser,accessToken,"basic");
            }else if (requestType == "battery") {
                getBattery.call(aws,dogsOwnedByUser,accessToken);
            }else if (requestType == "breedcomparison") {
                getComparison.call(aws,dogsOwnedByUser,accessToken,"breed");
            }else {
                getBasicSummary.call(aws,dogsOwnedByUser,false);
                
            }
        }).on('error', function (err) {
            console.error('Something went wrong on the client', err);
            aws.emit(":tell", "Sorry, something has gone wrong retrieving your fitbark information");
        });
        
    }
};


function getBattery(dogsOwnedByUser, accessToken){

    let speech = "";
    for(var dogRelationIndex in dogsOwnedByUser){    
        const dogRelation = dogsOwnedByUser[dogRelationIndex];
    	const dog = dogRelation.dog;
        speech+=dog.name + " has " + dog.battery_level + " percent battery left. "
    }
    this.emit(":tell",speech);
}
function getComparison(dogsOwnedByUser, accessToken,compareType){

    const dogs = new Array();
    let speech = "";
    for(let dogRelationIndex in dogsOwnedByUser){    
        const dogRelation = dogsOwnedByUser[dogRelationIndex];

    	const dog = dogRelation.dog;
        dogs.push(dog);
    }
    const client = new Client();
    let numProcessed = 0;
    //create a reference to the context so you can access it in the 
    //event that handles the similar_dog_stats call
    let aws = this;
    for (let i = 0; i < dogs.length; i++){
        const args = {
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken },
            data: {"slug": dogs[i].slug}
        };
        
        const result = client.post("https://app.fitbark.com/api/v2/similar_dogs_stats",args, function (data, response) {
            var dog = dogs[numProcessed];

            if (compareType == "breed"){
                if (dog.breed1 == undefined || dog.breed1.name == undefined
                 || dog.breed1.name == ""){
                    speech = dog.name + " does not have any breed information for a breed comparison.";
                } else {
                    speech+= dog.name + " has " 
                        + Number(data.similar_dogs_stats.this_average_daily_activity).toLocaleString() 
                        + " average daily activity points compared with "
                        + data.similar_dogs_stats.median_same_breed_daily_activity 
                        + " for all " + dog.breed1.name.toLowerCase() + "'s. ";
                }
            } else {
                speech+= dog.name + " has " + data.similar_dogs_stats.this_average_daily_activity 
                    + " average daily activity points compared with "
                    + data.similar_dogs_stats.median_same_age_weight_daily_activity 
                    + " for dogs of the same age and weight. ";
            }   
            if (numProcessed == dogs.length-1){
                console.log("last item");
                aws.emit(":tell",speech);
            }
            numProcessed++;


        }).on('error', function (err) {
            console.error('Something went wrong on the client', err);
            this.emit(":tell", "Sorry, something has gone wrong retrieving your fitbark information");
        });        
    }

}
function getBasicSummary(dogsOwnedByUser, includeGoalValue){
    let accessToken = this.event.session.user.accessToken;
    let client = new Client();
    let speech = "Here is your FitBark report. ";
    let aws = this;
    //count down the dogs as you process them to know that the last
    //REST invocation event has occurrent, and speech should be flushed.
    var dogCountDown = dogsOwnedByUser.length;
    for(let dogRelationIndex in dogsOwnedByUser){    
        const dogRelation = dogsOwnedByUser[dogRelationIndex];

    	const dog = dogRelation.dog;
        const activityDate = new Date(dog.activity_date);
        //Get the current date transformed to the user's timezone
        //so that concepts like "today" or "yesterday" don't sound wrong
        //at different times of the day.
        const currentLocalizedDate = utilities.getDateWithUTCOffset(dog.tzoffset/60/60);
        
        const aweekAgo = new Date(currentLocalizedDate).setDate(currentLocalizedDate.getDate() - 7);
        
        if (activityDate < aweekAgo){
            //If the data hasn't been retrieved for a week, consider this too stale and notify
            speech+=dog.name + " has no activity since <say-as interpret-as=\"date\">????" 
                        + ("0" + (activityDate.getMonth() + 1)).slice(-2)
                        + ("0" + (activityDate.getDate() + 1)).slice(-2)
                        + "</say-as>. ";
            speech +="<break strength=\"strong\"/>";
            dogCountDown--;
            if (dogCountDown == 0){
                onBasicSummaryComplete.call(this,speech,includeGoalValue);
            }
        }
        else{

            //retrieve the daily goal
            const args = {
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken }
            };
            
            const result = client.get("https://app.fitbark.com/api/v2/daily_goal/"+dog.slug,args, function (data, goalResponse) {
                let dailyGoal = findDailyGoalForActivityDate(dog.activity_date,goalResponse);
                if (dailyGoal == null){
                    dailyGoal = dog.daily_goal;
                }
                if (dog.activity_value >= dailyGoal){
                    //Use a random Alexa interjection for a fun-sounding reward when the goal is reached                
                    speech+=getPositiveInterjection();                
                }else{
                    speech+=getNegativeInterjection();
                }
                speech+=dog.name + " has " 
                            + Number(dog.activity_value).toLocaleString() 
                            + " activity points for "
                            + getRelativeDateOfWeek(currentLocalizedDate,activityDate);
                if (dog.activity_value >= dailyGoal){           
                    speech += ", meeting " 
                } else {
                    speech += ", not quite making " 
                }
                switch(dog.gender){
                    case "M":
                        speech+="his";
                        break;
                    case "F":
                        speech+="her";
                        break;
                    default:
                        speech+="their";    
                }
                if (includeGoalValue){
                    speech += " daily goal of "+ Number(dailyGoal).toLocaleString() + ". ";
                }else{
                    speech += " daily goal.";
                }
                speech +="<break strength=\"strong\"/>";

                dogCountDown--;
                if (dogCountDown == 0){
                    onBasicSummaryComplete.call(aws,speech,includeGoalValue);
                }

            }).on('error', function (err) {
                console.error('Something went wrong on the client', err);
                this.emit(":tell", "Sorry, something has gone wrong retrieving your fitbark information");
            });      
        }
                
    }

}

function onBasicSummaryComplete(speech,includeGoalValue){
    if (includeGoalValue != true){
        speech += " Say \"help\" for more commands.";
        this.emit(":ask",speech);
    }else{
        this.emit(":tell",speech);
    }     
}
function findDailyGoalForActivityDate(activityDate,dailyGoals){
    for (let i = 0; i < dailyGoals.length; i++){
        const goalDate = new Date(dailyGoals[i].date);
        if (goalDate > activityDate){
            continue;
        }
        if (goalDate <= activityDate){
            return dailyGoals[i].goal;
        }
    }
    return null;
}

function getNegativeInterjection(){
    const interjections = ["ahem","ruh roh","argh","aw man","blah","darn","d’oh","shucks","oh brother","phooey","wah wah"];
    const targetIndex = utilities.getRandomInt(0,interjections.length-1);
    return formatInterjection(interjections[targetIndex]);
}

function getPositiveInterjection(){
    const interjections = ["woof","all righty","read ‘em and weep","hip hip hooray","oh snap","ooh la la","wahoo","well done","way to go"];
    const targetIndex = utilities.getRandomInt(0,interjections.length-1);
    return formatInterjection(interjections[targetIndex]);
}

function formatInterjection(interjection){
    let result ="<say-as interpret-as=\"interjection\">";
    result+=interjection;
    return result+="</say-as> <break strength=\"strong\"/>";
}

function getRelativeDateOfWeek(currentLocalizedDate,d){
    if (d.getDate() == currentLocalizedDate.getDate()){
        return "today";
    }
    const yesterday = new Date(currentLocalizedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() == yesterday.getDate()){
        return "yesterday";
    }
    const weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";

    return weekday[d.getDay()];

}