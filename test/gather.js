const MongoClient = require('mongodb').MongoClient;

const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset)

const expect = chai.expect

const sinon = require("sinon")
const logger = require("../utils/logger")

const stats = require("../game/stats")
const db = require("../game/db")

const events = require("events");

const gather = require("../game/gather")
const constants = require("../utils/constants")

const TTW_CLASSES = constants.TTW_CLASSES
const TTW_EVENTS = constants.TTW_EVENTS
const SOLDAT_WEAPONS = constants.SOLDAT_WEAPONS
const IN_GAME_STATES = constants.IN_GAME_STATES

const soldat = require("../utils/soldat")
const soldatEvents = require("../game/soldatEvents")


function fourPlayersJoin(currentGather, netClient) {
    // These tasks go to sleep until they receive the right events from the server
    currentGather.playerJoin("a")
    currentGather.playerJoin("b")
    currentGather.playerJoin("c")
    currentGather.playerJoin("d")

    // Emitting an event goes through all listeners synchronously. These below "emit" calls block while they
    // complete the playerJoin tasks above (all of which have registered some listeners and are waiting for data
    // to arrive).
    netClient.emit("data", "--- hwid A a")
    netClient.emit("data", "--- hwid B b")
    netClient.emit("data", "--- hwid C c")
    netClient.emit("data", "--- hwid D d")
}


