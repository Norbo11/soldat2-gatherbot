import gatherRound from './gatherRound';
import {SOLDAT_EVENTS, SOLDAT_TEAMS} from './constants';

class CtfRound extends gatherRound.GatherRound {

    constructor(getCurrentTimestamp) {
        super(getCurrentTimestamp)
        this.redCaps = 0
        this.blueCaps = 0
    }

    redFlagCaptured(discordId) {
        this.blueCaps += 1;
        this.pushEvent(SOLDAT_EVENTS.FLAG_CAP, {
            cappingTeam: SOLDAT_TEAMS.BLUE,
            discordId: discordId,
        })
    }

    blueFlagCaptured(discordId) {
        this.redCaps += 1;
        this.pushEvent(SOLDAT_EVENTS.FLAG_CAP, {
            cappingTeam: SOLDAT_TEAMS.RED,
            discordId: discordId,
        })
    }

    reset() {
        this.redCaps = 0;
        this.blueCaps = 0;
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

    newRound() {
        return new CtfRound(this.getCurrentTimestamp)
    }
}

export default {
    CtfRound
};