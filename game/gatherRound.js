const _ = require("lodash")
const logger = require("../utils/logger")
const util = require("util")

class GatherRound {

    constructor(getCurrentTimestamp) {
        this.startTime = undefined
        this.endTime = undefined
        this.winner = undefined
        this.mapName = undefined
        this.getCurrentTimestamp = getCurrentTimestamp
        this.events = []
    }

    changeMap(mapName) {
        this.mapName = mapName;
        this.startTime = this.getCurrentTimestamp();
        this.events = [];
        this.reset()
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

    reset() {
        throw new Error("Not implemented")
    }

    end() {
        throw new Error("Not implemented")
    }

    newRound() {
        throw new Error("Not implemented")
    }
}

module.exports = {
    GatherRound,
}

