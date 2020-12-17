import chai from "chai";
const assert = chai.assert

import {getTestStatsDb} from "../utils/testUtils";
import {ClipManager} from "../game/clipManager";


describe("ClipManager", () => {
    let statsDb = undefined
    let currentTime = undefined
    let mockCurrentTimestamp = undefined

    beforeEach(async () => {
        statsDb = await getTestStatsDb()

        mockCurrentTimestamp = () => {
            return currentTime;
        }
    })

    afterEach(() => {
        statsDb.dropDatabase()
    })

    it("should add, fetch and delete clips", async () => {
        const clipManager = new ClipManager(statsDb, mockCurrentTimestamp)

        currentTime = 1000
        await clipManager.addClip("Player", "http://youtube.com")

        let clip = await clipManager.getClip(1)
        assert.containSubset(clip,{
            addedByDiscordId: "Player",
            addedTime: 1000,
            clipUrl: "http://youtube.com",
            id: 1
        })

        clip = await clipManager.getRandomClip()
        assert.containSubset(clip, {
            addedByDiscordId: "Player",
            addedTime: 1000,
            clipUrl: "http://youtube.com",
            id: 1
        })

        const result = await clipManager.deleteClip(1)
        assert.containSubset(result, {
            deletedCount: 1
        })

        clip = await clipManager.getRandomClip()
        assert.isNull(clip)
    })

    it("should return null clips", async () => {
        const clipManager = new ClipManager(statsDb, mockCurrentTimestamp)

        let clip = await clipManager.getClip(0)
        console.log(`is ${clip}`)
        assert.isNull(clip)

        clip = await clipManager.getRandomClip()
        assert.isNull(clip)
    })
})