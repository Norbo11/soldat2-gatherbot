import logger from '../utils/logger';
import utils from '../utils/commandUtils';
import stats from '../game/stats';
import discord from '../utils/discord';
import constants from '../game/constants';
import statsFormatting from '../game/statsFormatting';
import _ from 'lodash';

export default {
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
                message.channel.send(statsFormatting.formatTopPlayersByWeapon(topPlayers, weapon))
            })
        } else if (args.length === 0) {

            stats.getGatherStats(currentStatsDb).then(gatherStats => {
                message.channel.send(statsFormatting.formatOverallWeaponStats(gatherStats.overallWeaponStats))
            })
        }

    }
};
