const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")

module.exports = {
    aliases: ["endgame"],
    description: "Add yourself to the gather queue.",
    execute(client, message, args) {
        if (!currentGather.gatherInProgress()) {
            message.channel.send("A gather is not currently in progress.")
            return
        }

        if (args.length !== 1) {
            message.channel.send("Please specify a winning team name, e.g. alpha or bravo")
            return
        }

        const winningTeam = args[0].toLowerCase()

        if ((winningTeam !== "alpha") || (winningTeam !== "bravo")) {
            message.channel.send("Please specify alpha or bravo")
            return
        }

        currentGather.endGame(winningTeam)
    },
};
