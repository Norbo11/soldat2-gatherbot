const MongoClient = require('mongodb').MongoClient;

const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset)

const expect = chai.expect

const moment = require("moment")

const stats = require("../game/stats")
const db = require("../game/db")
const constants = require("../utils/constants")

const TTW_CLASSES = constants.TTW_CLASSES
const TTW_EVENTS = constants.TTW_EVENTS
const SOLDAT_WEAPONS = constants.SOLDAT_WEAPONS


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
        const game = {
            redPlayers: ["Player1", "Player2"],
            bluePlayers: ["Player3", "Player4"],
            redTickets: 565,
            blueTickets: 0,
            startTime: 1000,
            endTime: 1000 + 20 * 60e+3, // 20 minute game
            size: 4,
            events: [
                {
                    timestamp: 1000,
                    type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
                    discordId: "Player1",
                    newClassId: TTW_CLASSES.RADIOMAN.id,
                },
                {
                    timestamp: 1000,
                    type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
                    discordId: "Player2",
                    newClassId: TTW_CLASSES.GENERAL.id,
                },
                {
                    timestamp: 1000 + 60e+3,
                    type: TTW_EVENTS.BUNKER_CONQUER,
                    discordId: "Player2",
                    conqueringTeam: "Red",
                    redTickets: "1000",
                    blueTickets: "900",
                    currentRedBunker: 1,
                    currentBlueBunker: 4,
                    sabotaging: false
                },
                {
                    timestamp: 1000 + 2 * 60e+3,
                    type: TTW_EVENTS.PLAYER_KILL,
                    killerTeam: "Red",
                    killerDiscordId: "Player2",
                    victimTeam: "Blue",
                    victimDiscordId: "Player3",
                    weaponId: SOLDAT_WEAPONS.AK_74.id,
                },
                {
                    timestamp: 1000 + 8 * 60e+3,
                    type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
                    discordId: "Player1",
                    newClassId: TTW_CLASSES.GENERAL.id,
                },
                {
                    timestamp: 1000 + 8 * 60e+3,
                    type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
                    discordId: "Player2",
                    newClassId: TTW_CLASSES.RADIOMAN.id,
                },
                {
                    timestamp: 1000 + 9 * 60e+3,
                    type: TTW_EVENTS.FLAG_CAP,
                    discordId: "Player2",
                    teamName: "Red"
                }
            ]
        }

        await statsDb.insertGame(game)

        let playerStats = await stats.getPlayerStats(statsDb, "Player1")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 1,
            lostGames: 0,
            totalCaps: 0,
            totalConquers: 0,
            sizeStats: {
                "4": {
                    totalTicketsLeftInWonGames: 565,
                    totalGames: 1
                }
            },
        })
        expect(playerStats.classStats[TTW_CLASSES.GENERAL.id]).eql({
            playingTime: 12 * 60e+3
        })
        expect(playerStats.classStats[TTW_CLASSES.RADIOMAN.id]).eql({
            playingTime: 8 * 60e+3
        })

        playerStats = await stats.getPlayerStats(statsDb, "Player2")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 1,
            lostGames: 0,
            totalKills: 1,
            totalCaps: 1,
            totalConquers: 1,
            sizeStats: {
                "4": {
                    totalTicketsLeftInWonGames: 565,
                    totalGames: 1
                }
            },
        })
        expect(playerStats.classStats[TTW_CLASSES.GENERAL.id]).eql({
            playingTime: 8 * 60e+3
        })
        expect(playerStats.classStats[TTW_CLASSES.RADIOMAN.id]).eql({
            playingTime: 12 * 60e+3
        })
        expect(playerStats.weaponStats[SOLDAT_WEAPONS.AK_74.id]).eql({
            kills: 1,
            deaths: 0,
        })

        playerStats = await stats.getPlayerStats(statsDb, "Player3")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 0,
            lostGames: 1,
            sizeStats: {
                "4": {
                    totalTicketsLeftInWonGames: 0,
                    totalGames: 1
                }
            },
        })
        expect(playerStats.weaponStats[SOLDAT_WEAPONS.AK_74.id]).eql({
            deaths: 1,
            kills: 0,
        })

        playerStats = await stats.getPlayerStats(statsDb, "Player4")
        expect(playerStats).containSubset({
            totalGatherTime: 20 * 60e+3,
            totalGames: 1,
            wonGames: 0,
            lostGames: 1,
            sizeStats: {
                "4": {
                    totalTicketsLeftInWonGames: 0,
                    totalGames: 1
                }
            },
        })
    });

    it('should return stats of gathers', async () => {
        const games = [
            {
                redPlayers: ["Player1", "Player2"],
                bluePlayers: ["Player3", "Player4"],
                redTickets: 565,
                blueTickets: 0,
                startTime: 1000,
                endTime: 1000 + 20 * 60e+3, // 20 minute game
                events: [],
                mapName: "ttw_one",
            },
            {
                redPlayers: ["Player1", "Player2"],
                bluePlayers: ["Player3", "Player4"],
                redTickets: 201,
                blueTickets: 0,
                startTime: 1000 + 30 * 60e+3,
                endTime: 1000 + 40 * 60e+3, // 10 minute game
                events: [],
                mapName: "ttw_two",
            },
            {
                redPlayers: ["Player1", "Player2", "Player3"],
                bluePlayers: ["Player4", "Player5", "Player6"],
                redTickets: 0,
                blueTickets: 1004,
                startTime: 1000 + 60 * 60e+3,
                endTime: 1000 + 75 * 60e+3, // 15 minute game
                events: [],
                mapName: "ttw_two",
            },
        ]

        await Promise.all(games.map(async game => statsDb.insertGame(game)))

        const gatherStats = await stats.getGatherStats(statsDb)
        expect(gatherStats).containSubset({
            totalGames: 3,
            totalGatherTime: 45 * 60e+3,
            totalTicketsLeft: 1770,
            mapStats: {
                ttw_one: {
                    totalGames: 1
                },
                ttw_two: {
                    totalGames: 2
                }
            }
        })
    });

    it('should return stats of top players', async () => {
        const games = [
            {
                redPlayers: ["Player1", "Player2"],
                bluePlayers: ["Player3", "Player4"],
                redTickets: 565,
                blueTickets: 0,
                startTime: 1000,
                endTime: 1000 + 20 * 60e+3, // 20 minute game
                events: [],
                mapName: "ttw_one",
            },
            {
                redPlayers: ["Player1", "Player2"],
                bluePlayers: ["Player3", "Player4"],
                redTickets: 201,
                blueTickets: 0,
                startTime: 1000 + 30 * 60e+3,
                endTime: 1000 + 40 * 60e+3, // 10 minute game
                events: [],
                mapName: "ttw_two",
            },
            {
                redPlayers: ["Player1", "Player2", "Player3"],
                bluePlayers: ["Player4", "Player5", "Player6"],
                redTickets: 0,
                blueTickets: 1004,
                startTime: 1000 + 60 * 60e+3,
                endTime: 1000 + 75 * 60e+3, // 15 minute game
                events: [
                    {
                        timestamp: 1000 + 2 * 60e+3,
                        type: TTW_EVENTS.PLAYER_KILL,
                        killerTeam: "Red",
                        killerDiscordId: "Player2",
                        victimTeam: "Blue",
                        victimDiscordId: "Player3",
                        weaponId: SOLDAT_WEAPONS.AK_74.id,
                    },
                ],
                mapName: "ttw_two",
            },
        ]

        await Promise.all(games.map(async game => statsDb.insertGame(game)))

        const topPlayers = await stats.getTopPlayers(statsDb, 0)
        expect(topPlayers.topPlayersByWinRate.map(player => player.discordId)).eql(["Player5", "Player6", "Player1", "Player2", "Player4"])
        expect(topPlayers.topPlayersByTotalGames.map(player => player.discordId)).eql(["Player1", "Player2", "Player3", "Player4", "Player5"])
        expect(topPlayers.topPlayersByWeaponKills[SOLDAT_WEAPONS.AK_74.id].map(player => player.discordId)).eql(["Player2", "Player1", "Player3", "Player4", "Player5"])
    })
});

