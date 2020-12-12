import gather from '../game/gather';
import logger from '../utils/logger';
import soldat from '../game/soldat2';
import soldatEvents from '../game/soldatEvents';
import db from '../game/db';
import git from '../utils/git';
import {ClipManager} from "../game/clipManager";

export default (client, webrconCredentials) => {
    logger.log.info(`Logged in to Discord server as ${client.user.username}!`)

    db.getDbConnection().then(async (dbConnection) => {
        global.currentStatsDb = new db.StatsDB(dbConnection)
        global.currentDiscordChannel = client.channels.get(process.env.DISCORD_CHANNEL_ID)

        const {sessionId, cKey} = webrconCredentials
        global.currentSoldatClient = soldat.Soldat2Client.fromWebRcon(sessionId, cKey)

        const getCurrentTimestamp = () => Date.now()

        global.currentGather = new gather.Gather(
            global.currentDiscordChannel,
            global.currentStatsDb,
            global.currentSoldatClient,
            getCurrentTimestamp)

        global.currentClipManager = new ClipManager(currentStatsDb, getCurrentTimestamp)

        soldatEvents.registerSoldatEventListeners(global.currentGather, global.currentSoldatClient)

        currentDiscordChannel.send("GatherBot Initialised.")
        git.postChangelog()
    })
};
