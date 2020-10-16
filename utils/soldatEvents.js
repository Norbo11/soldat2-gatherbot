const logger = require("./logger")
const constants = require("./constants")
const soldat = require("./soldat2")

PASSIVE_EVENTS = [
    {
        name: "player command",
        pattern: /\[(?<playerName>.*?)] !(?<command>.*)/,
        handler: (gather, match) => gather.playerCommand(match.groups["playerName"], match.groups["command"]),
        condition: gather => true
    },
]

registerSoldatEventListeners = (gather, soldatClient) => {
    logger.log.info("Registered non-command event listeners.")

    soldatClient.ws.addListener("message", data => {
        data = soldat.toArrayBuffer(data)
        const dataView = new DataView(data);
        const message = new soldat.NetworkMessage(dataView.buffer);
        const type = message.ReadMessageType();

        // TODO: We need to deduplicate messages here recieved in a short space of time because the server
        //  seems to log things twice when we say something in-game
        if (type === soldat.MessageType.LogLine) {
            const text = soldat.NetworkMessage.ProcessLogLine(message);

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
        }
    });
}

module.exports = {
    registerSoldatEventListeners
}

