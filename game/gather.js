import _ from 'lodash';
import logger from '../utils/logger';
import discord from '../utils/discord';
import maps, {getRandomMapForGameMode} from '../utils/maps';
import util from 'util';
import {GAME_MODES, IN_GAME_STATES, SOLDAT_TEAMS} from './constants';
import ctfRound from './ctfRound';
import ctbRound from './ctbRound';
import ratings from './ratings';

export class Gather {

    constructor(server, discordChannel, statsDb, soldatClient, authenticator, getCurrentTimestamp) {
        this.server = server
        this.discordChannel = discordChannel
        this.statsDb = statsDb
        this.soldatClient = soldatClient
        this.authenticator = authenticator
        this.getCurrentTimestamp = getCurrentTimestamp
        this.currentRound = new ctfRound.CtfRound(getCurrentTimestamp)
        this.endedRounds = []
        this.inGameState = IN_GAME_STATES.NO_GATHER
        this.gameMode = GAME_MODES.CAPTURE_THE_FLAG
        this.match = undefined
        // this.password = "placeholder_password"
    }

    gatherInProgress() {
        return this.inGameState !== IN_GAME_STATES.NO_GATHER
    }

    async startNewGame(discordUsers) {
        const discordIdToRating = {}
        const allDiscordUsers = []

        for (let discordUser of discordUsers) {
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

        const balancedMatch = ratings.getBalancedMatch(discordIdToRating, discordUsers.length)
        balancedMatch.allDiscordUsers = allDiscordUsers
        balancedMatch.discordIdToRating = discordIdToRating
        balancedMatch.playfabIdToDiscordId = await this.authenticator.getPlayfabIdToDiscordIdMap()
        balancedMatch.tiebreakerMap = getRandomMapForGameMode(this.gameMode)
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
                        discord.getGameModeField(this.gameMode, true),
                        discord.getMapField(this.match.tiebreakerMap, true, "Tiebreaker "),
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
                    discord.getGameModeField(this.gameMode, true),
                    discord.getMapField(this.match.tiebreakerMap, true, "Tiebreaker "),
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
            size: this.match.allDiscordUsers.length,
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
                            this.soldatClient.say("Invalid auth code - use !auth in Discord for a new code.")
                            logger.log.info(`${playerName} failed to authenticate with invalid auth code ${authCode}`)
                        } else {
                            this.discordChannel.client.fetchUser(discordId).then(user => {
                                const message1 = `You have successfully linked your steam account with your Discord account.`
                                const message2 = `You will need to do this again if you ever change steam or Discord accounts.`

                                // Server has an issue with sending these together, so sending them seperately...
                                this.soldatClient.say(message1)
                                this.soldatClient.say(message2)

                                user.send(message1 + message2)
                            }).catch(e => logger.log.error(`Could not send auth confirmation to ${discordId}: ${e}\n${util.inspect(e)}`))
                        }
                    })
                })
            }
        }

        if (firstPart === "maps") {
            this.soldatClient.say(`CTF: ${maps.getMapsForGameMode(GAME_MODES.CAPTURE_THE_FLAG).join(', ')}`)
            this.soldatClient.say(`CTB: ${maps.getMapsForGameMode(GAME_MODES.CAPTURE_THE_BASES).join(', ')}`)
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
