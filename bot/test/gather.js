import _ from 'lodash';
import chai from 'chai';
import chaiSubset from 'chai-subset';
import logger from '../utils/logger';
import events from 'events';
import {GAME_MODES, IN_GAME_STATES, SOLDAT_EVENTS, SOLDAT_TEAMS} from '../game/constants';


import soldat from '../game/soldat2';
import soldatEvents from '../game/soldatEvents';
import {getTestDiscordChannel, getTestServer, getTestStatsDb, MockDiscordUser} from "../utils/testUtils";
import {Authenticator} from "../game/authentication"
import {Gather} from "../game/gather";

chai.use(chaiSubset)

const expect = chai.expect


describe('Gather', () => {
    let currentGather = undefined
    let soldatClient = undefined
    let ws = undefined
    let discordChannel = undefined
    let statsDb = undefined
    let currentTime = 0;
    let authenticator = undefined;

    beforeEach(async () => {
        statsDb = await getTestStatsDb()
        discordChannel = getTestDiscordChannel()
        const server = getTestServer()

        ws = new events.EventEmitter()
        ws.send = (data) => {
            logger.log.info(`Wrote to server: ${data}`)
        }

        await statsDb.mapPlayfabIdToDiscordId("A", "a")
        await statsDb.mapPlayfabIdToDiscordId("B", "b")
        await statsDb.mapPlayfabIdToDiscordId("C", "c")
        await statsDb.mapPlayfabIdToDiscordId("D", "d")

        const mockCurrentTimestamp = () => {
            return currentTime;
        }

        authenticator = new Authenticator(statsDb)

        soldatClient = new soldat.Soldat2Client("[test]", ws, true)
        currentGather = new Gather(server, discordChannel, statsDb, soldatClient, authenticator, mockCurrentTimestamp)
        soldatEvents.registerSoldatEventListeners("[test]", currentGather, soldatClient)
    });

    afterEach(async () => {
        await statsDb.dropDatabase()
    })

    it('should handle an entire ctf gather', async () => {
        expect(currentGather.inGameState).equal(IN_GAME_STATES.NO_GATHER)

        const discordUsers = [
            new MockDiscordUser("a"),
            new MockDiscordUser("b"),
            new MockDiscordUser("c"),
            new MockDiscordUser("d")
        ]

        await currentGather.startNewGame(discordUsers)
        expect(currentGather.inGameState).equal(IN_GAME_STATES.GATHER_STARTED)
        expect(currentGather.endedRounds.length).equal(0)
        expect(currentGather.currentRound).not.equal(undefined)

        let round = currentGather.currentRound
        currentTime = 1000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Popup: Loading... ctf_ash").raw))
        expect(round.mapName).equal("ctf_ash")
        expect(round.startTime).equal(1000)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] PlayerA [A] (1) killed PlayerB [B] (0) with Tec-9\n").raw))
        expect(round.events[0]).containSubset({
            timestamp: 1000,
            type: SOLDAT_EVENTS.PLAYER_KILL,
            killerDiscordId: "a",
            victimDiscordId: "b",
            killerTeam: SOLDAT_TEAMS.RED,
            victimTeam: SOLDAT_TEAMS.BLUE,
            weaponName: "Tec-9"
        })

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Red flag captured by  A [A] (0)").raw))
        expect(round.blueCaps).equal(1)
        expect(round.events[1]).containSubset({
            timestamp: 1000,
            type: SOLDAT_EVENTS.FLAG_CAP,
            cappingTeam: SOLDAT_TEAMS.BLUE
        })

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Blue flag captured by  C [C] (1)").raw))
        expect(round.redCaps).equal(1)
        expect(round.events[2]).containSubset({
            timestamp: 1000,
            type: SOLDAT_EVENTS.FLAG_CAP,
            cappingTeam: SOLDAT_TEAMS.RED
        })

        currentTime = 5000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Match state: Ended").raw))
        expect(currentGather.inGameState).equal(IN_GAME_STATES.GATHER_STARTED)
        expect(currentGather.endedRounds.length).equal(1)
        expect(currentGather.currentRound).not.equal(undefined)

        expect(round.winner).equal(SOLDAT_TEAMS.TIE)
        expect(round.startTime).equal(1000)
        expect(round.endTime).equal(5000)

        round = currentGather.currentRound
        currentTime = 6000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Popup: Loading... ctf_division").raw))
        expect(round.mapName).equal("ctf_division")
        expect(round.startTime).equal(6000)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Red flag captured by  A [A] (0)").raw))
        expect(round.blueCaps).equal(1)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Red flag captured by  A [A] (0)").raw))
        expect(round.blueCaps).equal(2)

        currentTime = 8000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Match state: Ended").raw))
        expect(currentGather.inGameState).equal(IN_GAME_STATES.GATHER_STARTED)
        expect(currentGather.endedRounds.length).equal(2)
        expect(currentGather.currentRound).not.equal(undefined)

        round = currentGather.currentRound
        currentTime = 9000
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Popup: Loading... ctf_magpie").raw))
        expect(round.mapName).equal("ctf_magpie")
        expect(round.startTime).equal(9000)

        round = currentGather.endedRounds[1]
        expect(round.winner).equal(SOLDAT_TEAMS.BLUE)

        currentTime = 10000
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Match state: Ended").raw))
        expect(currentGather.inGameState).equal(IN_GAME_STATES.NO_GATHER)
        expect(currentGather.endedRounds.length).equal(0)

        const game = await statsDb.getLastGame()
        expect(game.startTime).equal(1000)
        expect(game.endTime).equal(10000)
        expect(game.winner).equal(SOLDAT_TEAMS.BLUE)
        expect(game.size).equal(4)
        expect(game.rounds[0]).deep.equal(
            {
                startTime: 1000,
                endTime: 5000,
                mapName: "ctf_ash",
                blueCaps: 1,
                redCaps: 1,
                winner: "Tie",
                events: [
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.PLAYER_KILL,
                        killerDiscordId: "a",
                        victimDiscordId: "b",
                        killerTeam: SOLDAT_TEAMS.RED,
                        victimTeam: SOLDAT_TEAMS.BLUE,
                        weaponName: "Tec-9",
                    },
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.FLAG_CAP,
                        cappingTeam: SOLDAT_TEAMS.BLUE,
                        discordId: "a",
                    },
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.FLAG_CAP,
                        cappingTeam: SOLDAT_TEAMS.RED,
                        discordId: "c",
                    }
                ]
            }
        )
        expect(game.rounds[1]).deep.equal(
            {
                startTime: 6000,
                endTime: 8000,
                mapName: "ctf_division",
                blueCaps: 2,
                redCaps: 0,
                winner: "Blue",
                events: [
                    {
                        timestamp: 6000,
                        type: SOLDAT_EVENTS.FLAG_CAP,
                        cappingTeam: SOLDAT_TEAMS.BLUE,
                        discordId: "a",
                    },
                    {
                        timestamp: 6000,
                        type: SOLDAT_EVENTS.FLAG_CAP,
                        cappingTeam: SOLDAT_TEAMS.BLUE,
                        discordId: "a",
                    }
                ]
            }
        )
        expect(game.rounds[2]).deep.equal(
            {
                startTime: 9000,
                endTime: 10000,
                mapName: "ctf_magpie",
                events: [],
                blueCaps: 0,
                redCaps: 0,
                winner: "Tie",
            }
        )
    });

    it('should handle an entire ctb gather', async () => {
        expect(currentGather.inGameState).equal(IN_GAME_STATES.NO_GATHER)

        const players = [
            new MockDiscordUser("a"),
            new MockDiscordUser("b"),
            new MockDiscordUser("c"),
            new MockDiscordUser("d")
        ]

        currentGather.changeGameMode(GAME_MODES.CAPTURE_THE_BASES)
        await currentGather.startNewGame(players)
        expect(currentGather.inGameState).equal(IN_GAME_STATES.GATHER_STARTED)
        expect(currentGather.endedRounds.length).equal(0)
        expect(currentGather.currentRound).not.equal(undefined)

        let round = currentGather.currentRound
        currentTime = 1000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Popup: Loading... ctf_gen_jarhead").raw))
        expect(round.mapName).equal("ctf_gen_jarhead")
        expect(round.startTime).equal(1000)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] RPC_Capture 1 0 flag 10").raw))
        expect(round.blueCaps).equal(1)
        expect(round.events[0]).containSubset({
            timestamp: 1000,
            type: SOLDAT_EVENTS.BASE_CAPTURE,
            cappingTeam: SOLDAT_TEAMS.BLUE
        })

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] RPC_Capture 0 1 flag 10").raw))
        expect(round.redCaps).equal(1)
        expect(round.events[1]).containSubset({
            timestamp: 1000,
            type: SOLDAT_EVENTS.BASE_CAPTURE,
            cappingTeam: SOLDAT_TEAMS.RED
        })

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] RPC_Capture 1 0 flag 10").raw))
        expect(round.blueCaps).equal(2)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] RPC_Capture 1 0 flag 10").raw))
        expect(round.blueCaps).equal(3)

        currentTime = 5000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Blue WON!").raw))
        expect(currentGather.inGameState).equal(IN_GAME_STATES.GATHER_STARTED)
        expect(currentGather.endedRounds.length).equal(1)
        expect(currentGather.currentRound).not.equal(undefined)

        expect(round.winner).equal(SOLDAT_TEAMS.BLUE)
        expect(round.startTime).equal(1000)
        expect(round.endTime).equal(5000)

        round = currentGather.currentRound
        currentTime = 6000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Popup: Loading... ctf_gen_cobra").raw))
        expect(round.mapName).equal("ctf_gen_cobra")
        expect(round.startTime).equal(6000)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] RPC_Capture 1 0 flag 10").raw))
        expect(round.blueCaps).equal(1)

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] RPC_Capture 1 0 flag 10").raw))
        expect(round.blueCaps).equal(2)

        currentTime = 8000;
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] Blue WON!").raw))
        expect(currentGather.inGameState).equal(IN_GAME_STATES.NO_GATHER)
        expect(currentGather.endedRounds.length).equal(0)

        const game = await statsDb.getLastGame()
        expect(game.startTime).equal(1000)
        expect(game.endTime).equal(8000)
        expect(game.winner).equal(SOLDAT_TEAMS.BLUE)
        expect(game.size).equal(4)
        expect(game.rounds[0]).deep.equal(
            {
                startTime: 1000,
                endTime: 5000,
                mapName: "ctf_gen_jarhead",
                blueCaps: 3,
                redCaps: 1,
                winner: "Blue",
                events: [
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.BASE_CAPTURE,
                        cappingTeam: SOLDAT_TEAMS.BLUE
                    },
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.BASE_CAPTURE,
                        cappingTeam: SOLDAT_TEAMS.RED
                    },
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.BASE_CAPTURE,
                        cappingTeam: SOLDAT_TEAMS.BLUE
                    },
                    {
                        timestamp: 1000,
                        type: SOLDAT_EVENTS.BASE_CAPTURE,
                        cappingTeam: SOLDAT_TEAMS.BLUE
                    }
                ]
            }
        )
        expect(game.rounds[1]).deep.equal(
            {
                startTime: 6000,
                endTime: 8000,
                mapName: "ctf_gen_cobra",
                blueCaps: 2,
                redCaps: 0,
                winner: "Blue",
                events: [
                    {
                        timestamp: 6000,
                        type: SOLDAT_EVENTS.BASE_CAPTURE,
                        cappingTeam: SOLDAT_TEAMS.BLUE
                    },
                    {
                        timestamp: 6000,
                        type: SOLDAT_EVENTS.BASE_CAPTURE,
                        cappingTeam: SOLDAT_TEAMS.BLUE
                    }
                ]
            }
        )
    });

    it("should get player info", async (done) => {
        soldatClient.getPlayerInfo("vandal", (info) => {
            expect(info).containSubset({
                name: "vandal",
                playfabId: "7CCE15D959A12E91"
            })
            done()
        })
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine("[00:00:00] 0 vandal [id] 0 [account] 7CCE15D959A12E91 [team] 0 [score] 9 [kills] 9 [deaths] 14 [spawned] yes").raw))
    })

    it("should handle authentication", async () => {
        const auth = currentGather.authenticator

        let authenticated = await auth.isAuthenticated("PlayerADiscordID")
        expect(authenticated).equal(false)

        const authCode = auth.requestAuthentication("PlayerADiscordID")
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine(`[00:00:00] [PlayerA] !auth ${authCode}`).raw))
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine(`[00:00:00]  0 PlayerA [id] 0 [account] PlayerAPlayfabID [team] 0 [score] 9 [kills] 9 [deaths] 14 [spawned] yes`).raw))

        // TODO: We should not have to wait for 1 second here; need to figure out how to await an eventemitter...
        return new Promise((resolve, reject) => setTimeout(async () => {
            authenticated = await auth.isAuthenticated("PlayerADiscordID")
            expect(authenticated).equal(true)

            const map = await auth.getPlayfabIdToDiscordIdMap()
            expect(map["PlayerAPlayfabID"]).equal("PlayerADiscordID")

            resolve()
        }, 1000))
    })

    it("should handle authentication for player with regex characters in the name", async () => {
        const auth = currentGather.authenticator

        let authenticated = await auth.isAuthenticated("NamelessWolf")
        expect(authenticated).equal(false)

        const authCode = auth.requestAuthentication("NamelessWolf")
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine(`[00:00:00] [[WP] NamelessWolf] !auth ${authCode}`).raw))
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine(`[00:00:00]  0 [WP] NamelessWolf [id] 0 [account] NamelessPlayFabId [team] 0 [score] 9 [kills] 9 [deaths] 14 [spawned] yes`).raw))

        // TODO: We should not have to wait for 1 second here; need to figure out how to await an eventemitter...
        return new Promise((resolve, reject) => setTimeout(async () => {
            authenticated = await auth.isAuthenticated("NamelessWolf")
            expect(authenticated).equal(true)

            const map = await auth.getPlayfabIdToDiscordIdMap()
            expect(map["NamelessPlayFabId"]).equal("NamelessWolf")

            resolve()
        }, 1000))
    })

    it("should handle refuse to authenticate with bad code", async () => {
        const auth = currentGather.authenticator

        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine(`[00:00:00] [[WP] NamelessWolf] !auth blah`).raw))
        ws.emit("message", soldat.toBuffer(soldat.NetworkMessage.LogLine(`[00:00:00]  0 [WP] NamelessWolf [id] 0 [account] NamelessPlayFabId [team] 0 [score] 9 [kills] 9 [deaths] 14 [spawned] yes`).raw))

        // TODO: We should not have to wait for 1 second here; need to figure out how to await an eventemitter...
        return new Promise((resolve, reject) => setTimeout(async () => {
            const map = await auth.getPlayfabIdToDiscordIdMap()
            expect(_.size(map)).equal(4) // We map 4 of players inside beforeEach
            resolve()
        }, 1000))
    })

    // it('should handle gather pausing/unpausing', async () => {
    //     currentGather.currentSize = 4
    //     currentGather.currentQueue = ["a", "b", "c", "d"]
    //
    //     currentGather.startNewGame()
    //     currentGather.gatherStart('ttw_Test', 4, 5)
    //
    //     netClient.emit("data", "--- gatherpause")
    //     expect(currentGather.events.length).equal(1)
    //     expect(currentGather.events[0]).containSubset(
    //         {
    //             type: SOLDAT_EVENTS.GATHER_PAUSE,
    //         }
    //     )
    //
    //     netClient.emit("data", "--- gatherunpause")
    //     expect(currentGather.events.length).equal(2)
    //     expect(currentGather.events[1]).containSubset(
    //         {
    //             type: SOLDAT_EVENTS.GATHER_UNPAUSE,
    //         }
    //     )
    // });
    //
    // it('should handle kills and deaths', async () => {
    //     currentGather.currentSize = 4
    //     currentGather.currentQueue = ["a", "b", "c", "d"]
    //
    //     currentGather.startNewGame()
    //     currentGather.gatherStart('ttw_Test', 4, 5)
    //
    //     netClient.emit("data", "(2) [WP] NamelessWolf killed (1) SethGecko with Ak-74")
    //     expect(currentGather.events.length).equal(1)
    //     expect(currentGather.events[0]).containSubset({
    //         type: SOLDAT_EVENTS.PLAYER_KILL,
    //         killerTeam: "Blue",
    //         killerDiscordId: "[WP] NamelessWolf",
    //         victimTeam: "Red",
    //         victimDiscordId: "SethGecko",
    //         weaponId: SOLDAT_WEAPONS.AK_74.id,
    //     })
    // });
});
