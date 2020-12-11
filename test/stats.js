const _ = require("lodash")
const MongoClient = require('mongodb').MongoClient;

const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset)

const expect = chai.expect

const moment = require("moment")

const stats = require("../game/stats")
const db = require("../game/db")
const constants = require("../game/constants")
const ratings = require("../game/ratings")
const statsFormatting = require("../game/statsFormatting")


const SOLDAT_EVENTS = constants.SOLDAT_EVENTS
const SOLDAT_WEAPONS = constants.SOLDAT_WEAPONS
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS
const GAME_MODES = constants.GAME_MODES


getMockGames = () => {
    return [
        {
            gameMode: GAME_MODES.CAPTURE_THE_FLAG,
            redPlayers: ["Player1", "Player2"],
            bluePlayers: ["Player3", "Player4"],
            startTime: 1000,
            endTime: 1000 + 20 * 60e+3, // 20 minute game
            size: 4,
            winner: "Blue",
            rounds: [
                {
                    startTime: 1000,
                    endTime: 1000 + 5 * 60e+3,
                    mapName: "ctf_ash",
                    blueCaps: 1,
                    redCaps: 1,
                    winner: "Tie",
                    events: [
                        {
                            timestamp: 1000 + 2 * 60e+3,
                            type: SOLDAT_EVENTS.FLAG_CAP,
                            cappingTeam: SOLDAT_TEAMS.BLUE
                        },
                        {
                            timestamp: 1000 + 3 * 60e+3,
                            type: SOLDAT_EVENTS.FLAG_CAP,
                            cappingTeam: SOLDAT_TEAMS.RED
                        },
                        {
                            timestamp: 1000 + 3 * 60e+3,
                            type: SOLDAT_EVENTS.PLAYER_KILL,
                            killerDiscordId: "Player1",
                            victimDiscordId: "Player3",
                            killerTeam: SOLDAT_TEAMS.RED,
                            victimTeam: SOLDAT_TEAMS.BLUE,
                            weaponName: "Tec-9"
                        },
                    ]
                },
                {
                    startTime: 1000 + 6 * 60e+3,
                    endTime: 1000 + 12 * 60e+3,
                    mapName: "ctf_division",
                    blueCaps: 2,
                    redCaps: 0,
                    winner: "Blue",
                    events: [
                        {
                            timestamp: 1000 + 8 * 60e+3,
                            type: SOLDAT_EVENTS.FLAG_CAP,
                            cappingTeam: SOLDAT_TEAMS.BLUE
                        },
                        {
                            timestamp: 1000 + 9 * 60e+3,
                            type: SOLDAT_EVENTS.FLAG_CAP,
                            cappingTeam: SOLDAT_TEAMS.BLUE
                        },
                        {
                            timestamp: 1000 + 3 * 60e+3,
                            type: SOLDAT_EVENTS.PLAYER_KILL,
                            killerDiscordId: "Player4",
                            victimDiscordId: "Player1",
                            killerTeam: SOLDAT_TEAMS.BLUE,
                            victimTeam: SOLDAT_TEAMS.RED,
                            weaponName: "Kalashnikov"
                        },
                    ]
                },
                {
                    startTime: 1000 + 13 * 60e+3,
                    endTime: 1000 + 20 * 60e+3,
                    mapName: "ctf_magpie",
                    events: [],
                    blueCaps: 0,
                    redCaps: 0,
                    winner: "Tie",
                },
            ],
        },
        {
            gameMode: GAME_MODES.CAPTURE_THE_FLAG,
            redPlayers: ["Player1", "Player2"],
            bluePlayers: ["Player3", "Player4"],
            startTime: 1000,
            endTime: 1000 + 20 * 60e+3, // 20 minute game
            winner: "Blue",
            rounds: [
                {
                    startTime: 1000,
                    endTime: 1000 + 10 * 60e+3,
                    mapName: "ctf_ash",
                    blueCaps: 1,
                    redCaps: 0,
                    winner: "Blue",
                    events: []
                },
                {
                    startTime: 1000,
                    endTime: 1000 + 20 * 60e+3,
                    mapName: "ctf_magpie",
                    blueCaps: 2,
                    redCaps: 0,
                    winner: "Blue",
                    events: []
                }
            ]
        },
        {
            gameMode: GAME_MODES.CAPTURE_THE_FLAG,
            redPlayers: ["Player1", "Player2"],
            bluePlayers: ["Player3", "Player4"],
            startTime: 1000 + 30 * 60e+3,
            endTime: 1000 + 40 * 60e+3, // 10 minute game
            winner: "Blue",
            rounds: [
                {
                    startTime: 1000,
                    endTime: 1000 + 31 * 60e+3,
                    mapName: "ctf_division",
                    blueCaps: 1,
                    redCaps: 0,
                    winner: "Blue",
                    events: []
                },
                {
                    startTime: 1000,
                    endTime: 1000 + 36 * 60e+3,
                    mapName: "ctf_ash",
                    blueCaps: 2,
                    redCaps: 0,
                    winner: "Blue",
                    events: []
                }
            ]
        },
        {
            gameMode: GAME_MODES.CAPTURE_THE_FLAG,
            redPlayers: ["Player1", "Player2", "Player3"],
            bluePlayers: ["Player4", "Player5", "Player6"],
            startTime: 1000 + 60 * 60e+3,
            endTime: 1000 + 75 * 60e+3, // 15 minute game
            winner: "Blue",
            rounds: [
                {
                    startTime: 1000,
                    endTime: 1000 + 61 * 60e+3,
                    mapName: "ctf_something",
                    blueCaps: 1,
                    redCaps: 0,
                    winner: "Blue",
                    events: []
                },
                {
                    startTime: 1000,
                    endTime: 1000 + 75 * 60e+3,
                    mapName: "ctf_ash",
                    blueCaps: 2,
                    redCaps: 0,
                    winner: "Blue",
                    events: []
                }
            ]
        },
    ]
}


