const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../game/stats")
const discord = require("../utils/discord")
const constants = require("../game/constants")
const statsFormatting = require("../game/statsFormatting")
const _ = require("lodash")

module.exports = {
    aliases: ["topweapon", "topwep"],
    description: "Show the top players by weapon.",
    execute(client, message, args) {
        let gameMode = constants.GAME_MODES.CAPTURE_THE_FLAG

        if (args.length > 1) {
            currentDiscordChannel.send("Command format: !topwep [weapon], or just !topwep for overall stats.")
            return
        }

        if (args.length === 1) {
            const weaponName = args[0]

            const weapon = constants.getWeaponByFormattedName(weaponName)

            if (weapon === undefined) {
                message.channel.send(`${weaponName} is not a soldat weapon.`)
                return
            }

            stats.getTopPlayers(currentStatsDb, process.env.MINIMUM_GAMES_NEEDED_FOR_LEADERBOARD, gameMode).then(topPlayers => {
                const discordIds = new Set()

                for (let player of topPlayers.topPlayersByWeaponKills[weapon.formattedName]) {
                    discordIds.add(player.discordId)
                }

                for (let player of topPlayers.topPlayersByWeaponKillsPerRound[weapon.formattedName]) {
                    discordIds.add(player.discordId)
                }

                const discordIdToUsername = {}

                discord.getDiscordIdToUsernameMap(client, discordIdToUsername, Array.from(discordIds)).then(() => {
                    message.channel.send(statsFormatting.formatTopPlayersByWeapon(topPlayers, discordIdToUsername, weapon))
                })
            })
        } else if (args.length === 0) {

            stats.getGatherStats(currentStatsDb).then(gatherStats => {
                message.channel.send(statsFormatting.formatOverallWeaponStats(gatherStats.overallWeaponStats))
            })
        }

    }
};
