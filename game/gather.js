import _ from 'lodash';
import logger from '../utils/logger';
import discord from '../utils/discord';
import maps from '../utils/maps';
import util from 'util';
import {GAME_MODES, IN_GAME_STATES, SOLDAT_TEAMS} from './constants';
import ctfRound from './ctfRound';
import ctbRound from './ctbRound';
import ratings from './ratings';

export class Gather {

    discordChannel = undefined
    currentQueue = []
    rematchQueue = []
    currentRound = undefined
    endedRounds = []
    inGameState = IN_GAME_STATES.NO_GATHER
    gameMode = GAME_MODES.CAPTURE_THE_FLAG
    match = undefined

    constructor(server, discordChannel, statsDb, soldatClient, authenticator, getCurrentTimestamp) {
        this.discordChannel = discordChannel
        this.getCurrentTimestamp = getCurrentTimestamp
        this.statsDb = statsDb
        this.soldatClient = soldatClient
        this.currentRound = new ctfRound.CtfRound(getCurrentTimestamp)
        this.authenticator = authenticator
        this.server = server
        // this.password = "placeholder_password"
    }

    gatherInProgress() {
        return this.inGameState !== IN_GAME_STATES.NO_GATHER
    }


    changeSize(newSize) {
        this.currentSize = newSize
        this.currentQueue = []
        currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue)
    }

    async startNewGame() {
        const discordIdToRating = {}
        const allDiscordUsers = []

        for (let discordUser of this.currentQueue) {
            const discordId = discordUser.id
            let rating = await this.statsDb.getMuSigma(discordId)
            if (rating === undefined) {
                rating = ratings.createRating()
            } else {
                rating = ratings.getRating(rating.mu, rating.sigma)
            }
            discordIdToRating[discordId] = rating
            allDiscordUsers.push(discordUser)
        }

        const balancedMatch = ratings.getBalancedMatch(discordIdToRating, this.currentSize)
        balancedMatch.allDiscordUsers = allDiscordUsers
        balancedMatch.discordIdToRating = discordIdToRating
        balancedMatch.playfabIdToDiscordId = await this.authenticator.getPlayfabIdToDiscordIdMap()
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
                        discord.getServerLinkField(this.server),
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

    redFlagCaptured(playerName, playerTeam, playfabId) {
        const discordId = this.match.playfabIdToDiscordId[playfabId]

        this.currentRound.redFlagCaptured(discordId);
    }

    blueFlagCaptured(playerName, playerTeam, playfabId) {
        const discordId = this.match.playfabIdToDiscordId[playfabId]

        this.currentRound.blueFlagCaptured(discordId);
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

    onPlayerKill(killerPlayfabId, killerTeam, victimPlayfabId, victimTeam, weapon) {
        const killerDiscordId = this.match.playfabIdToDiscordId[killerPlayfabId]
        const victimDiscordId = this.match.playfabIdToDiscordId[victimPlayfabId]

        this.currentRound.playerKill(killerDiscordId, killerTeam, victimDiscordId, victimTeam, weapon)
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
        }

        this.currentRound = this.currentRound.newRound()
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

        const discordIdToOldRating = this.match.discordIdToRating
        let discordIdToNewRating = Object.assign({}, discordIdToOldRating)

        this.statsDb.insertGame(game).then().catch((e) => `Could not save game: ${e}`)

        let i = 1
        for (let round of game.rounds) {
            logger.log.info(`Rating round ${i}`)
            discordIdToNewRating = ratings.rateRound(game.bluePlayers, game.redPlayers, discordIdToNewRating, round)

            for (let discordId of _.keys(discordIdToNewRating)) {
                const newRating = discordIdToNewRating[discordId]
                this.statsDb.updateRating(discordId, game.startTime, round.startTime, newRating.mu, newRating.sigma).catch((e) => `Could not save rating: ${e}`)
            }

            i += 1
        }

        this.inGameState = IN_GAME_STATES.NO_GATHER
        this.currentQueue = []
        this.rematchQueue = []
        this.endedRounds = []
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
        logger.log.info(`Processing command '${command}' for player '${playerName}'`)

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
            // the !map command. We must have seen at least 1 map change event before this works.
            if (this.currentRound === undefined || this.currentRound.mapName === undefined) {
                this.soldatClient.restart();
            } else {
                this.soldatClient.changeMap(this.currentRound.mapName, this.gameMode)
            }
        }

        if (firstPart === "auth") {
            if (parts.length === 2) {
                const authCode = parts[1]
                this.soldatClient.getPlayerInfo(playerName, player => {
                    this.authenticator.authenticate(player.playfabId, authCode, (discordId) => {
                        if (discordId === false) {
                            // TODO Auth code is incorrect. Message the player in-game once we
                            //  have an "rcon say" command
                            logger.log.info(`${playerName} failed to authenticate with invalid auth code ${authCode}`)
                        } else {
                            this.discordChannel.client.fetchUser(discordId).then(user => {
                                user.send("You have been successfully authenticated.")
                            }).catch(e => logger.log.error(`Could not send auth confirmation to ${discordId}: ${e}\n${util.inspect(e)}`))
                        }
                    })
                })
            }
        }
    }

    async checkServerAlive() {
        return new Promise(((resolve, reject) => {
            this.soldatClient.pingServer((response) => {
                if (response === undefined) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
        }))
    }
}
