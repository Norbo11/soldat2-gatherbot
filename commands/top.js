const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../game/stats")
const discord = require("../utils/discord")
const constants = require("../game/constants")

module.exports = {
    aliases: ["top"],
    description: "Show the top players by game mode.",
    execute(client, message, args) {
        let gameMode = constants.GAME_MODES.CAPTURE_THE_FLAG

        if (args.length > 0) {
            if (args[0].toLowerCase() === "ctf") {
                gameMode = constants.GAME_MODES.CAPTURE_THE_FLAG
            } else if (args[0].toLowerCase() === "ctb") {
                gameMode = constants.GAME_MODES.CAPTURE_THE_BASES
            } else{
                message.reply(`Game mode not recognised: **${args[0]}**`)
                return
            }
        }

        stats.getTopPlayers(currentStatsDb, 5, gameMode).then(topPlayers => {

            const discordIdToUsername = {}
            discord.getDiscordIdToUsernameMap(client, discordIdToUsername, topPlayers.allDiscordIds).then(() => {
                message.channel.send(stats.formatTopPlayers(gameMode, topPlayers, discordIdToUsername))
            })
        })
    }
};
