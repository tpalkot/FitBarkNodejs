# FitBarkNodejs

This is an Amazon Alexa skill that allows you to ask Alexa for information stored by FitBark about your dog.  It requires that your dog have a FitBark device, and the data must be synchronized to the FitBark server through your phone.  

You can say things like:
Alexa, launch <SKILL NAME>
- It gives you a basic listing of each dog's FitBark points
Alexa, ask <SKILL NAME> for a daily report
- Gives FitBark points plus goal value.
Alex, ask <SKILL NAME> to change my goal
- Allows you to choose a dog and change the daily goal

This is an experiment to learn how the Alexa APIs work, and how nodejs works. Originally I started with Java, but I found that Amazon lambda functions can be really slow with java.  This turned out to be a "cold start" problem.  Amazon has to load the JVM and classpath from the disk if you haven't called the lambda function in a while.  It leads to unacceptably slow responses in a voice exchange sitation.

The example examines:
### OAuth integration with Alexa
Fitbark provides an OAuth authentication interface.  Users are required to open the Alexa phone app and link their accounts.  During this process they are redirected to Fitbark where they enter their username/password.  Successful authentication returns a token that this program can use to make calls to Fitbark on behalf of the Fitbark user. 

### Nodejs event handling
This was a new concept for me.  One REST call retrieves a list of dogs in an event, then each dog needs their own additional REST call in independent events.  The challenge is getting the output of all these events together into one sentence for Alexa to speak.  

### Alexa conversational state
For the daily goal change, you have to ask a series of questions to get to an action.  The program keeps track of the current state conversation, and acts on what you say to Alexa based on that point.  For example, 'help' has different meanings at different points in the convesation.

## Getting Started

### Prerequisites
Install nodejs
You would need a developer account from FitBark for this to work.

### Installing
cd src
npm install
zip -r /tmp/FitBarkLambda.js
You then need to add the lambda function to Amazon AWS
Finally get a developer account from developer.amazon.com and create a skill referencing the lambda function
In the source, speechAssets/IntentSchema.json is what I used for the Natural Language Processing configuration.

## Running Tests
I didn't create real unit tests, but you can run the code offline:

If you execute test/main.js it will run a single Alexa interaction.  The best way to test is to use the amazon Alexa developer console to generate an input JSON, then take it offline with main.js

You need to set an environment property with a valid OAuth user token if you use the examples I checked in.

## Deploying
This is done through AWS

## License
This project is licensed under the Apache 2.0 License - see the [LICENSE.md](LICENSE.md) file for details

