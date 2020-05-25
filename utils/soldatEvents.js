const gather = require("./gather")
const logger = require("./logger")


registerSoldatEventListeners = (soldatClient) => {
    logger.log.info("Registered non-command event listeners.")

    soldatClient.addListener("data", function (data) {
        const text = data.toString();

        // TODO: Server keeps spamming these messages, should probably silence them
        if (text.startsWith("--- hwid")) {
            return;
        }

        let eventText = undefined
        if (text.match(/USER RESET, GATHER RESTART!/)) {
            soldatClient.write("/say ggwp\n");
            eventText = text
        }

        let match = text.match(/(?<playerName>.*?) scores for (?<teamName>.*?) Team/)
        if (match !== null) {
            gather.flagCap(match.groups["playerName"], match.groups["teamName"])
            eventText = text
        }

        match = text.match(/--- gatherstart (?<mapName>.*?) (?<gatherSize>\d*)/)
        if (match !== null) {
            gather.gatherStart(match.groups["mapName"], match.groups["gatherSize"])
            eventText = text
        }

        match = text.match(/--- gatherend (?<alphaTickets>\d*?) (?<bravoTickets>\d*?) (?<alphaCaps>\d*?) (?<bravoCaps>\d*)/)
        if (match !== null) {
            gather.endGame(match.groups["alphaTickets"], match.groups["bravoTickets"], match.groups["alphaCaps"], match.groups["bravoCaps"])
            eventText = text
        }

        match = text.match(/--- gatherpause/)
        if (match !== null) {
            gather.gatherPause()
            eventText = text
        }

        match = text.match(/--- gatherunpause/)
        if (match !== null) {
            gather.gatherUnpause()
            eventText = text
        }

        if (eventText !== undefined) {
            logger.log.info(`Received passive event from server: ${eventText}`)
        }
    });
}

module.exports = {
    registerSoldatEventListeners
}
