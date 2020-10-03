const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")

module.exports = {
    aliases: ["endgame", "end"],
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

        if (!currentGather.currentQueue.includes(message.author)) {
            message.channel.send("You must have played this gather in order to end it.")
            return
        }

        const mapName = args[0]
        const alphaCaps = parseInt(args[1])
        const bravoCaps = parseInt(args[2])

        const maps = ["ctf_ash", "ctf_cobra", "ctf_division", "ctf_nubya"]

        if (!maps.includes(mapName)){
            message.channel.send(`Please pick one of the following: ${maps.join(', ')}`)
            return
        }

        if (alphaCaps > 10 || bravoCaps > 10 || alphaCaps < 0 || bravoCaps < 0) {
            message.channel.send("Caps should be between 0 and 10.")
            return
        }

        currentGather.endGame(mapName, alphaCaps, bravoCaps)
    },
};