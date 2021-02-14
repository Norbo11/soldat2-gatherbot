import _ from "lodash"
import stats, {getKillsAndDeathsPerPlayer, getWeaponStatsOverTime} from "../game/stats";
import moment from "moment";

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
        },
        {
            method: "get",
            path: "/api/v1/gathers/per_day",
            handler: async (req, res, next) => {
                const games = await currentStatsDb.getAllGames()
                const userCache = await currentStatsDb.getAllCachedDiscordUsers()

                let dateToStats = _.groupBy(games, game => moment(game.startTime).format("YYYY-MM-DD"))
                for (let date of _.keys(dateToStats)) {
                    let gamesForDate = dateToStats[date]

                    gamesForDate = gamesForDate.map((game, i) => {{
                        const allEvents = _.flatMap(game.rounds, round => round.events)
                        const playerKillsAndDeaths = getKillsAndDeathsPerPlayer([...game.redPlayers, ...game.bluePlayers], allEvents)
                        return {
                            ...game,
                            playerKillsAndDeaths
                        }
                    }})

                    for (let game of _.values(gamesForDate)) {
                        for (let round of game.rounds) {
                            delete round["events"]
                        }
                    }

                    const players = new Set(_.flatten(gamesForDate.map(game => [...game.redPlayers, ...game.bluePlayers])).map(discordId => userCache[discordId].displayName))

                    dateToStats[date] = {
                        total: gamesForDate.length,
                        players: [...players],
                        numPlayers: players.size,
                        bySize: _.mapValues(_.groupBy(gamesForDate, game => game.size), games => games.length),
                        games: gamesForDate
                    }
                }

                const gamesPerDay = []

                // Here we make sure we return data for a continuous date range, even if we had no games on
                // particular days
                let minDate = moment(_.min(_.keys(dateToStats)), "YYYY-MM-DD")
                const maxDate = moment(_.max(_.keys(dateToStats)), "YYYY-MM-DD")

                while (minDate < maxDate) {
                    const date = minDate.format("YYYY-MM-DD")
                    let stats = dateToStats[date]

                    if (stats === undefined) {
                        stats = {}
                    }

                    stats["date"] = date
                    gamesPerDay.push(stats)

                    minDate.add(1, "days")
                }

                res.json(gamesPerDay)
            }
        }
    ]
}