describe('Gather', () => {
    let currentGather = undefined
    let soldatClient = undefined
    let netClient = undefined
    let discordChannel = undefined
    let statsDb = undefined
    let mongoConn = undefined

    beforeEach(async () => {
        const mongoClient = await MongoClient.connect("mongodb://localhost:27017")
        mongoConn = mongoClient.db("testDb")
        statsDb = new db.StatsDB(mongoConn)

        netClient = new events.EventEmitter()
        netClient.write = (data) => {
            logger.log.info(`Wrote to server: ${data.trim()}`)
        }

        discordChannel = sinon.stub()
        discordChannel.send = (data) => {
            logger.log.info(`Wrote to discord channel: ${data}`)
        }

        discordChannel.client = sinon.stub()
        discordChannel.client.fetchUser = async _ => {
            return {username: "TestDiscordUser"}
        }

        await statsDb.mapHwidToDiscordId("A", "1")
        await statsDb.mapHwidToDiscordId("B", "2")
        await statsDb.mapHwidToDiscordId("C", "3")
        await statsDb.mapHwidToDiscordId("D", "4")

        const hwidToDiscordId = await statsDb.getHwidToDiscordIdMap()

        soldatClient = new soldat.SoldatClient(netClient)
        currentGather = new gather.Gather(soldatClient, discordChannel, statsDb, hwidToDiscordId, () => Date.now())
        soldatEvents.registerSoldatEventListeners(currentGather, netClient)
    });

    afterEach(async () => {
        await mongoConn.dropDatabase()
    })

    it('should handle gather beginnings and endings', async () => {
        expect(currentGather.inGameState).equal(IN_GAME_STATES["NO_GATHER"])

        // TODO: Refactor into methods on the gather class
        currentGather.currentSize = 4
        currentGather.currentQueue = ["a", "b", "c", "d"]

        currentGather.startNewGame()
        expect(currentGather.inGameState).equal(IN_GAME_STATES["GATHER_PRE_RESET"])

        netClient.emit("data", "--- gatherstart ttw_test 5")
        expect(currentGather.inGameState).equal(IN_GAME_STATES["GATHER_STARTED"])
        expect(currentGather.numberOfBunkers).equal(5)

        netClient.emit("data", "--- gatherend 333 0 2 0")
        expect(currentGather.inGameState).equal(IN_GAME_STATES["NO_GATHER"])
    });

    it('should handle class changes', async () => {
        currentGather.currentSize = 4
        currentGather.currentQueue = ["a", "b", "c", "d"]

        currentGather.startNewGame()
        fourPlayersJoin(currentGather, netClient);

        currentGather.gatherStart()

        netClient.emit("data", `<New TTW> a assigned to task ${TTW_CLASSES.GENERAL.id}`)
        expect(currentGather.events.length).equal(1)
        expect(currentGather.events[0]).containSubset({
            type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
            discordId: "1",
            newClassId: TTW_CLASSES.GENERAL.id
        })

        netClient.emit("data", `<New TTW> a assigned to task ${TTW_CLASSES.RADIOMAN.id}`)
        expect(currentGather.events.length).equal(2)
        expect(currentGather.events[0]).containSubset({
            type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
            discordId: "1",
            newClassId: TTW_CLASSES.GENERAL.id
        })

        expect(currentGather.events[1]).containSubset({
            type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
            discordId: "1",
            newClassId: TTW_CLASSES.RADIOMAN.id
        })
    });

    it('should handle flag caps', async () => {
        currentGather.currentSize = 4
        currentGather.currentQueue = ["a", "b", "c", "d"]

        currentGather.startNewGame()
        currentGather.gatherStart('ttw_Test', 4, 5)

        netClient.emit("data", "Norbo11 scores for Red Team")
        expect(currentGather.events.length).equal(1)
        expect(currentGather.events[0]).containSubset(
            {
                type: TTW_EVENTS.FLAG_CAP,
                discordId: "Norbo11",
                teamName: "Red"
            }
        )

        netClient.emit("data", "Someone scores for Blue Team")
        expect(currentGather.events.length).equal(2)
        expect(currentGather.events[1]).containSubset(
            {
                type: TTW_EVENTS.FLAG_CAP,
                discordId: "Someone",
                teamName: "Blue"
            }
        )
    });

    it('should handle gather pausing/unpausing', async () => {
        currentGather.currentSize = 4
        currentGather.currentQueue = ["a", "b", "c", "d"]

        currentGather.startNewGame()
        currentGather.gatherStart('ttw_Test', 4, 5)

        netClient.emit("data", "--- gatherpause")
        expect(currentGather.events.length).equal(1)
        expect(currentGather.events[0]).containSubset(
            {
                type: TTW_EVENTS.GATHER_PAUSE,
            }
        )

        netClient.emit("data", "--- gatherunpause")
        expect(currentGather.events.length).equal(2)
        expect(currentGather.events[1]).containSubset(
            {
                type: TTW_EVENTS.GATHER_UNPAUSE,
            }
        )
    });

    it('should handle conquering bunkers', async () => {
        currentGather.currentSize = 4
        currentGather.currentQueue = ["a", "b", "c", "d"]

        currentGather.startNewGame()
        currentGather.gatherStart('ttw_Test', 4, 5)

        netClient.emit("data", `<New TTW> SethGecko assigned to task ${TTW_CLASSES.GENERAL.id}`)
        expect(currentGather.events.length).equal(1)
        expect(currentGather.events[0]).containSubset({
            type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
            discordId: "SethGecko",
            newClassId: TTW_CLASSES.GENERAL.id
        })

        netClient.emit("data", "--- conquer 1 100 500 3 5 0")
        expect(currentGather.events.length).equal(2)
        expect(currentGather.events[1]).containSubset(
            {
                type: TTW_EVENTS.BUNKER_CONQUER,
                conqueringTeam: "Red",
                redTickets: 100,
                blueTickets: 500,
                currentRedBunker: 3,
                currentBlueBunker: 5,
                sabotaging: false
            }
        )
    });

    it('should handle kills and deaths', async () => {
        currentGather.currentSize = 4
        currentGather.currentQueue = ["a", "b", "c", "d"]

        currentGather.startNewGame()
        currentGather.gatherStart('ttw_Test', 4, 5)

        netClient.emit("data", "(2) [WP] NamelessWolf killed (1) SethGecko with Ak-74")
        expect(currentGather.events.length).equal(1)
        expect(currentGather.events[0]).containSubset({
            type: TTW_EVENTS.PLAYER_KILL,
            killerTeam: "Blue",
            killerDiscordId: "[WP] NamelessWolf",
            victimTeam: "Red",
            victimDiscordId: "SethGecko",
            weaponId: SOLDAT_WEAPONS.AK_74.id,
        })
    });

    it('should handle class switching prior to reset', async () => {
        currentGather.currentSize = 4
        currentGather.currentQueue = [{id: "1"}, {id: "2"}, {id: "3"}, {id: "4"}]
        currentGather.redTeam = [{id: "1"}, {id: "2"}]
        currentGather.blueTeam = [{id: "3"}, {id: "4"}]

        currentGather.startNewGame()
        fourPlayersJoin(currentGather, netClient);
        netClient.emit("data", `<New TTW> a assigned to task ${TTW_CLASSES.GENERAL.id}`)
        currentGather.gatherStart('ttw_Test', 4, 5)

        expect(currentGather.events.length).equal(1)
        expect(currentGather.events[0]).containSubset({
            timestamp: currentGather.startTime,
            type: TTW_EVENTS.PLAYER_CLASS_SWITCH,
            discordId: "1",
            newClassId: TTW_CLASSES.GENERAL.id
        })
    });
});
