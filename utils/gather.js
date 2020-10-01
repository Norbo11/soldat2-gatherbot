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
    alphaTeam = []
    bravoTeam = []
    inGameState = IN_GAME_STATES["NO_GATHER"]
    startTime = undefined
    endTime = undefined

    constructor(discordChannel, getCurrentTimestamp, statsDb) {
        this.discordChannel = discordChannel
        this.getCurrentTimestamp = getCurrentTimestamp
        this.statsDb = statsDb
        this.serverInfo = {
            "mapName": "some_soldat_2_map.ctf"
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

    startNewGame() {
        const shuffledQueue = _.shuffle(this.currentQueue)

        const alphaDiscordUsers = _.slice(shuffledQueue, 0, this.currentSize / 2)
        const bravoDiscordUsers = _.slice(shuffledQueue, this.currentSize / 2, this.currentSize)

        this.startGame(alphaDiscordUsers, bravoDiscordUsers)
    }

    startGame(alphaDiscordUsers, bravoDiscordUsers) {
        this.alphaTeam = alphaDiscordUsers
        this.bravoTeam = bravoDiscordUsers
        this.inGameState = IN_GAME_STATES["GATHER_PRE_RESET"]

        const alphaDiscordIds = this.alphaTeam.map(user => user.id)
        const bravoDiscordIds = this.bravoTeam.map(user => user.id)

        const allUsers = [...alphaDiscordUsers, ...bravoDiscordUsers]

        allUsers.forEach(user => {
            user.send({
                embed: {
                    title: "Gather Started",
                    color: 0xff0000,
                    fields: [
                        discord.getServerLinkField(this.password),
                        ...discord.getPlayerFields(alphaDiscordIds, bravoDiscordIds),
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
                    ...discord.getPlayerFields(alphaDiscordIds, bravoDiscordIds),
                    discord.getMapField(this.serverInfo["mapName"])
                ]
            }
        })
    }

    endGame() {
        this.endTime = this.getCurrentTimestamp()

        const alphaDiscordIds = this.alphaTeam.map(user => user.id)
        const bravoDiscordIds = this.bravoTeam.map(user => user.id)

        const game = {
            alphaPlayers: alphaDiscordIds,
            bravoPlayers: bravoDiscordIds,
            startTime: this.startTime,
            endTime: this.endTime,
            size: this.currentSize,
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
            if (![...lastGame.alphaPlayers, ...lastGame.bravoPlayers].includes(discordUser.id)) {
                discordUser.reply("you did not play in the last gather.")
                return
            }

            if (!this.rematchQueue.includes(discordUser)) {
                this.rematchQueue.push(discordUser)

                if (this.rematchQueue.length === lastGame.size) {
                    // Flip teams
                    const alphaDiscordUsers = _.filter(this.rematchQueue, user => lastGame.bravoPlayers.includes(user.id))
                    const bravoDiscordUsers = _.filter(this.rematchQueue, user => lastGame.alphaPlayers.includes(user.id))

                    this.currentSize = lastGame.size

                    this.startGame(alphaDiscordUsers, bravoDiscordUsers)
                } else {
                    this.displayQueue(lastGame.size, this.rematchQueue, lastGame.mapName, true)
                }
            } else {
                this.displayQueue(lastGame.size, this.rematchQueue, lastGame.mapName, true)
            }
        })
    }
}

module.exports = {
    Gather
}

