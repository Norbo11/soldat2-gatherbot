const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")

module.exports = {
    aliases: ["endgame"],
    description: "End the current gather.",
    execute(client, message, args) {
        if (!currentGather.gatherInProgress()) {
            message.channel.send("A gather is not currently in progress.")
            return
        }

        if (args.length !== 2) {
            message.channel.send("Please specify two numbers, alpha caps and bravo caps, e.g. !endgame 5 3")
            return
        }

        const alphaCaps = parseInt(args[0])
        const bravoCaps = parseInt(args[1])

        currentGather.endGame(alphaCaps, bravoCaps)
    },
};
