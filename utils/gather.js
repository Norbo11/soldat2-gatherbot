const _ = require("lodash")
const logger = require("./logger")
const discord = require("./discord")
const random = require("./random")
const util = require("util")
const constants = require("./constants")

const IN_GAME_STATES = constants.IN_GAME_STATES
const TTW_EVENTS = constants.TTW_EVENTS


class Gather {

    discordChannel = undefined
    currentSize = 6
    currentQueue = []
    rematchQueue = []
    redTeam = []
    blueTeam = []
    inGameState = IN_GAME_STATES["NO_GATHER"]
    startTime = undefined
    endTime = undefined

    constructor(discordChannel, statsDb, soldatClient, getCurrentTimestamp) {
        this.discordChannel = discordChannel
        this.getCurrentTimestamp = getCurrentTimestamp
        this.statsDb = statsDb
        this.soldatClient = soldatClient
        this.serverInfo = {
            "mapName": "Decided in-game"
        }
        this.password = "placeholder_password"
    }

    gatherInProgress() {
        return this.inGameState !== IN_GAME_STATES.NO_GATHER
    }

    gatherHasStarted() {
        return this.inGameState === IN_GAME_STATES.GATHER_STARTED
    }

    displayQueue(size, queue, mapName, rematch = false) {
        const queueMembers = queue.map(user => `<@${user.id}>`)
        for (let i = 0; i < size - queue.length; i++) {
            queueMembers.push(":bust_in_silhouette:")
        }

        this.discordChannel.send({
            embed: {
                title: "Gather Info",
                color: 0xff0000,
                fields: [
                    {
                        name: "Current Queue" + (rematch ? " (rematch)" : ""),
                        value: `${queueMembers.join(" - ")}`
                    },
                    discord.getMapField(mapName),
                ]
            }
        })
    }

    changeSize(newSize) {
        this.currentSize = newSize
        this.currentQueue = []
        currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue, currentGather.serverInfo["mapName"])
    }

    startNewGame() {
        const shuffledQueue = _.shuffle(this.currentQueue)

        const redDiscordUsers = _.slice(shuffledQueue, 0, this.currentSize / 2)
        const blueDiscordUsers = _.slice(shuffledQueue, this.currentSize / 2, this.currentSize)

        this.startGame(redDiscordUsers, blueDiscordUsers)
    }

    startGame(redDiscordUsers, blueDiscordUsers) {
        this.redTeam = redDiscordUsers
        this.blueTeam = blueDiscordUsers
        this.inGameState = IN_GAME_STATES["GATHER_PRE_RESET"]

        const redDiscordIds = this.redTeam.map(user => user.id)
        const blueDiscordIds = this.blueTeam.map(user => user.id)

        const allUsers = [...redDiscordUsers, ...blueDiscordUsers]

        this.startTime = this.getCurrentTimestamp()

        allUsers.forEach(user => {
            user.send({
                embed: {
                    title: "Gather Started",
                    color: 0xff0000,
                    fields: [
                        discord.getServerLinkField(this.password),
                        ...discord.getPlayerFields(redDiscordIds, blueDiscordIds),
                        discord.getMapField(this.serverInfo["mapName"])
                    ]
                }
            })
        })

        this.discordChannel.send({
            embed: {
                title: "Gather Started",
                color: 0xff0000,
                fields: [
                    ...discord.getPlayerFields(redDiscordIds, blueDiscordIds),
                    discord.getMapField(this.serverInfo["mapName"])
                ]
            }
        })
    }

    endGame(mapName, redCaps, blueCaps) {
        this.endTime = this.getCurrentTimestamp()

        const redDiscordIds = this.redTeam.map(user => user.id)
        const blueDiscordIds = this.blueTeam.map(user => user.id)

        const game = {
            redPlayers: redDiscordIds,
            bluePlayers: blueDiscordIds,
            startTime: this.startTime,
            endTime: this.endTime,
            size: this.currentSize,
            redCaps: redCaps,
            blueCaps: blueCaps,
            mapName: mapName,
            events: [],
        }

        this.statsDb.insertGame(game).then().catch(e => logger.log.error(`Error when saving game to DB: ${e}`))

        this.inGameState = IN_GAME_STATES.NO_GATHER
        this.currentQueue = []
        this.rematchQueue = []

        this.discordChannel.send({
            embed: {
                title: "Gather Finished",
                color: 0xff0000,
                fields: discord.getGatherEndFields(game),
            }
        })
    }

    playerAdd(discordUser) {
        if (!this.currentQueue.includes(discordUser)) {
            this.currentQueue.push(discordUser)

            if (this.currentQueue.length === this.currentSize) {
                this.startNewGame()
            } else {
                this.displayQueue(this.currentSize, this.currentQueue, this.serverInfo["mapName"])
            }
        }
    }

    playerRematchAdd(discordUser) {
        this.statsDb.getLastGame().then(lastGame => {
            if (![...lastGame.redPlayers, ...lastGame.bluePlayers].includes(discordUser.id)) {
                discordUser.reply("you did not play in the last gather.")
                return
            }

            if (!this.rematchQueue.includes(discordUser)) {
                this.rematchQueue.push(discordUser)

                if (this.rematchQueue.length === lastGame.size) {
                    // Flip teams
                    const redDiscordUsers = _.filter(this.rematchQueue, user => lastGame.bluePlayers.includes(user.id))
                    const blueDiscordUsers = _.filter(this.rematchQueue, user => lastGame.redPlayers.includes(user.id))

                    this.currentSize = lastGame.size

                    this.startGame(redDiscordUsers, blueDiscordUsers)
                } else {
                    this.displayQueue(lastGame.size, this.rematchQueue, lastGame.mapName, true)
                }
            } else {
                this.displayQueue(lastGame.size, this.rematchQueue, lastGame.mapName, true)
            }
        })
    }

    playerCommand(playerName, command) {
        const parts = command.split(/ +/);

        if (parts[0] === "map") {
            if (parts.length === 2) {
                this.soldatClient.changeMap(parts[1], "CaptureTheFlag")
            }
        }

        if (parts[0] === "say") {
            const message = _.slice(parts, 1)
            this.discordChannel.send(`[${playerName}] ${message}`)
        }

        if (parts[0] === "restart" || parts[0] === "r") {
            this.soldatClient.restart();
        }
    }
}

module.exports = {
    Gather
}

