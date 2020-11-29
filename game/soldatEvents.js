const logger = require("../utils/logger")
const constants = require("./constants")
const soldat = require("./soldat2")

const GAME_MODES = constants.GAME_MODES
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS

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
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_FLAG,
        deduplicate: false
    },
    {
        name: "red flag cap",
        pattern: /\[(?<time>.*?)] Red flag captured/,
        handler: (gather, match) => gather.redFlagCaptured(),
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_FLAG,
        deduplicate: false
    },
    {
        name: "blue flag cap",
        pattern: /\[(?<time>.*?)] Blue flag captured/,
        handler: (gather, match) => gather.blueFlagCaptured(),
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_FLAG,
        deduplicate: false
    },
    {
        name: "red base capture",
        pattern: /\[(?<time>.*?)] RPC_Capture 0 1 flag (?<flagNum>.*)/,
        handler: (gather, match) => gather.onRedBaseCapture(),
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_BASES,
        deduplicate: false
    },
    {
        name: "blue base capture",
        pattern: /\[(?<time>.*?)] RPC_Capture 1 0 flag (?<flagNum>.*)/,
        handler: (gather, match) => gather.onBlueBaseCapture(),
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_BASES,
        deduplicate: false
    },
    {
        name: "red win",
        pattern: /\[(?<time>.*?)] Red WON!/,
        handler: (gather, match) => gather.endRound(SOLDAT_TEAMS.RED),
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_BASES,
        deduplicate: false
    },
    {
        name: "blue win",
        pattern: /\[(?<time>.*?)] Blue WON!/,
        handler: (gather, match) => gather.endRound(SOLDAT_TEAMS.BLUE),
        condition: gather => gather.gatherInProgress() && gather.gameMode === GAME_MODES.CAPTURE_THE_BASES,
        deduplicate: false
    },

    // TODO: This should be replaced with an rcon command to get the server info, such as current map, etc.
    {
        name: "change map",
        pattern: /\[(?<time>.*?)] Popup: Loading\.\.\. (?<mapName>.*)/,
        handler: (gather, match) => gather.onMapChange(match.groups["mapName"]),
        condition: gather => true,
        deduplicate: false
    },
    {
        name: "player kill",
        pattern: /\[(?<time>.*?)] (?<killerName>.*?) \[(?<killerPlayfabId>.*?)] \((?<killerTeam>.*?)\) killed (?<victimName>.*?) \[(?<victimPlayfabId>.*?)] \((?<victimTeam>.*?)\) with (?<weapon>.*)/,
        handler: (gather, match) => gather.onPlayerKill(
            match.groups["killerPlayfabId"],
            constants.getSoldatTeamById(match.groups["killerTeam"]),
            match.groups["victimPlayfabId"],
            constants.getSoldatTeamById(match.groups["victimTeam"]),
            match.groups["weapon"]
        ),
        condition: gather => gather.gatherInProgress() ,
        deduplicate: false
    },
]

const DEDUPLICATE_INTERVAL_MS = 1000

const seenMessages = new Set()

registerSoldatEventListeners = (gather, soldatClient) => {
    logger.log.info("Registered non-command event listeners.")

    // It's important for this function to not be marked "async", as the underlying EventEmitter won't await it!
    // This might cause events to be handled out-of-order!
    soldatClient.ws.addListener("message", data => {
        if (!soldatClient.initialized) {
            return;
        }

        const text = soldat.maybeGetLogLine(data);

        if (text === false) {
            return;
        }

        for (let eventSpec of PASSIVE_EVENTS) {
            let match = text.match(eventSpec.pattern)
            if (match !== null && eventSpec.condition(gather)) {
                if (eventSpec.deduplicate) {
                    // Messages start with timestamps like [00:00:00]
                    // We wish to get rid of these in order for deduplication to work across seconds boundaries
                    const textWithoutTimestamp = text.substring(11) // 11 chars present in the above, including space

                    if (seenMessages.has(textWithoutTimestamp)) {
                        logger.log.info(`Received duplicated ${eventSpec.name} event, ignoring: ${text}`)
                        return
                    }

                    seenMessages.add(textWithoutTimestamp)
                    setTimeout(() => {
                        seenMessages.delete(textWithoutTimestamp)
                    }, DEDUPLICATE_INTERVAL_MS)
                }

                logger.log.info(`Received ${eventSpec.name} event from server: ${text}`)

                try {
                    eventSpec.handler(gather, match)
                } catch (e) {
                    logger.log.error(`There was an error processing a ${eventSpec.name} event from the server: ${e.stack}`)
                }
            }
        }
    });
}

module.exports = {
    registerSoldatEventListeners
}

