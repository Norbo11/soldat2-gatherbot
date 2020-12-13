import fs from "fs";
import ini from "ini";
import logger from "../utils/logger";
import child_process from "child_process";
import {SERVER_STRATEGIES} from "../utils/config";
import {fetchNewWebrconCredentials} from "../utils/webrcon";
import soldat from "./soldat2";
import {Gather} from "./gather";
import soldatEvents from "./soldatEvents";


// Give enough time for ports to clear
const WATI_SECONDS_AFTER_STOPPING_SERVER = 90

// Give enough time for server to start before we attempt to connect to it
const WAIT_SECONDS_AFTER_STARTING_SERVER = 10

export const startServerWithWebrconCredentials = async (pathToServer, webrconCredentials) => {
    const configFilename = `${pathToServer}/autoconfig.ini`

    // Trim the beginning of the file because there's some weird character there that messes up the parsing
    const configContents = fs.readFileSync(configFilename, "utf-8").trimStart()
    const config = ini.parse(configContents)
    config.WebRcon.cKey = webrconCredentials.cKey

    logger.log.info(`Modifying ${configFilename} with cKey ${webrconCredentials.cKey}`)
    fs.writeFileSync(configFilename, ini.stringify(config, { whitespace: true }))

    logger.log.info("Launching Soldat 2 process...")

    // https://nodejs.org/api/child_process.html
    const child = child_process.spawn(`${pathToServer}/soldat2`, [], {

        // Can use "true" if we want the S2 server to continue running after we shut down the bot
        detached: false,

        // stdin, stdout, stderr are all ignored; server logs should be tailed via Logs/console.txt
        stdio: ['ignore', 'ignore', 'ignore']
    });

    logger.log.info(`Spawned process with PID ${child.pid}`)

    return new Promise(((resolve, reject) => {
        setTimeout(() => {
            resolve(child.pid)
        }, WAIT_SECONDS_AFTER_STARTING_SERVER * 1000)
    }))
}


export const resolveServerStrategy = async (config) => {
    let result = undefined

    if (config.strategy === SERVER_STRATEGIES.ASSUME_SERVER_RUNNING_WITH_FIXED_CREDENTIALS) {
        logger.log.info(`Assuming ${config.code} is already running due to specified strategy`)
        result = config.webrconCredentials

    } else if (config.strategy === SERVER_STRATEGIES.RUN_SERVER_WITH_FRESH_CREDENTIALS) {
        logger.log.info(`Starting ${config.code} as a child process due to specified strategy`)
        result = await fetchNewWebrconCredentials();
        result.pid = await startServerWithWebrconCredentials(config.pathToServer, result);
    } else {
        throw Error(`Invalid strategy for server ${config.code}`)
    }

    return result
}

export const initializeServer = async (serverConfig, sessionId, cKey) => {
    const soldatClient = await soldat.Soldat2Client.fromWebRcon(`[${serverConfig.code}]`, sessionId, cKey)

    const gather = new Gather(
        currentDiscordChannel,
        currentStatsDb,
        soldatClient,
        currentAuthenticator,
        getCurrentTimestamp)

    soldatEvents.registerSoldatEventListeners(gather, soldatClient)

    return gather
}

export const onServerDied = (server) => {

    if (server.config.strategy === SERVER_STRATEGIES.ASSUME_SERVER_RUNNING_WITH_FIXED_CREDENTIALS) {
        currentDiscordChannel.send("Detected issue with webrcon connection/credentials. This server will remain unusable until action is taken.")
    } else if (server.config.strategy === SERVER_STRATEGIES.RUN_SERVER_WITH_FRESH_CREDENTIALS) {
        currentDiscordChannel.send("Detected issue with webrcon connection/credentials. Restarting server...")

        currentQueueManager.deleteServer(server.code)

        process.kill(server.pid, "SIGINT")

        setTimeout(async () => {
            const {sessionId, cKey, pid} = await fetchNewWebrconCredentials();
            result.pid = await startServerWithWebrconCredentials(server.config.pathToServer, result);
            const gather = await initializeServer(server.config, sessionId, cKey)
            currentQueueManager.addGatherServer(server.config, gather, pid)
        }, WATI_SECONDS_AFTER_STOPPING_SERVER * 1000)
    }
}
