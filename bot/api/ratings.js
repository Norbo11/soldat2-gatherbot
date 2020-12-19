import _ from "lodash"
import stats from "../game/stats";

export default {
    routes: [
        {
            method: "get",
            path: "/api/v1/ratings/all",
            handler: async (req, res, next) => {
                const result = []

                const discordIds = await currentStatsDb.getAllDiscordIds()

                for (const discordId of discordIds) {
                    const {mu, sigma} = await currentStatsDb.getMuSigma(discordId)
                    const ratingUpdates = await currentStatsDb.getRatingUpdates(discordId)

                    result.push({
                        discordId,
                        mu,
                        sigma,
                        ratingUpdates,
                    })
                }

                res.json(result)
            }
        },
        {
            method: "get",
            path: "/api/v1/ratings/user/:discordId",
            handler: async (req, res, next) => {
                const discordId = req.params.discordId
                const user = await currentDiscordChannel.client.fetchUser(discordId)
                const member = await currentDiscordChannel.guild.member(user)
                const playerStats = await stats.getPlayerStats(currentStatsDb, discordId)
                const games = await currentStatsDb.getGamesWithPlayer(discordId)
                const sortedGames = _.sortBy(games, game => -game.startTime)

                const result = {
                    discordId,
                    avatarUrl: user.displayAvatarURL,
                    displayName: member !== null ? member.displayName : user.username,
                    playerStats,
                    sortedGames
                }

                res.json(result)
            }
        }
    ]
}