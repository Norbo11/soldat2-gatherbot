import logger from '../utils/logger';
import stats from '../game/stats';
import statsFormatting from '../game/statsFormatting';


export default {
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
            logger.log.info(`Fetching stats for ${user.username}`)
            stats.getPlayerStats(currentStatsDb, user.id).then((playerStats) => {
                if (playerStats === undefined) {
                    message.channel.send(`<@${user.id}> does not have any stats.`)
                } else {
                    message.channel.send(statsFormatting.formatGeneralStatsForPlayer(user.username, playerStats))
                }
            })
        })
    },
};
