import chai from "chai";
import {getTestDiscordChannel, getTestGather, getTestStatsDb, MockDiscordUser} from "../utils/testUtils";
import sinon from 'sinon';
import {QueueManager} from "../game/queueManager";
import logger from "../utils/logger"
import _ from "lodash"

const assert = chai.assert


describe("QueueManager", () => {
    let statsDb = undefined
    let currentTime = undefined
    let mockCurrentTimestamp = undefined
    let discordChannel = undefined
    let players = undefined
    let gather1 = undefined
    let gather2 = undefined

    beforeEach(async () => {
        statsDb = await getTestStatsDb()
        discordChannel = getTestDiscordChannel()
        gather1 = getTestGather()
        gather2 = getTestGather()

        mockCurrentTimestamp = () => {
            return currentTime;
        }

        players = []

        for (let i = 0; i < 20; i++) {
            players.push(new MockDiscordUser(`${i}`))
        }
    })

    afterEach(() => {
        statsDb.dropDatabase()
    })

    it("should add and remove players", async () => {
        const queueManager = new QueueManager(discordChannel)
        queueManager.addGatherServer("eu-1", gather1)
        queueManager.addGatherServer("eu-2", gather2)

        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")
        const player = players[0]

        assert.deepEqual(queue1, [])
        assert.deepEqual(queue2, [])

        queueManager.addToLargestQueue(player)
        assert.deepEqual(queue1, [player])

        queueManager.addToLargestQueue(player)
        assert.deepEqual(queue1, [player])

        queueManager.remove(player)
        assert.deepEqual(queue1, [])

        queueManager.remove(player)
        assert.deepEqual(queue1, [])

    })

    it("should ensure players are only ever present in one queue", async () => {
        const queueManager = new QueueManager(discordChannel)
        queueManager.addGatherServer("eu-1", gather1)
        queueManager.addGatherServer("eu-2", gather2)

        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")
        const player = players[0]

        queueManager.addToQueue(player, "eu-1")
        assert.deepEqual(queue1, [player])
        assert.deepEqual(queue2, [])

        queueManager.addToQueue(player, "eu-2")
        assert.deepEqual(queue1, [])
        assert.deepEqual(queue2, [player])
    })

    it("should fill up unfilled queues", async () => {
        const queueManager = new QueueManager(discordChannel)

        queueManager.addGatherServer("eu-1", gather1)
        queueManager.addGatherServer("eu-2", gather2)

        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")

        queueManager.addToQueue(players[0], "eu-1")
        queueManager.addToQueue(players[1], "eu-1")
        queueManager.addToQueue(players[2], "eu-1")
        queueManager.addToQueue(players[3], "eu-1")
        queueManager.addToQueue(players[4], "eu-1")
        queueManager.addToQueue(players[5], "eu-1")

        assert.deepEqual(queue1, _.filter(players, (player, i) => i <= 5))
        assert.deepEqual(queue2, [])

        queueManager.addToLargestQueue(players[6])

        assert.deepEqual(queue1, _.filter(players, (player, i) => i <= 5))
        assert.deepEqual(queue2, [players[6]])
    })

    it("should fail to add when all queues are full", async () => {
        const queueManager = new QueueManager(discordChannel)

        queueManager.addGatherServer("eu-1", gather1)
        queueManager.addGatherServer("eu-2", gather2)

        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")

        const sixPlayers1 = _.filter(players, (player, i) => i <= 5)
        const sixPlayers2 = _.filter(players, (player, i) => i >= 6 && i <= 11)

        for (let player of sixPlayers1) {
            queueManager.addToQueue(player, "eu-1")
        }

        for (let player of sixPlayers2) {
            queueManager.addToQueue(player, "eu-2")
        }

        assert.deepEqual(queue1, sixPlayers1)
        assert.deepEqual(queue2, sixPlayers2)

        const result = queueManager.addToLargestQueue(players[6])
        assert.isNull(result)
    })

    it("should fail to add to full queue", async () => {
        const queueManager = new QueueManager(discordChannel)
        queueManager.addGatherServer("eu-1", gather1)

        const queue1 = queueManager.getQueue("eu-1")
        const sixPlayers1 = _.filter(players, (player, i) => i <= 5)

        for (let player of sixPlayers1) {
            queueManager.addToQueue(player, "eu-1")
        }

        assert.deepEqual(queue1, sixPlayers1)

        const result = queueManager.addToQueue(players[6], "eu-1")
        assert.isNull(result)
    })

    it("should fail to add to non-existant server", async () => {
        const queueManager = new QueueManager(discordChannel)
        queueManager.addGatherServer("eu-1", gather1)

        const result = queueManager.addToQueue(players[0], "invalid-code")
        assert.isNull(result)
    })
})