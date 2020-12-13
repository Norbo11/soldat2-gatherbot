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
        stdio: ['ignore', 'pipe', 'ignore']
    });

    logger.log.info(`Spawned process with PID ${child.pid}`)

    return Promise.race([
        new Promise(((resolve, reject) => {
            let port = undefined

            // TODO: Technically we could use this to receive all events from the server. However we'll still need
            //  webrcon for sending commands. So currently we just use this for grabbing the port, all other events
            //  are taken via the webrcon connection.
            child.stdout.on("data", (data) => {
                const text = data.toString()
                const portMatch = text.match(/\[Info] {4}DefaultNetworkListener Server mounted, listening on port (?<port>.*)\./);

                if (portMatch !== null) {
                    logger.log.info("Received server port from server logs")
                    port = portMatch.groups["port"]
                }

                const initializedMatch = text.match(/WebRcon: Loaded 0 built-in commands/);

                if (initializedMatch !== null && port !== undefined) {
                    resolve({
                        pid: child.pid,
                        port
                    })
                }
            })
        })),

        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("Did not receive expected server startup message; sever did not start properly."))
            }, WAIT_SECONDS_AFTER_STARTING_SERVER * 1000)
        })
    ])
}


export const resolveServerStrategy = async (config) => {
    let result = undefined

    if (config.strategy === SERVER_STRATEGIES.ASSUME_SERVER_RUNNING_WITH_FIXED_CREDENTIALS) {
        logger.log.info(`Assuming ${config.code} is already running due to specified strategy`)
        result = config.webrconCredentials
        result.port = config.port

    } else if (config.strategy === SERVER_STRATEGIES.RUN_SERVER_WITH_FRESH_CREDENTIALS) {
        logger.log.info(`Starting ${config.code} as a child process due to specified strategy`)
        result = await fetchNewWebrconCredentials();
        result = {
            ...result,
            ...(await startServerWithWebrconCredentials(config.pathToServer, result))
        }
    } else {
        throw Error(`Invalid strategy for server ${config.code}`)
    }

    return result
}

export const initializeServer = async (server, sessionId, cKey) => {
    const soldatClient = await soldat.Soldat2Client.fromWebRcon(`[${server.code}]`, sessionId, cKey)

    const gather = new Gather(
        server,
        currentDiscordChannel,
        currentStatsDb,
        soldatClient,
        currentAuthenticator,
        getCurrentTimestamp)

    soldatEvents.registerSoldatEventListeners(`[${server.code}]`, gather, soldatClient)

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
            const {sessionId, cKey} = await fetchNewWebrconCredentials();
            const {pid, port} = await startServerWithWebrconCredentials(server.config.pathToServer, {sessionId, cKey});
            const newServer = currentQueueManager.createGatherServer(server.config, pid, port)

            const gather = await initializeServer(newServer, sessionId, cKey)
            currentQueueManager.addGatherServer(newServer, gather)
        }, WATI_SECONDS_AFTER_STOPPING_SERVER * 1000)
    }
}
