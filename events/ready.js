import logger from '../utils/logger';
import soldat from '../game/soldat2';
import soldatEvents from '../game/soldatEvents';
import db from '../game/db';
import git from '../utils/git';
import {ClipManager} from "../game/clipManager";
import {QueueManager} from "../game/queueManager";
import {readBotConfig} from "../utils/config";
import {Authenticator} from "../game/authentication";
import {Gather} from "../game/gather";
import util from "util";

export default (client) => {
    logger.log.info(`Logged in to Discord server as ${client.user.username}!`)

    db.getDbConnection().then(async (dbConnection) => {
        const config = readBotConfig()

        if (config.servers.length === 0)  {
            throw Error("Need at least one server")
        }

        const getCurrentTimestamp = () => Date.now()

        global.currentStatsDb = new db.StatsDB(dbConnection)
        global.currentDiscordChannel = client.channels.get(process.env.DISCORD_CHANNEL_ID)
        global.currentQueueManager = new QueueManager(currentDiscordChannel)
        global.currentClipManager = new ClipManager(currentStatsDb, getCurrentTimestamp)
        global.currentAuthenticator = new Authenticator(currentStatsDb)

        for (let serverConfig of config.servers) {
            // TODO: Implement credentialsStrategy
            const {sessionId, cKey} = serverConfig.webrcon

            // if (process.env.WEBRCON_CKEY_ID === "" || process.env.WEBRCON_SESSION_ID === "")  {
            //     const webrconCredentials = await webrcon.fetchNewWebrconCredentials();
            //     setUpServer(webrconCredentials);
            //
            //     // After 10 seconds, resume bot initialization. This is to prevent us from connecting to WebRcon too soon (before
            //     // the server is up), etc.
            //     setTimeout(() => afterServerSetup(webrconCredentials), 10000);
            // } else {
            //     const webrconCredentials = {
            //         cKey: process.env.WEBRCON_CKEY_ID,
            //         sessionId: process.env.WEBRCON_SESSION_ID
            //     }
            //     await afterServerSetup(webrconCredentials);
            // }
            //
            logger.log.info(`Connecting with server ${serverConfig.code} using sessionId ${sessionId} and cKey ${cKey}`)
            const soldatClient = soldat.Soldat2Client.fromWebRcon(`[${serverConfig.code}]`, sessionId, cKey)

            const gather = new Gather(
                global.currentDiscordChannel,
                global.currentStatsDb,
                soldatClient,
                global.currentAuthenticator,
                getCurrentTimestamp)

            soldatEvents.registerSoldatEventListeners(gather, soldatClient)
            currentQueueManager.addGatherServer(serverConfig, gather)
        }

        currentDiscordChannel.send("GatherBot Initialised.").catch(e => logger.log.error(`Could not send initialization message (${e.message}):\n${util.inspect(e.response)}`))
        git.postChangelog()
    })
};
