import mongodb from 'mongodb';
const MongoClient = mongodb.MongoClient;

import _ from 'lodash';
import logger from '../utils/logger';

const getUrl = () => {
    return process.env.MONGO_URL
}

const getDbName = () => {
    return process.env.MONGO_DB_NAME
}

const getDbConnection = async () => {
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

    async dropDatabase() {
        await this.db.dropDatabase()
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

    async getRatingUpdates(discordId) {
        const result = await this.db.collection("RatingUpdates").find({discordId})
        const ratingUpdates = await result.toArray()

        const sorted = _.sortBy(ratingUpdates,
            ratingUpdate => -ratingUpdate.gameStartTime,
            ratingUpdate => -ratingUpdate.roundStartTime
        )

        return sorted
    }

    async getMuSigma(discordId) {
        const ratingUpdates = await this.getRatingUpdates(discordId)

        if (ratingUpdates.length === 0) {
            return undefined
        } else {
            const latest = ratingUpdates[0]
            return {
                mu: latest.newMu,
                sigma: latest.newSigma,
            }
        }
    }

    async updateRating(discordId, gameStartTime, roundStartTime, newMu, newSigma) {
        const result = await this.db.collection("RatingUpdates").insertOne({
            discordId, gameStartTime, roundStartTime, newMu, newSigma
        })
        logger.log.info(`Updated rating for player ${discordId}: (${newMu}, ${newSigma})`)
        return result.insertedId
    }

    async getPlayfabIdToDiscordIdMap() {
        const result = await this.db.collection("PlayfabId").find({});
        const array = await result.toArray()
        const map = {}
        _.forEach(array, mapping => {
            map[mapping.playfabId] = mapping.discordId
        })
        return map
    }

    async mapPlayfabIdToDiscordId(playfabId, discordId) {
        const result = await this.db.collection("PlayfabId").replaceOne({
            playfabId
        }, {
            discordId, playfabId
        }, {
            upsert: true
        })
        return result.insertedId
    }

    async getAllClips() {
        const result = await this.db.collection("Clip").find({})
        const clips = await result.toArray()
        return clips
    }

    async getClip(clipId) {
        const result = await this.db.collection("Clip").findOne({id: clipId})
        if (result) {
            return result
        } else {
            return null
        }
    }

    async getNewClipId() {
        const clips = await this.getAllClips()
        const max = _.maxBy(clips, clip => clip.id)
        if (max === undefined) {
            return 1
        }
        return max.id + 1
    }

    async addClip(clipUrl, addedByDiscordId, addedTime) {
        const newId = await this.getNewClipId()

        await this.db.collection("Clip").insertOne({
            clipUrl, addedByDiscordId, addedTime, id: newId
        })

        return newId
    }

    async deleteClip(clipId) {
        return await this.db.collection("Clip").deleteOne({
            id: clipId
        })
    }

    async cacheDiscordUser(discordId, displayName, avatarUrl) {
        logger.log.info(`Mapping ${discordId} to display name ${displayName} (avatar ${avatarUrl})`)
        return await this.db.collection("DiscordUserCache").replaceOne({
            discordId
        }, {
            discordId, displayName, avatarUrl
        }, {
            upsert: true
        })
    }

    async getCachedDiscordUser(discordId) {
        const result = await this.db.collection("DiscordUserCache").findOne({discordId})
        if (result) {
            return result
        } else {
            return null
        }
    }
}

export default {
    StatsDB, getDbConnection
};