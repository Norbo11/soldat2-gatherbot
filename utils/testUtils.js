import chai from "chai";
import chaiSubset from 'chai-subset';
import db from "../game/db";
import mongodb from "mongodb";
import logger from "./logger";
import sinon from "sinon";
import util from "util";

chai.use(chaiSubset)

const MongoClient = mongodb.MongoClient;


export const getTestStatsDb = async () => {
    const mongoClient = await MongoClient.connect("mongodb://localhost:27017")
    const mongoConn = mongoClient.db("testDb")
    const statsDb = new db.StatsDB(mongoConn)
    return statsDb
}

export const getTestDiscordChannel = () => {
    const discordChannel = sinon.stub()

    discordChannel.send = (data) => {
        logger.log.info(`Wrote to discord channel: ${util.inspect(data, false, null, true)}`)
    }

    discordChannel.client = sinon.stub()
    discordChannel.client.fetchUser = async discordId => {
        return {username: "TestDiscordUser", send: (message) => logger.log.info(`Sending message to ${discordId}: ${util.inspect(message, false, null, true)}`)}
    }

    return discordChannel
}

export const getTestGather = () => {
    const gather = sinon.stub()
    gather.startNewGame = () => {
        return new Promise((resolve, reject) => {
            logger.log.info("Started new gather")
            resolve()
        })
    }
    gather.checkServerAlive = () => {
        return new Promise((resolve, reject) => {
            logger.log.info("Checked that server is alive")
            resolve(true)
        })
    }
    gather.gatherInProgress = () => {
        return false
    }
    return gather
}

export class MockDiscordUser {

    constructor(id) {
        this.id = id
    }

    send(message) {
        logger.log.info(`Sending message to ${this.id}:\n${util.inspect(message, false, null, true)}`)
    }
}

export const getTestServer = () => {
    return {

    }
}