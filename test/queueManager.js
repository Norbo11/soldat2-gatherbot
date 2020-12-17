import chai from "chai";
import {getTestDiscordChannel, getTestGather, getTestStatsDb, MockDiscordUser} from "../utils/testUtils";
import {QueueManager} from "../game/queueManager";
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
    let queueManager = undefined

    beforeEach(async () => {
        statsDb = await getTestStatsDb()
        discordChannel = getTestDiscordChannel()
        gather1 = getTestGather()
        gather2 = getTestGather()

        queueManager = new QueueManager(discordChannel)
        const server1 = queueManager.createGatherServer({
            code: "eu-1"
        })

        const server2 = queueManager.createGatherServer({
            code: "eu-2"
        })

        queueManager.addGatherServer(server1, gather1)
        queueManager.addGatherServer(server2, gather2)

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
        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")
        const player = players[0]

        assert.deepEqual(queue1, [])
        assert.deepEqual(queue2, [])

        await queueManager.addToLargestQueue(player)
        assert.deepEqual(queue1, [player])

        await queueManager.addToLargestQueue(player)
        assert.deepEqual(queue1, [player])

        await queueManager.remove(player)
        assert.deepEqual(queue1, [])

        await queueManager.remove(player)
        assert.deepEqual(queue1, [])

    })

    it("should ensure players are only ever present in one queue", async () => {
        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")
        const player = players[0]

        await queueManager.addToQueue(player, "eu-1")
        assert.deepEqual(queue1, [player])
        assert.deepEqual(queue2, [])

        await queueManager.addToQueue(player, "eu-2")
        assert.deepEqual(queue1, [])
        assert.deepEqual(queue2, [player])
    })

    it("should fill up unfilled queues", async () => {
        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")

        await queueManager.addToQueue(players[0], "eu-1")
        await queueManager.addToQueue(players[1], "eu-1")
        await queueManager.addToQueue(players[2], "eu-1")
        await queueManager.addToQueue(players[3], "eu-1")
        await queueManager.addToQueue(players[4], "eu-1")
        await queueManager.addToQueue(players[5], "eu-1")

        assert.deepEqual(queue1, _.filter(players, (player, i) => i <= 5))
        assert.deepEqual(queue2, [])

        await queueManager.addToLargestQueue(players[6])

        assert.deepEqual(queue1, _.filter(players, (player, i) => i <= 5))
        assert.deepEqual(queue2, [players[6]])
    })

    it("should fail to add when all queues are full", async () => {
        const queue1 = queueManager.getQueue("eu-1")
        const queue2 = queueManager.getQueue("eu-2")

        const sixPlayers1 = _.filter(players, (player, i) => i <= 5)
        const sixPlayers2 = _.filter(players, (player, i) => i >= 6 && i <= 11)

        for (let player of sixPlayers1) {
            await queueManager.addToQueue(player, "eu-1")
        }

        for (let player of sixPlayers2) {
            await queueManager.addToQueue(player, "eu-2")
        }

        assert.deepEqual(queue1, sixPlayers1)
        assert.deepEqual(queue2, sixPlayers2)

        const result = await queueManager.addToLargestQueue(players[6])
        assert.isNull(result)
    })

    it("should fail to add to full queue", async () => {
        const queue1 = queueManager.getQueue("eu-1")
        const sixPlayers1 = _.filter(players, (player, i) => i <= 5)

        for (let player of sixPlayers1) {
            await queueManager.addToQueue(player, "eu-1")
        }

        assert.deepEqual(queue1, sixPlayers1)

        const result = await queueManager.addToQueue(players[6], "eu-1")
        assert.isNull(result)
    })

    it("should fail to add to non-existant server", async () => {
        const result = await queueManager.addToQueue(players[0], "invalid-code")
        assert.isNull(result)
    })
})