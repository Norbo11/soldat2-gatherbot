const logger = require("./logger")
const soldat = require("./soldat")
const constants = require("./constants")


PASSIVE_EVENTS = [
    /* Events to process when the gather has already started */
    {
        name: "flag cap",
        pattern: /(?<playerName>.*?) scores for (?<teamName>.*?) Team/,
        handler: (gather, match) => gather.flagCap(match.groups["playerName"], match.groups["teamName"]),
        condition: gather => gather.gatherHasStarted()
    },
    {
        name: "gather pause",
        pattern: /--- gatherpause/,
        handler: (gather, match) => gather.gatherPause(),
        condition: gather => gather.gatherHasStarted()
    },
    {
        name: "gather unpause",
        pattern: /--- gatherunpause/,
        handler: (gather, match) => gather.gatherUnpause(),
        condition: gather => gather.gatherHasStarted()
    },
    {
        name: "kill",
        pattern: /\((?<killerTeam>.*?)\) (?<killerName>.*?) killed \((?<victimTeam>.*?)\) (?<victimName>.*?) with (?<weapon>.*)/,
        handler: (gather, match) =>
            gather.playerKill(
                constants.TEAMS[match.groups["killerTeam"]],
                match.groups["killerName"],
                constants.TEAMS[match.groups["victimTeam"]],
                match.groups["victimName"],
                constants.getWeaponByFormattedName(match.groups["weapon"]),
            ),
        condition: gather => gather.gatherHasStarted()
    },
    {
        name: "conquer",
        pattern: /--- conquer (?<conqueringTeam>.*?) (?<redTickets>.*?) (?<blueTickets>.*?) (?<currentRedBunker>.*?) (?<currentBlueBunker>.*?) (?<sabotaging>.*)/,
        handler: (gather, match) =>
            gather.conquer(
                constants.TEAMS[parseInt(match.groups["conqueringTeam"])],
                parseInt(match.groups["redTickets"]),
                parseInt(match.groups["blueTickets"]),
                parseInt(match.groups["currentRedBunker"]),
                parseInt(match.groups["currentBlueBunker"]),
                match.groups["sabotaging"] !== "0"),
        condition: gather => gather.gatherHasStarted()
    },
    /* Events to process when the gather has either started or is in pre-reset mode */
    {
        name: "player join",
        pattern: /(?<playerName>.*?) has joined (?<teamName>.*?) team/,
        handler: (gather, match) => gather.playerJoin(match.groups["playerName"]),
        condition: gather => gather.gatherInProgress()
    },
    {
        name: "player leave",
        pattern: /(?<playerName>.*?) has left (?<teamName>.*?) team/,
        handler: (gather, match) => gather.playerLeave(match.groups["playerName"]),
        condition: gather => gather.gatherInProgress()
    },
    {
        name: "gather start",
        pattern: /--- gatherstart (?<mapName>.*?) (?<numberOfBunkers>\d*)/,
        handler: (gather, match) => gather.gatherStart(match.groups["mapName"], gather.currentSize, parseInt(match.groups["numberOfBunkers"])),
        condition: gather => gather.gatherInProgress()
    },
    {
        name: "gather end",
        pattern: /--- gatherend (?<redTickets>\d*?) (?<blueTickets>\d*?) (?<redCaps>\d*?) (?<blueCaps>\d*)/,
        handler: (gather, match) => gather.endGame(
            parseInt(match.groups["redTickets"]),
            parseInt(match.groups["blueTickets"]),
            parseInt(match.groups["redCaps"]),
            parseInt(match.groups["blueCaps"])
        ),
        condition: gather => gather.gatherInProgress()
    },
    /* Events to process at any time */
    {
        name: "player command",
        pattern: /\[CMD\] (?<currentClass>.*?) \((?<playerName>.*?)\): \/(?<command>.*)/,
        handler: (gather, match) => gather.playerCommand(match.groups["playerName"], match.groups["currentClass"], match.groups["command"]),
        condition: gather => true
    },
    {
        name: "player say",
        pattern: /\[(?<playerName>.*?)] !say (?<message>.*)/,
        handler: (gather, match) => gather.playerSay(match.groups["playerName"], match.groups["message"]),
        condition: gather => true
    },
    {
        name: "class switch",
        pattern: /<New TTW> (?<playerName>.*?) assigned to task (?<classId>.*)/,
        handler: (gather, match) => gather.playerClassSwitch(match.groups["playerName"], match.groups["classId"]),
        condition: gather => true
    },
]

registerSoldatEventListeners = (gather, netClient) => {
    logger.log.info("Registered non-command event listeners.")

    netClient.addListener("data", data => {
        const text = data.toString();

        PASSIVE_EVENTS.forEach(eventSpec => {
            let match = text.match(eventSpec.pattern)
            if (match !== null && eventSpec.condition(gather)) {
                try {
                    eventSpec.handler(gather, match)
                } catch (e) {
                    logger.log.error(`There was an error processing a ${eventSpec.name} event from the server: ${e.stack}`)
                }
                logger.log.info(`Received ${eventSpec.name} event from server: ${text}`)
            }
        })
    });
}

module.exports = {
    registerSoldatEventListeners
}

