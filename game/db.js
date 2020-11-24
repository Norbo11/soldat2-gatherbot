const MongoClient = require('mongodb').MongoClient;
const _ = require("lodash")
const logger = require("../utils/logger")

getUrl = () => {
    return process.env.MONGO_URL
}

getDbName = () => {
    return process.env.MONGO_DB_NAME
}

getDbConnection = async () => {
    const url = getUrl()
    const dbName = getDbName()

    logger.log.info(`Attempting connection to DB at ${url}/${dbName}`)
    const client = await MongoClient.connect(url)
    logger.log.info(`Successfully connected to DB at ${url}/${dbName}`)
    return client.db(dbName)
}

class StatsDB {
    constructor(db) {
        this.db = db;
    }

    async getAllGames() {
        const result = await this.db.collection("Game").find({})
        const games = await result.toArray()
        return _.sortBy(games, game => game.startTime)
    }

    async getLastGame() {
        const games = await this.getAllGames()
        if (games.length > 0) {
            return games[games.length - 1]
        } else {
            return undefined
        }
    }

    async getGameByStartTime(startTime) {
        const result = await this.db.collection("Game").find({startTime})
        return result.toArray()
    }

    async getAllDiscordIds() {
        const games = await this.getAllGames()
        const discordIds = new Set()
        games.forEach(game => {
            game.redPlayers.forEach(player => discordIds.add(player))
            game.bluePlayers.forEach(player => discordIds.add(player))
        })

        return [...discordIds] // Convert back to an array so that we can use things like .map
    }

    async insertGame(game) {
        logger.log.info("Saving game...")
        console.log(game)
        const result = await this.db.collection("Game").insertOne(game)
        logger.log.info("Game saved!")
        return result.insertedId
    }

    async getGamesWithPlayer(discordId) {
        const result = await this.db.collection("Game").find({
            $or: [
                {redPlayers: discordId},
                {bluePlayers: discordId}
            ]
        })
        const games = await result.toArray()
        return _.sortBy(games, game => game.startTime)
    }

    async getPlayer(discordId) {
        const result = await this.db.collection("Player").find({discordId})
        const array = await result.toArray()
        return array.length > 0 ? array[0] : undefined
    }

    async upsertPlayer(discordId, ratingMu, ratingSigma) {
        const result = await this.db.collection("Player").updateOne({discordId}, {
            $set: {discordId, ratingMu, ratingSigma}
        }, {
            upsert: true
        })
        logger.log.info(`Saved player ${discordId}`)
        return result.insertedId
    }

    async getHwidToDiscordIdMap() {
        const result = await this.db.collection("HWID").find({});
        const map = await result.next()

        if (map === null) {
            return {}
        } else {
            return map
        }
    }

    async mapHwidToDiscordId(hwid, discordId) {
        const hwidMap = await this.getHwidToDiscordIdMap()
        hwidMap[hwid] = discordId

        await this.db.collection("HWID").deleteOne({})
        await this.db.collection("HWID").insertOne(hwidMap)
    }
}

module.exports = {
    StatsDB, getDbConnection
}