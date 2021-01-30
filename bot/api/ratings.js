import _ from "lodash"
import stats, {getKillsAndDeathsPerPlayer, getWeaponStatsOverTime} from "../game/stats";

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
                    const user = await currentStatsDb.getCachedDiscordUser(discordId)

                    result.push({
                        discordId,
                        mu,
                        sigma,
                        avatarUrl: user.avatarUrl,
                        displayName: user.displayName
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
                const user = await currentStatsDb.getCachedDiscordUser(discordId)
                const playerStats = await stats.getPlayerStats(currentStatsDb, discordId)
                const games = await currentStatsDb.getGamesWithPlayer(discordId)
                const ratingUpdates = await currentStatsDb.getRatingUpdates(discordId)

                const roundStartTimeToRatingUpdate = _.groupBy(ratingUpdates, update => update.roundStartTime)

                let sortedGames = _.sortBy(games, game => -game.startTime)
                sortedGames = sortedGames.map((game, i) => {{
                    const allEvents = _.flatMap(game.rounds, round => round.events)
                    const playerKillsAndDeaths = getKillsAndDeathsPerPlayer([...game.redPlayers, ...game.bluePlayers], allEvents)

                    const rounds = game.rounds.map(round => {
                        const playerKillsAndDeaths = getKillsAndDeathsPerPlayer([...game.redPlayers, ...game.bluePlayers], round.events)

                        return {
                            ...round,
                            playerKillsAndDeaths,
                            bluePlayers: game.bluePlayers,
                            redPlayers: game.redPlayers,
                            ratingUpdate: roundStartTimeToRatingUpdate[round.startTime][0]
                        }
                    })

                    return {
                        ...game,
                        gameNumberForPlayer: sortedGames.length - i,
                        rounds,
                        playerKillsAndDeaths
                    }
                }})

                const result = {
                    discordId,
                    avatarUrl: user.avatarUrl,
                    displayName: user.displayName,
                    playerStats,
                    sortedGames,
                    ratingUpdates
                }

                res.json(result)
            }
        },
        {
            method: "get",
            path: "/api/v1/weapons",
            handler: async (req, res, next) => {
                const weaponStatsOverTime = await getWeaponStatsOverTime(currentStatsDb)
                res.json(weaponStatsOverTime)
            }
        }
    ]
}