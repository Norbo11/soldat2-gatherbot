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


const SOLDAT_EVENTS = constants.SOLDAT_EVENTS
const SOLDAT_WEAPONS = constants.SOLDAT_WEAPONS
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS
const GAME_MODES = constants.GAME_MODES


getMockGames = () => {
    return [
        {
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
                        }
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
                        }
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

    it('should return stats of players', async () => {
        const games = [getMockGames()[0]]
        await Promise.all(games.map(async game => statsDb.insertGame(game)))

        let playerStats = await stats.getPlayerStats(statsDb, "Player1")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 0,
            lostGames: 1,
            totalCaps: 0,
            sizeStats: {
                "4": {
                    totalGames: 1
                }
            },
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
            sizeStats: {
                "4": {
                    totalGames: 1
                }
            },
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

        const topPlayers = await stats.getTopPlayers(statsDb, 0, GAME_MODES.CAPTURE_THE_FLAG)
        expect(topPlayers.topPlayersByWinRate.map(player => player.discordId)).eql(["Player4", "Player5", "Player6", "Player3", "Player1"])
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
            // totalKills: 12,
            // totalDeaths: 7,
            // totalCaps: 2,
            sizeStats: {
                6: {
                    totalGames: 1,
                },
                4: {
                    totalGames: 2
                }
            },
            // weaponStats: {
            //     [SOLDAT_WEAPONS.AK_74.id]: {
            //         kills: 12,
            //         deaths: 7
            //     },
            //     [SOLDAT_WEAPONS.FN_MINIMI.id]: {
            //         kills: 3,
            //         deaths: 2
            //     },
            //     [SOLDAT_WEAPONS.HK_MP5.id]: {
            //         kills: 5,
            //         deaths: 7
            //     }
            // }
        }

        const formatted = stats.formatGeneralStatsForPlayer("Player", playerStats)

        expect(formatted).eql({
            embed: {
                fields: [
                    {
                        name: "**Overall Stats for Player**",
                        value:
                            "**Gathers Played**: 3\n" +
                            "**Rounds Played**: 6\n" +
                            "**Total Gather Time**: an hour\n" +
                            "**W-T-L**: 2-0-1 (67% winrate)\n" +
                            // "**Kills/Deaths**: 12/7 (1.71)\n" +
                            // "**Caps**: 2 (0.67 per game)\n" +
                            `**First Gather**: ${moment().format("DD-MM-YYYY")}\n` +
                            "**Last Gather**: a few seconds ago"
                            // "**Friendly Fire**: undefined team kills (NaN% of kills)"
                    },
                    // {
                    //     name: "**Favourite Weapons**",
                    //     value:
                    //         "**Ak-74**: 12 kills\n" +
                    //         "**HK MP5**: 5 kills\n" +
                    //         "**FN Minimi**: 3 kills",
                    //     inline: true,
                    // },
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

        const formatted = stats.formatGatherStats(gatherStats)

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
