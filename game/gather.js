const _ = require("lodash")
const logger = require("../utils/logger")
const discord = require("../utils/discord")
const random = require("../utils/random")
const util = require("util")
const constants = require("./constants")
const gatherRound = require("./gatherRound")

const IN_GAME_STATES = constants.IN_GAME_STATES;
const SOLDAT_EVENTS = constants.SOLDAT_EVENTS;
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS;


class Gather {

    discordChannel = undefined
    currentSize = 6
    currentQueue = []
    rematchQueue = []
    redTeam = []
    blueTeam = []
    currentRound = undefined
    endedRounds = []
    inGameState = IN_GAME_STATES["NO_GATHER"]

    constructor(discordChannel, statsDb, soldatClient, getCurrentTimestamp) {
        this.discordChannel = discordChannel
        this.getCurrentTimestamp = getCurrentTimestamp
        this.statsDb = statsDb
        this.soldatClient = soldatClient
        // this.password = "placeholder_password"
    }

    gatherInProgress() {
        return this.inGameState !== IN_GAME_STATES.NO_GATHER
    }

    displayQueue(size, queue, rematch = false) {
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
                ]
            }
        })
    }

    changeSize(newSize) {
        this.currentSize = newSize
        this.currentQueue = []
        currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue)
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
        this.inGameState = IN_GAME_STATES.GATHER_STARTED
        this.currentRound = new gatherRound.GatherRound(this.getCurrentTimestamp)

        const redDiscordIds = this.redTeam.map(user => user.id)
        const blueDiscordIds = this.blueTeam.map(user => user.id)

        const allUsers = [...redDiscordUsers, ...blueDiscordUsers]

        allUsers.forEach(user => {
            user.send({
                embed: {
                    title: "Gather Started",
                    color: 0xff0000,
                    fields: [
                        discord.getServerLinkField(this.password),
                        ...discord.getPlayerFields(redDiscordIds, blueDiscordIds),
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
                ]
            }
        })
    }

    redFlagCaptured() {
        this.currentRound.redFlagCaptured();
    }

    blueFlagCaptured() {
        this.currentRound.blueFlagCaptured();
    }

    changeMap(mapName) {
        this.currentRound.changeMap(mapName);
    }

    endRound() {
        this.currentRound.end()

        const redDiscordIds = this.redTeam.map(user => user.id)
        const blueDiscordIds = this.blueTeam.map(user => user.id)

        this.discordChannel.send({
            embed: {
                title: "Round Finished",
                color: 0xff0000,
                fields: discord.getRoundEndFields(redDiscordIds, blueDiscordIds, this.currentRound),
            }
        })

        this.endedRounds.push(this.currentRound);

        const totalRounds = this.endedRounds.length;

        let redRoundWins = 0;
        let blueRoundWins = 0;

        this.endedRounds.forEach(round => {
            if (round.winner === SOLDAT_TEAMS.RED) {
                redRoundWins += 1;
            } else if (round.winner === SOLDAT_TEAMS.BLUE) {
                blueRoundWins += 1;
            }
        })

        if (redRoundWins === 2 || blueRoundWins === 2 || totalRounds === 3) {
            let gameWinner;

            if (redRoundWins > blueRoundWins) {
                gameWinner = SOLDAT_TEAMS.RED
            } else if (blueRoundWins > redRoundWins) {
                gameWinner = SOLDAT_TEAMS.BLUE
            } else {
                gameWinner = SOLDAT_TEAMS.TIE
            }

            this.endGame(gameWinner)
        } else {
            this.currentRound = new gatherRound.GatherRound(this.getCurrentTimestamp)
        }
    }

    endGame(gameWinner) {
        const redDiscordIds = this.redTeam.map(user => user.id)
        const blueDiscordIds = this.blueTeam.map(user => user.id)

        const game = {
            redPlayers: redDiscordIds,
            bluePlayers: blueDiscordIds,
            size: this.currentSize,
            startTime: this.endedRounds[0].startTime,
            endTime: this.endedRounds[this.endedRounds.length - 1].endTime,
            winner: gameWinner,
            totalRounds: this.endedRounds.length,
            redRoundWins: _.filter(this.endedRounds, round => round.winner === SOLDAT_TEAMS.RED).length,
            blueRoundWins: _.filter(this.endedRounds, round => round.winner === SOLDAT_TEAMS.BLUE).length,
            rounds: this.endedRounds.map(round => {
                return {
                    startTime: round.startTime,
                    endTime: round.endTime,
                    mapName: round.mapName,
                    events: round.events,
                    blueCaps: round.blueCaps,
                    redCaps: round.redCaps,
                    winner: round.winner,
                }
            }),
        }

        this.statsDb.insertGame(game).then().catch(e => logger.log.error(`Error when saving game to DB: ${e}`))

        this.inGameState = IN_GAME_STATES.NO_GATHER
        this.currentQueue = []
        this.rematchQueue = []
        this.endedRounds = []
        this.currentRound = undefined

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
                this.displayQueue(this.currentSize, this.currentQueue)
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

