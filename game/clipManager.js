import _ from "lodash"

class ClipManager {

    constructor(statsDb, getCurrentTimestamp) {
        this.statsDb = statsDb
        this.getCurrentTimestamp = getCurrentTimestamp
    }

    async addClip(discordId, clipUrl) {
        return await this.statsDb.addClip(clipUrl, discordId, this.getCurrentTimestamp())
    }

    async deleteClip(clipId) {
        return await this.statsDb.deleteClip(clipId)
    }

    async getRandomClip() {
        const allClips = await this.statsDb.getAllClips()

        if (allClips.length === 0) {
            return null
        }

        const shuffled = _.shuffle(allClips)
        return shuffled[0]
    }

    async getClip(clipId) {
        return await this.statsDb.getClip(clipId)
    }
}


export { ClipManager }