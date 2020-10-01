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

        if (args.length !== 3) {
            message.channel.send("Please specify a map name, alpha caps and bravo caps, e.g. !endgame ctf_ash 5 3")
            return
        }

        const mapName = args[0]
        const alphaCaps = parseInt(args[1])
        const bravoCaps = parseInt(args[2])

        currentGather.endGame(mapName, alphaCaps, bravoCaps)
    },
};
