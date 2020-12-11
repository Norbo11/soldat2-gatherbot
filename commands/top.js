const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../game/stats")
const discord = require("../utils/discord")
const constants = require("../game/constants")
const statsFormatting = require("../game/statsFormatting")

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

        stats.getTopPlayers(currentStatsDb, process.env.MINIMUM_GAMES_NEEDED_FOR_LEADERBOARD, gameMode).then(topPlayers => {
            message.channel.send(statsFormatting.formatTopPlayers(gameMode, topPlayers))
        })
    }
};
