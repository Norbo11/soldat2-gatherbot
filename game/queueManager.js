import _ from "lodash";
import discord from "../utils/discord";
import logger from "../utils/logger"
import utils from "../utils/commandUtils";

export class QueueManager {

    constructor(discordChannel) {
        this.discordChannel = discordChannel
        this.servers = {}
    }

    addGatherServer(serverCode, gather) {
        this.servers[serverCode] = {
            code: serverCode,
            queue: [],
            gather,
            size: 6
        }
    }

    getServerWithLargestQueue() {
        const unfilledQueues = _.filter(this.servers, server => !this.isQueueFilled(server))

        if (unfilledQueues.length === 0) {
            return null
        }

        const sorted = _.sortBy(_.values(unfilledQueues), server => -server.queue.length)
        return sorted[0]
    }

    addToLargestQueue(discordUser) {
        const server = this.getServerWithLargestQueue()
        if (server === null) {
            return null
        }

        this.addToQueue(discordUser, server.code)
    }

    displayQueue(server, rematch = false) {
        const queue = server.queue

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
                        name: `**[${server.code}]** Current Queue ${rematch ? " (rematch)" : ""}`,
                        value: `${queueMembers.join(" - ")}`
                    },
                    discord.getGameModeField(server.gather.gameMode),
                ]
            }
        })
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

    addToQueue(discordUser, serverCode) {
        this.remove(discordUser)

        const server = this.getServer(serverCode)
        if (server === null) {
            return null
        }

        const queue = server.queue

        if (this.isQueueFilled(server)) {
            return null
        }

        server.gather.ensureWebrconAlive()

        if (!queue.includes(discordUser)) {
            queue.push(discordUser)

            if (queue.length === server.size) {
                server.gather.startNewGame().catch(e => logger.log.exception(e))
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

    remove(discordUser) {
        const server = this.findServerWithPlayer(discordUser)

        // Do nothing if player is not added
        if (server !== null) {
            _.remove(server.queue, (x) => x === discordUser)
            this.displayQueue(server)
        }
    }


}