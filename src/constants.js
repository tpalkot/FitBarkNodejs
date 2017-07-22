'use strict';

module.exports = Object.freeze({
    skillName : "fitbark",

    CONVERSATION_STATES : {
        CHOOSEDOG: "_CHOOSEDOG", // User is setting their goal
        CONFIRMGOAL: "_CONFIRMGOAL", // User confirms their choice
        GOAL: "_SETGOAL" // User is setting their goal
    }
});