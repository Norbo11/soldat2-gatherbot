import gatherRound from './gatherRound';
import constants from './constants';
const SOLDAT_EVENTS = constants.SOLDAT_EVENTS
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS


class CtbRound extends gatherRound.GatherRound {

    constructor(getCurrentTimestamp) {
        super(getCurrentTimestamp)
        this.redCaps = 0
        this.blueCaps = 0
    }

    blueCapturedBase() {
        this.blueCaps += 1;
        this.pushEvent(SOLDAT_EVENTS.BASE_CAPTURE, {
            cappingTeam: SOLDAT_TEAMS.BLUE
        })
    }

    redCapturedBase() {
        this.redCaps += 1;
        this.pushEvent(SOLDAT_EVENTS.BASE_CAPTURE, {
            cappingTeam: SOLDAT_TEAMS.RED
        })
    }

    reset() {
        this.redCaps = 0;
        this.blueCaps = 0;
    }

    end(winner) {
        this.winner = winner
        this.endTime = this.getCurrentTimestamp()
    }

    newRound() {
        return new CtbRound(this.getCurrentTimestamp)
    }
}

export default {
    CtbRound
};