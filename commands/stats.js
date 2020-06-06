const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../utils/stats")


module.exports = {
    aliases: ["stats"],
    description: "Show yours or someone else's personal gather statistics (use @mentions).",
    execute(client, message, args) {
        let discordUsers = []

        if (args.length === 0) {
            discordUsers.push(message.author)
        }
        else if (args.length < 5) {
            discordUsers = message.mentions.users
        } else {
            message.channel.send("Please specify a maximum of 5 names.")
            return
        }

        discordUsers.forEach(user => {
            stats.getPlayerStats(currentStatsDb, user.id).then((playerStats) => {
                message.channel.send(stats.formatGeneralStatsForPlayer(user.username, playerStats))
            })
        })
    },
};