import _ from "lodash";
import discord from "../utils/discord";
import logger from "../utils/logger"
import {onServerDied} from "./soldatServer";

export class QueueManager {

    constructor(discordChannel) {
        this.discordChannel = discordChannel
        this.servers = {}
    }

    getAllServers() {
        return _.values(this.servers)
    }

    createGatherServer(serverConfig, pid = undefined, port = undefined) {
        return {
            code: serverConfig.code,
            queue: [],
            size: 6,
            config: serverConfig,
            pid,
            port,
            ip: serverConfig.ip
        }
    }

    addGatherServer(server, gather) {
        this.discordChannel.send(`Server **${server.config.code}** fully operational; queue is now available.`)

        server.gather = gather
        this.servers[server.config.code] = server
    }

    deleteServer(code) {
        delete this.servers[code]
    }

    getServerWithLargestQueue() {
        const unfilledServers = _.filter(this.servers, server => !this.isQueueFilled(server))

        if (unfilledServers.length === 0) {
            return null
        }

        const sorted = _.sortBy(_.values(unfilledServers), server => -server.queue.length)
        return sorted[0]
    }

    getServerWithSmallestQueue() {
        const unfilledServers = _.filter(this.servers, server => !this.isQueueFilled(server))

        if (unfilledServers.length === 0) {
            return null
        }

        const sorted = _.sortBy(_.values(unfilledServers), server => server.queue.length)
        return sorted[0]
    }

    async addToLargestQueue(discordUser) {
        const server = this.getServerWithLargestQueue()
        if (server === null) {
            this.discordChannel.send("All servers/queues are currently full.")
            return null
        }

        await this.addToQueue(discordUser, server.code)
    }

    displayQueue(server, rematch = false) {
        const queue = server.queue

        if (server.gather.gatherInProgress()) {
            this.discordChannel.send({
                embed: {
                    color: 0xff0000,
                    title: "Gather Info",
                    description: "**Gather In Progress**",
                    fields: [
                        ...discord.getPlayerFields(server.gather.match),
                    ]
                }
            })
        } else {
            const queueMembers = queue.map(user => `<@${user.id}>`)
            for (let i = 0; i < server.size - queue.length; i++) {
                queueMembers.push(":bust_in_silhouette:")
            }

            this.discordChannel.send({
                embed: {
                    title: "Gather Info",
                    color: 0xff0000,
                    fields: [
                        {
                            name: `Current Queue ${rematch ? " (rematch)" : ""}`,
                            value: `${queueMembers.join(" - ")}`
                        },
                        discord.getGameModeField(server.gather.gameMode, true),
                        {
                            name: `Server`,
                            value: `${server.code}`,
                            inline: true
                        }
                    ]
                }
            })
        }
    }

    getQueue(code) {
        const server = this.getServer(code)
        return server.queue
    }

    getServer(code) {
        if (_.includes(_.keys(this.servers), code)) {
            return this.servers[code]
        } else {
            return null
        }
    }

    isQueueFilled(server) {
        return server.queue.length >= server.size
    }

    async addToQueue(discordUser, serverCode) {
        const playerServer = this.findServerWithPlayer(discordUser)
        if (playerServer !== null && this.isQueueFilled(playerServer)) {
            this.discordChannel.send(`You are already playing in a gather!`)
            return null
        }

        const server = this.getServer(serverCode)
        if (server === null) {
            this.discordChannel.send(`There is no server/queue with code ${serverCode}.`)
            return null
        }

        const queue = server.queue

        if (this.isQueueFilled(server)) {
            this.discordChannel.send(`A gather is already being played on server ${serverCode}.`)
            return null
        }

        const alive = await server.gather.checkServerAlive()

        if (!alive) {
            onServerDied(server)
            return
        }

        this.remove(discordUser, false)

        if (!queue.includes(discordUser)) {
            queue.push(discordUser)

            if (queue.length === server.size) {
                server.gather.startNewGame(queue).catch(e => logger.log.error(e))
            } else {
                this.displayQueue(server)
            }
        }
    }

    findServerWithPlayer(discordUser) {
        for (let server of _.values(this.servers)) {
            for (let queue of server.queue) {
                if (_.includes(server.queue, discordUser)) {
                    return server
                }
            }
        }

        return null
    }

    remove(discordUser, display = true) {
        const server = this.findServerWithPlayer(discordUser)

        // Do nothing if player is not added
        if (server !== null) {
            _.remove(server.queue, (x) => x === discordUser)

            if (display) {
                this.displayQueue(server)
            }
        }
    }

    changeSize(serverCode, newSize) {
        const server = this.getServer(serverCode)
        server.size = newSize
        server.queue = []
        this.displayQueue(server)
    }

    endGame(server) {
        server.queue = []
    }
}