describe('Stats', () => {
    let statsDb = undefined
    let conn = undefined

    beforeEach(async () => {
        const client = await MongoClient.connect("mongodb://localhost:27017")
        conn = client.db("testDb")
        statsDb = new db.StatsDB(conn)
    })

    afterEach(async () => {
        await conn.dropDatabase()
    })

    const insertRatings = async () => {
        await statsDb.updateRating("Player1", 0, 0, 50, 10)
        await statsDb.updateRating("Player1", 0, 10, 60, 15)
        await statsDb.updateRating("Player2", 30, 0, 70, 20)
        await statsDb.updateRating("Player2", 15, 0, 80, 25)
        await statsDb.updateRating("Player3", 15, 0, 80, 25)
        await statsDb.updateRating("Player4", 15, 0, 80, 25)
        await statsDb.updateRating("Player5", 15, 0, 80, 25)
    }

    it('should return stats of players', async () => {
        const games = [getMockGames()[0]]
        await Promise.all(games.map(async game => statsDb.insertGame(game)))
        await insertRatings()

        let playerStats = await stats.getPlayerStats(statsDb, "Player1")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 0,
            lostGames: 1,
            totalCaps: 0,
            totalKills: 1,
            totalRounds: 3,
            totalDeaths: 1,
            sizeStats: {
                "4": {
                    totalGames: 1
                }
            },

        })
        expect(playerStats.rating.mu).equal(60)
        expect(playerStats.rating.sigma).equal(15)
        expect(playerStats.weaponStats).containSubset({
            "Tec-9": {
                kills: 1,
                deaths: 0
            },
            "Kalashnikov": {
                kills: 0,
                deaths: 1
            }
        })

        playerStats = await stats.getPlayerStats(statsDb, "Player2")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 0,
            lostGames: 1,
            sizeStats: {
                "4": {
                    totalGames: 1
                }
            },
        })
        expect(playerStats.rating.mu).equal(70)
        expect(playerStats.rating.sigma).equal(20)

        playerStats = await stats.getPlayerStats(statsDb, "Player3")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 1,
            lostGames: 0,
            sizeStats: {
                "4": {
                    totalGames: 1
                }
            },
        })


        playerStats = await stats.getPlayerStats(statsDb, "Player4")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 1,
            lostGames: 0,
            totalKills: 1,
            totalDeaths: 0,
            sizeStats: {
                "4": {
                    totalGames: 1
                }
            },
        })
        expect(playerStats.weaponStats).containSubset({
            "Kalashnikov": {
                kills: 1,
                deaths: 0
            }
        })
    });

    it('should return stats of gathers', async () => {
        const games = _.slice(getMockGames(), 1)
        await Promise.all(games.map(async game => statsDb.insertGame(game)))

        const gatherStats = await stats.getGatherStats(statsDb)
        expect(gatherStats).containSubset({
            totalGames: 3,
            totalGatherTime: 45 * 60e+3,
            mapStats: {
                ctf_ash: {
                    totalRounds: 3
                },
                ctf_something: {
                    totalRounds: 1
                },
                ctf_division: {
                    totalRounds: 1
                },
                ctf_magpie: {
                    totalRounds: 1
                },
            }
        })
    });

    it('should return stats of top players', async () => {
        const games = getMockGames()
        await Promise.all(games.map(async game => statsDb.insertGame(game)))
        await insertRatings()

        const topPlayers = await stats.getTopPlayers(statsDb, 0, GAME_MODES.CAPTURE_THE_FLAG)
        expect(topPlayers.topPlayersByWinRate.map(player => player.discordId)).eql(["Player4", "Player5", "Player3", "Player1", "Player2"])
        expect(topPlayers.topPlayersByTotalGames.map(player => player.discordId)).eql(["Player1", "Player2", "Player3", "Player4", "Player5"])
    })
});

