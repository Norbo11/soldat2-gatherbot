const logger = require("./logger")
const constants = require("./constants")
const soldat = require("./soldat2")

PASSIVE_EVENTS = [
    {
        name: "player command",
        pattern: /\[(?<time>.*?)] \[(?<playerName>.*?)] !(?<command>.*)/,
        handler: (gather, match) => gather.playerCommand(match.groups["playerName"], match.groups["command"]),
        condition: gather => true,
        deduplicate: true
    },
]

const DEDUPLICATE_INTERVAL_MS = 1000

seenMessages = new Set()

registerSoldatEventListeners = (gather, soldatClient) => {
    logger.log.info("Registered non-command event listeners.")

    soldatClient.ws.addListener("message", data => {
        data = soldat.toArrayBuffer(data)
        const dataView = new DataView(data);
        const message = new soldat.NetworkMessage(dataView.buffer);
        const type = message.ReadMessageType();

        if (type === soldat.MessageType.LogLine) {
            const text = soldat.NetworkMessage.ProcessLogLine(message);

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
        }
    });
}

module.exports = {
    registerSoldatEventListeners
}

