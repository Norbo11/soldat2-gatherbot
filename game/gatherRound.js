import _ from 'lodash';
import logger from '../utils/logger';
import util from 'util';
import constants from '../game/constants';

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

    playerKill(killerDiscordId, killerTeam, victimDiscordId, victimTeam, weaponName) {
        this.pushEvent(constants.SOLDAT_EVENTS.PLAYER_KILL, {
            killerDiscordId,
            killerTeam,
            victimDiscordId,
            victimTeam,
            weaponName
        })
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

export default {
    GatherRound,
};