describe('Stats Formatter', () => {
    it('should format player stats', async () => {
        const playerStats = {
            totalGatherTime: 45 * 60e+3,
            totalGames: 3,
            wonGames: 2,
            lostGames: 1,
            totalKills: 12,
            totalDeaths: 7,
            totalCaps: 2,
            totalConquers: 10,
            sizeStats: {
                6: {
                    totalTicketsLeftInWonGames: 2541,
                    totalGames: 1,
                },
                4: {
                    totalTicketsLeftInWonGames: 521,
                    totalGames: 2
                }
            },
            classStats: {
                [TTW_CLASSES.GENERAL.id]: {
                    playingTime: 20 * 60e+3
                },
                [TTW_CLASSES.RADIOMAN.id]: {
                    playingTime: 25 * 60e+3
                },
                [TTW_CLASSES.ARTILLERY.id]: {
                    playingTime: 0
                },
            },
            weaponStats: {
                [SOLDAT_WEAPONS.AK_74.id]: {
                    kills: 12,
                    deaths: 7
                },
                [SOLDAT_WEAPONS.FN_MINIMI.id]: {
                    kills: 3,
                    deaths: 2
                },
                [SOLDAT_WEAPONS.HK_MP5.id]: {
                    kills: 5,
                    deaths: 7
                }
            }
        }

        const formatted = stats.formatGeneralStatsForPlayer("Player", playerStats)

        expect(formatted).eql({
            embed: {
                fields: [
                    {
                        name: "**Overall Stats for Player**",
                        value:
                            "**Gathers Played**: 3\n" +
                            "**Total Gather Time**: an hour\n" +
                            "**Won/Lost**: 2/1 (67%)\n" +
                            "**Kills/Deaths**: 12/7 (1.71)\n" +
                            "**Caps**: 2 (0.67 per game)\n" +
                            "**Bunker Conquers**: 10\n" +
                            `**First Gather**: ${moment().format("DD-MM-YYYY")}\n` +
                            "**Last Gather**: a few seconds ago\n" +
                            "**Friendly Fire**: undefined team kills (NaN% of kills)"
                    },
                    {
                        name: "**Favourite Weapons**",
                        value:
                            "**Ak-74**: 12 kills\n" +
                            "**HK MP5**: 5 kills\n" +
                            "**FN Minimi**: 3 kills",
                        inline: true,
                    },
                    {
                        name: "**Favourite Classes**",
                        value:
                            "**Radioman**: 25 minutes\n" +
                            "**General**: 20 minutes\n" +
                            "**Artillery**: 0 seconds",
                        inline: true,
                    },
                    {
                        name: "**Avg Tickets Left in Won Games**",
                        value:
                            "**Size 6**: 2541 tickets\n" +
                            "**Size 4**: 261 tickets",
                        inline: false,
                    },
                ]
            }
        })
    })

    it('should format gather stats', async () => {
        const gatherStats = {
            totalGames: 3,
            totalGatherTime: 45 * 60e+3,
            totalTicketsLeft: 1770,
            mapStats: {
                ttw_one: {
                    totalGames: 1
                },
                ttw_two: {
                    totalGames: 2
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
                            "**Total Gather Time**: an hour\n" +
                            "**Average Gather Time**: 15 minutes\n" +
                            "**Average Tickets Left**: 590\n" +
                            `**First Gather**: ${moment().format("DD-MM-YYYY")}\n` +
                            "**Last Gather**: a few seconds ago",
                    },
                    {
                        name: "**Favourite Maps**",
                        value:
                            "**ttw_two**: 2 games\n" +
                            "**ttw_one**: 1 games",
                    },
                ]
            }
        })
    })
})
