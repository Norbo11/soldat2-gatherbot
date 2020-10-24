const logger = require("../utils/logger")
const constants = require("./constants")
const soldat = require("./soldat2")

const PASSIVE_EVENTS = [
    {
        name: "player command",
        pattern: /\[(?<time>.*?)] \[(?<playerName>.*?)] !(?<command>.*)/,
        handler: (gather, match) => gather.playerCommand(match.groups["playerName"], match.groups["command"]),
        condition: gather => true,
        deduplicate: true
    },
    {
        name: "match end",
        pattern: /\[(?<time>.*?)] Match state: Ended/,
        handler: (gather, match) => gather.endRound(),
        condition: gather => gather.gatherInProgress(),
        deduplicate: false
    },
    {
        name: "red flag cap",
        pattern: /\[(?<time>.*?)] Red flag captured/,
        handler: (gather, match) => gather.redFlagCaptured(),
        condition: gather => gather.gatherInProgress(),
        deduplicate: false
    },
    {
        name: "blue flag cap",
        pattern: /\[(?<time>.*?)] Blue flag captured/,
        handler: (gather, match) => gather.blueFlagCaptured(),
        condition: gather => gather.gatherInProgress(),
        deduplicate: false
    },
    // TODO: This should be replaced with an rcon command to get the server info, such as current map, etc.
    {
        name: "change map",
        pattern: /\[(?<time>.*?)] Popup: Loading\.\.\. (?<mapName>.*)/,
        handler: (gather, match) => gather.changeMap(match.groups["mapName"]),
        condition: gather => gather.gatherInProgress(),
        deduplicate: false
    },
]

const DEDUPLICATE_INTERVAL_MS = 1000

const seenMessages = new Set()

registerSoldatEventListeners = (gather, soldatClient) => {
    logger.log.info("Registered non-command event listeners.")

    soldatClient.ws.addListener("message", data => {
        if (!soldatClient.initialized) {
            return;
        }

        const text = soldat.maybeGetLogLine(data);

        if (text === false) {
            return;
        }

        PASSIVE_EVENTS.forEach(eventSpec => {
            let match = text.match(eventSpec.pattern)
            if (match !== null && eventSpec.condition(gather)) {
                if (eventSpec.deduplicate) {
                    if (seenMessages.has(text)) {
                        logger.log.info(`Received duplicated ${eventSpec.name} event, ignoring: ${text}`)
                        return
                    }

                    seenMessages.add(text)
                    setTimeout(() => {
                        seenMessages.delete(text)
                    }, DEDUPLICATE_INTERVAL_MS)
                }

                logger.log.info(`Received ${eventSpec.name} event from server: ${text}`)

                try {
                    eventSpec.handler(gather, match)
                } catch (e) {
                    logger.log.error(`There was an error processing a ${eventSpec.name} event from the server: ${e.stack}`)
                }
            }
        })
    });
}

module.exports = {
    registerSoldatEventListeners
}

