const gather = require("../game/gather")
const logger = require("../utils/logger")
const soldat = require("../game/soldat2")
const soldatEvents = require("../game/soldatEvents")
const db = require("../game/db")
const git = require("../utils/git")

module.exports = (client, webrconCredentials) => {
    logger.log.info(`Logged in to Discord server as ${client.user.username}!`)

    db.getDbConnection().then(async (dbConnection) => {
        global.currentStatsDb = new db.StatsDB(dbConnection)
        global.currentDiscordChannel = client.channels.get(process.env.DISCORD_CHANNEL_ID)

        const {sessionId, cKey} = webrconCredentials
        global.currentSoldatClient = soldat.Soldat2Client.fromWebRcon(sessionId, cKey)

        global.currentGather = new gather.Gather(
            global.currentDiscordChannel,
            global.currentStatsDb,
            global.currentSoldatClient,
            () => Date.now())

        soldatEvents.registerSoldatEventListeners(global.currentGather, global.currentSoldatClient)

        currentDiscordChannel.send("GatherBot Initialised.")
        git.postChangelog()
    })
}
