import logger from '../utils/logger';
import db from '../game/db';
import git from '../utils/git';
import {ClipManager} from "../game/clipManager";
import {QueueManager} from "../game/queueManager";
import {readBotConfig} from "../utils/config";
import {Authenticator} from "../game/authentication";
import util from "util";
import {initializeServer, resolveServerStrategy} from "../game/soldatServer";

export default (client) => {
    logger.log.info(`Logged in to Discord server as ${client.user.username}!`)

    db.getDbConnection().then(async (dbConnection) => {
        const config = readBotConfig()

        if (config.servers.length === 0)  {
            throw Error("Need at least one server")
        }

        global.getCurrentTimestamp = () => Date.now()
        global.currentStatsDb = new db.StatsDB(dbConnection)
        global.currentDiscordChannel = client.channels.get(process.env.DISCORD_CHANNEL_ID)
        global.currentQueueManager = new QueueManager(currentDiscordChannel)
        global.currentClipManager = new ClipManager(currentStatsDb, getCurrentTimestamp)
        global.currentAuthenticator = new Authenticator(currentStatsDb)

        for (let serverConfig of config.servers) {
            const {sessionId, cKey, pid} = await resolveServerStrategy(serverConfig)
            logger.log.info(`Connecting with server ${serverConfig.code} using sessionId ${sessionId} and cKey ${cKey}`)

            // This await is crucial. It blocks until the connection with the current server is fully established and
            // we've received a response to our initialization command/ping message. Without this, we will only be
            // able to connect to one server, and the others will throw errors. Probably some poor implementation on
            // WebRcon side. Initially I thought it was http connection pools and/or TLS session caching causing some
            // problems, but I did a fair amount of digging to try and disable those, to no avail.
            try {
                const gather = await initializeServer(serverConfig, sessionId, cKey)
                currentQueueManager.addGatherServer(serverConfig, gather, pid)
            } catch (e) {
                currentDiscordChannel.send(`Server **${serverConfig.code}** not responding; will remain unavailable.`)
                logger.log.error(`Problem with initializing server ${serverConfig.code}: ${e}`)
            }
        }

        currentDiscordChannel.send("GatherBot Initialised.").catch(e => logger.log.error(`Could not send initialization message (${e.message}):\n${util.inspect(e.response)}`))
        git.postChangelog()
    })
};
