const gather = require("../utils/gather")
const logger = require("../utils/logger")
const soldat = require("../utils/soldat")
const soldatEvents = require("../utils/soldatEvents")
const db = require("../utils/db")

module.exports = client => {
    logger.log.info(`Logged in to Discord server as ${client.user.username}!`)

    db.getDbConnection().then(async (dbConnection) => {
        global.currentStatsDb = new db.StatsDB(dbConnection)
        global.currentDiscordChannel = client.channels.get(process.env.DISCORD_CHANNEL_ID)
        global.currentGather = new gather.Gather()
        currentDiscordChannel.send("GatherBot Initialised.")
    })
}