describe('Stats Formatter', () => {
    it('should format player stats', async () => {
        const playerStats = {
            totalGatherTime: 45 * 60e+3,
            totalGames: 3,
            wonGames: 2,
            lostGames: 1,
            tiedGames: 0,
            totalRounds: 6,
            totalRoundsAfterKillTrackingWasImplemented: 6,
            totalKills: 12,
            totalDeaths: 7,
            // totalCaps: 2,
            sizeStats: {
                6: {
                    totalGames: 1,
                },
                4: {
                    totalGames: 2
                }
            },
            gameModeStats: {
                [GAME_MODES.CAPTURE_THE_FLAG]: {
                    totalGames: 3,
                    wonGames: 2,
                    lostGames: 1,
                    tiedGames: 0
                },
                [GAME_MODES.CAPTURE_THE_BASES]: {
                    totalGames: 0,
                    wonGames: 0,
                    lostGames: 0,
                    tiedGames: 0
                }
            },
            rating: ratings.getRating(50, 10),
            weaponStats: {
                [SOLDAT_WEAPONS.KALASHNIKOV.formattedName]: {
                    kills: 12,
                    deaths: 7
                },
                [SOLDAT_WEAPONS.MINIGUN.formattedName]: {
                    kills: 3,
                    deaths: 2
                },
                [SOLDAT_WEAPONS.MP5.formattedName]: {
                    kills: 5,
                    deaths: 7
                }
            }
        }

        const formatted = statsFormatting.formatGeneralStatsForPlayer("Player", playerStats)

        expect(formatted).eql({
            embed: {
                fields: [
                    {
                        name: "**Overall Stats for Player**",
                        value:
                            "**Gathers Played**: 3\n" +
                            "**Rounds Played**: 6\n" +
                            "**Total Gather Time**: an hour\n" +
                            "**CTF W-T-L**: 2-0-1 (67% winrate)\n" +
                            "**CTB W-T-L**: 0-0-0 (NaN% winrate)\n" +
                            "**Kills/Deaths**: 12/7 (1.71)\n" +
                            // "**Caps**: 2 (0.67 per game)\n" +
                            `**First Gather**: ${moment().format("DD-MM-YYYY")}\n` +
                            "**Last Gather**: a few seconds ago\n" +
                            "**Rating**: Skill 50.00, Uncertainty 10.00, Rating Estimate 20.00"
                        // "**Friendly Fire**: undefined team kills (NaN% of kills)"
                    },
                    {
                        name: "**Favourite Weapons**",
                        value:
                            "**Kalashnikov**: 12 kills (2.00 per round)\n" +
                            "**MP5**: 5 kills (0.83 per round)\n" +
                            "**Minigun**: 3 kills (0.50 per round)",
                        inline: true,
                    },
                ]
            }
        })
    })

    it('should format gather stats', async () => {
        const gatherStats = {
            totalGames: 3,
            totalGatherTime: 45 * 60e+3,
            totalRounds: 5,
            mapStats: {
                ttw_one: {
                    totalRounds: 3
                },
                ttw_two: {
                    totalRounds: 2
                }
            }
        }

        const formatted = statsFormatting.formatGatherStats(gatherStats)

        expect(formatted).eql({
            embed: {
                fields: [
                    {
                        name: "**Overall Stats**",
                        value:
                            "**Gathers Played**: 3\n" +
                            "**Rounds Played**: 5\n" +
                            "**Total Gather Time**: an hour\n" +
                            "**Average Gather Time**: 15 minutes\n" +
                            `**First Gather**: ${moment().format("DD-MM-YYYY")}\n` +
                            "**Last Gather**: a few seconds ago",
                    },
                    {
                        name: "**Favourite Maps**",
                        value:
                            "**ttw_one**: 3 rounds\n" +
                            "**ttw_two**: 2 rounds",
                    },
                ]
            }
        })
    })
})
