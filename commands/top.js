const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../game/stats")
const discord = require("../utils/discord")

module.exports = {
    aliases: ["top"],
    description: "Show the top players.",
    execute(client, message, args) {
        stats.getTopPlayers(currentStatsDb, 5).then(topPlayers => {

            const discordIdToUsername = {}
            discord.getDiscordIdToUsernameMap(client, discordIdToUsername, topPlayers.allDiscordIds).then(() => {
                if (args.length === 1) {
                    const weaponName = args[0]
                    message.channel.send(stats.formatTopPlayersByWeapon(topPlayers, discordIdToUsername, weaponName))
                } else if (args.length === 0) {
                    message.channel.send(stats.formatTopPlayers(topPlayers, discordIdToUsername))
                }
            })
        })
    }
};
