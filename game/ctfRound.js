const gatherRound = require("./gatherRound")
const constants = require("./constants")

const SOLDAT_EVENTS = constants.SOLDAT_EVENTS
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS

class CtfRound extends gatherRound.GatherRound {

    constructor(getCurrentTimestamp) {
        super(getCurrentTimestamp)
        this.redCaps = 0
        this.blueCaps = 0
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

module.exports = {
    CtfRound
}