const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")

module.exports = {
    aliases: ["map"],
    description: "Change the map on the server",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        if (args.length !== 1) {
            message.channel.send("Please specify a map name.")
            return
        }

        const mapName = args[0];

        currentSoldatClient.changeMap(mapName, "CaptureTheFlag", (result) => {
            if (result === "found") {
                message.channel.send(`Map changed to **${mapName}**.`)
            }

            if (result === "not_found") {
                message.channel.send(`Map **${mapName}** was not found.`)
            }
        })
    },
};
