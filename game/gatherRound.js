const _ = require("lodash")
const logger = require("../utils/logger")
const constants = require("./constants")
const util = require("util")

const SOLDAT_EVENTS = constants.SOLDAT_EVENTS
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS

class GatherRound {

    redCaps = 0
    blueCaps = 0
    startTime = undefined
    endTime = undefined
    winner = undefined
    getCurrentTimestamp = undefined
    events = []
    mapName = "Decided in-game"

    constructor(getCurrentTimestamp) {
        this.getCurrentTimestamp = getCurrentTimestamp
    }

    redFlagCaptured() {
        this.blueCaps += 1;
        this.pushEvent(SOLDAT_EVENTS.FLAG_CAP, {
            cappingTeam: SOLDAT_TEAMS.BLUE
        })
    }

    blueFlagCaptured() {
        this.redCaps += 1;
        this.pushEvent(SOLDAT_EVENTS.FLAG_CAP, {
            cappingTeam: SOLDAT_TEAMS.RED
        })
    }

    changeMap(mapName) {
        this.mapName = mapName;
        this.startTime = this.getCurrentTimestamp();
        this.redCaps = 0;
        this.blueCaps = 0;
        this.events = [];
    }
    
    end() {
        if (this.redCaps > this.blueCaps) {
            this.winner = SOLDAT_TEAMS.RED;
        } else if (this.blueCaps > this.redCaps) {
            this.winner = SOLDAT_TEAMS.BLUE;
        } else {
            this.winner = SOLDAT_TEAMS.TIE;
        }

        this.endTime = this.getCurrentTimestamp()
    }

    pushEvent(eventType, eventBody = {}) {
        const event = {
            type: eventType,
            timestamp: this.getCurrentTimestamp(),
            ...eventBody
        }

        logger.log.info(`Pushing event ${util.inspect(event)}`)
        this.events.push(event)
    }
}

module.exports = {
    GatherRound,
}

