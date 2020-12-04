const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../game/stats")
const discord = require("../utils/discord")
const constants = require("../game/constants")
const statsFormatting = require("../game/statsFormatting")

module.exports = {
    aliases: ["topweapon", "topwep"],
    description: "Show the top players by weapon.",
    execute(client, message, args) {
        let gameMode = constants.GAME_MODES.CAPTURE_THE_FLAG

        if (args.length !== 1) {
            currentDiscordChannel.send("Please specify a weapon name.")
        }

        const weaponName = args[0]

        stats.getTopPlayers(currentStatsDb, process.env.MINIMUM_GAMES_NEEDED_FOR_LEADERBOARD, gameMode).then(topPlayers => {
            const discordIds = new Set()

            for (let player of topPlayers.topPlayersByWeaponKills[weaponName]) {
                discordIds.add(player.discordId)
            }

            const discordIdToUsername = {}

            discord.getDiscordIdToUsernameMap(client, discordIdToUsername, Array.from(discordIds)).then(() => {
                message.channel.send(statsFormatting.formatTopPlayersByWeapon(topPlayers, discordIdToUsername, weaponName))
            })
        })
    }
};
