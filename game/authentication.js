const _ = require("lodash")
const random = require("../utils/random")
const logger = require("../utils/logger")

class Authenticator {

    constructor(statsDb) {
        this.statsDb = statsDb
        this.authCodes = {}
    }

    async getPlayfabIdToDiscordIdMap() {
        return await this.statsDb.getPlayfabIdToDiscordIdMap()
    }

    async isAuthenticated(discordId) {
        const map = await this.statsDb.getPlayfabIdToDiscordIdMap()
        const discordIds = _.values(map)
        return _.includes(discordIds, discordId)
    }

    requestAuthentication(discordId) {
        const authCode = random.getRandomString()
        this.authCodes[authCode] = discordId
        return authCode
    }

    authenticate(playfabId, authCode, callback) {
        if (!(authCode in this.authCodes)) {
            callback(false)
        }

        const discordId = this.authCodes[authCode]
        this.statsDb.mapPlayfabIdToDiscordId(playfabId, discordId).then(() => {
            delete this.authCodes[authCode]
            callback(discordId)
        }).catch((e) => logger.log.error(`There was an error authenticating discord ID ${discordId}: ${e}`))
    }
}

module.exports = {
    Authenticator
}

