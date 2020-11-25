const _ = require("lodash")
const logger = require("../utils/logger")
const discord = require("../utils/discord")
const random = require("../utils/random")
const maps = require("../utils/maps")
const util = require("util")
const constants = require("./constants")
const ctfRound = require("./ctfRound")
const ctbRound = require("./ctbRound")
const ratings = require("./ratings")

const IN_GAME_STATES = constants.IN_GAME_STATES;
const SOLDAT_EVENTS = constants.SOLDAT_EVENTS;
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS;
const GAME_MODES = constants.GAME_MODES;


class Gather {

    discordChannel = undefined
    currentSize = 6
    currentQueue = []
    rematchQueue = []
    currentRound = undefined
    endedRounds = []
    inGameState = IN_GAME_STATES.NO_GATHER
    gameMode = GAME_MODES.CAPTURE_THE_FLAG
    discordIdToPlayer = {}
    match = undefined

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
                    discord.getGameModeField(this.gameMode),
                ]
            }
        })
    }

    changeSize(newSize) {
        this.currentSize = newSize
        this.currentQueue = []
        currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue)
    }

    async startNewGame() {
        this.discordIdToPlayer = {}
        const allDiscordUsers = []

        for (let discordUser of this.currentQueue) {
            const discordId = discordUser.id
            let player = await this.statsDb.getPlayer(discordId)
            if (player === undefined) {
                player = ratings.createNewPlayer(discordId)
            }
            this.discordIdToPlayer[discordId] = player
            allDiscordUsers.push(discordUser)
        }

        const balancedMatch = ratings.getBalancedMatch(this.discordIdToPlayer, this.currentSize)
        balancedMatch.allDiscordUsers = allDiscordUsers
        this.startGame(balancedMatch)
    }

    startGame(match) {
        this.match = match
        this.inGameState = IN_GAME_STATES.GATHER_STARTED
        this.currentRound = this.gameMode === GAME_MODES.CAPTURE_THE_FLAG ?
            new ctfRound.CtfRound(this.getCurrentTimestamp) :
            new ctbRound.CtbRound(this.getCurrentTimestamp)

        match.allDiscordUsers.forEach(user => {
            user.send({
                embed: {
                    title: "Gather Started",
                    color: 0xff0000,
                    fields: [
                        discord.getGameModeField(this.gameMode),
                        discord.getServerLinkField(this.password),
                        ...discord.getPlayerFields(match),
                    ]
                }
            })
        })

        this.discordChannel.send({
            embed: {
                title: "Gather Started",
                color: 0xff0000,
                fields: [
                    discord.getGameModeField(this.gameMode),
                    ...discord.getPlayerFields(match),
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

    onBlueBaseCapture() {
        this.currentRound.blueCapturedBase()
    }

    onRedBaseCapture() {
        this.currentRound.redCapturedBase()
    }

    onMapChange(mapName) {
        this.currentRound.changeMap(mapName);
    }

    changeGameMode(gameMode) {

        let map = undefined

        if (gameMode === GAME_MODES.CAPTURE_THE_FLAG) {
            map = "ctf_ash"
        } else if (gameMode === GAME_MODES.CAPTURE_THE_BASES) {
            map = "ctb_gen_cobra"
        }

        this.gameMode = gameMode

        this.soldatClient.changeMap(map, this.gameMode, result => {
            if (result === "found") {
                this.discordChannel.send(`Changed game mode to **${gameMode}.**`)
            }

            if (result === "not_found") {
                this.discordChannel.send(`There was a problem changing game mode to **${gameMode}**!`)
            }
        })
    }

    endRound(winner) {

        // For CTF games, we determine the winner based on the flag cap events that we've kept track of.
        // For CTB games, we get told in the logs who won.
        if (this.gameMode === GAME_MODES.CAPTURE_THE_FLAG) {
            this.currentRound.end()
        } else if (this.gameMode === GAME_MODES.CAPTURE_THE_BASES) {
            this.currentRound.end(winner)
        } else {
            throw new Error(`Invalid game-mode detected: ${this.gameMode}`)
        }

        this.discordChannel.send({
            embed: {
                title: "Round Finished",
                color: 0xff0000,
                fields: discord.getRoundEndFields(this.gameMode, this.match.redDiscordIds, this.match.blueDiscordIds, this.currentRound),
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
            this.currentRound = this.currentRound.newRound()
        }
    }

    endGame(gameWinner) {
        const game = {
            gameMode: this.gameMode,
            redPlayers: this.match.redDiscordIds,
            bluePlayers: this.match.blueDiscordIds,
            size: this.currentSize,
            startTime: this.endedRounds[0].startTime,
            endTime: this.endedRounds[this.endedRounds.length - 1].endTime,
            winner: gameWinner,
            totalRounds: this.endedRounds.length,
            redRoundWins: _.filter(this.endedRounds, round => round.winner === SOLDAT_TEAMS.RED).length,
            blueRoundWins: _.filter(this.endedRounds, round => round.winner === SOLDAT_TEAMS.BLUE).length,
            matchQuality: this.match.matchQuality,
            blueWinProbability: this.match.blueWinProbability,
            redWinProbability: this.match.redWinProbability,
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

        const discordIdToOldRating = _.reduce(this.match.allDiscordIds, (object, discordId) => {
            object[discordId] = ratings.getRatingOfPlayer(this.discordIdToPlayer[discordId])
            return object
        }, {})
        const discordIdToNewRating = ratings.rateRounds(game, this.discordIdToPlayer)

        this.statsDb.insertGame(game).then().catch(e => logger.log.error(`Error when saving game to DB: ${e}`))

        for (let discordId of this.match.allDiscordIds) {
            const newRating = discordIdToNewRating[discordId]
            this.statsDb.upsertPlayer(discordId, newRating.mu, newRating.sigma).then().catch(e => logger.log.error(`Error when saving player to DB: ${e}`))
        }

        this.inGameState = IN_GAME_STATES.NO_GATHER
        this.currentQueue = []
        this.rematchQueue = []
        this.endedRounds = []
        this.currentRound = undefined
        this.discordIdToPlayer = {}
        this.match = undefined

        this.discordChannel.send({
            embed: {
                title: "Gather Finished",
                color: 0xff0000,
                fields: discord.getGatherEndFields(game, discordIdToOldRating, discordIdToNewRating),
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
        const firstPart = parts[0].toLowerCase()

        if (firstPart === "map") {
            if (parts.length === 2) {
                const mapName = parts[1]
                if (maps.verifyMap(mapName, this.gameMode)) {
                    this.soldatClient.changeMap(parts[1], this.gameMode)
                }
            }
        }

        if (firstPart === "say") {
            const message = _.slice(parts, 1)
            this.discordChannel.send(`[${playerName}] ${message}`)
        }

        if (firstPart === "restart" || firstPart === "r") {
            // There is an annoying "bug" that if you use !r during a CTB game, when that game ends, it won't
            // print the "Red WON!" or "Blue WON!" message which we require to end the game. So we make !r act like
            // the !map command whenever we can (currentRound is not null, so gather is running; and the currentRound
            // knows about the current map).
            if (this.currentRound === undefined || this.currentRound.mapName === undefined) {
                this.soldatClient.restart();
            } else {
                this.soldatClient.changeMap(this.currentRound.mapName, this.gameMode)
            }
        }
    }
}

module.exports = {
    Gather
}

