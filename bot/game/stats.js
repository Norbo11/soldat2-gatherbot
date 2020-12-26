import _ from 'lodash';
import {GAME_MODES, SOLDAT_EVENTS, SOLDAT_TEAMS, SOLDAT_WEAPONS} from './constants';
import ratings from './ratings';

const getCaps = (discordId, events) => {
    events = _.filter(events, event =>
        event.type === SOLDAT_EVENTS.FLAG_CAP
        && event.discordId === discordId
    )

    return events.length
}


const filterKillEvent = (event) => {
    return event.type === SOLDAT_EVENTS.PLAYER_KILL
    && event.killerDiscordId !== event.victimDiscordId // Do not count selfkills as kills
    && event.killerTeam !== event.victimTeam // Do not count friendly kills
}

const filterDeathEvent = (event, discordId = null) => {
    return event.type === SOLDAT_EVENTS.PLAYER_KILL
    // Count deaths from other people, or selfkills
    && (event.killerTeam !== event.victimTeam || event.killerDiscordId === discordId)
}

const filterKillEventsByPlayer = (events, discordId) => {
    return _.filter(events, event => event.killerDiscordId === discordId && filterKillEvent(event));
}

const filterDeathEventsByPlayer = (events, discordId) => {
    return _.filter(events, event => event.victimDiscordId === discordId && filterDeathEvent(event, discordId));
}

const getKillsAndDeathsPerWeapon = (discordId, events) => {
    const weaponStats = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        weaponStats[SOLDAT_WEAPONS[weaponKey].formattedName] = {
            kills: 0,
            deaths: 0
        }
    })
    const killEvents = filterKillEventsByPlayer(events, discordId);
    const deathEvents = filterDeathEventsByPlayer(events, discordId);

    killEvents.forEach(event => {
        weaponStats[event.weaponName].kills += 1
    })

    deathEvents.forEach(event => {
        weaponStats[event.weaponName].deaths += 1
    })

    return weaponStats
}

const getTeamKills = (discordId, events) => {

    const teamKillEvents = _.filter(events, event =>
        event.type === SOLDAT_EVENTS.PLAYER_KILL
        && event.killerDiscordId !== event.victimDiscordId // Do not count selfkills as team kills
        && event.killerTeam === event.victimTeam
    )

    return teamKillEvents.length
}

const getPlayerStats = async (statsDb, discordId) => {
    const ratingNumbers = await statsDb.getMuSigma(discordId)

    if (ratingNumbers === undefined) {
        return undefined
    }

    const rating = ratings.getRating(ratingNumbers.mu, ratingNumbers.sigma)

    const games = await statsDb.getGamesWithPlayer(discordId)

    let totalGames = 0
    let wonGames = 0
    let lostGames = 0
    let tiedGames = 0
    let totalKills = 0
    let totalTeamKills = 0
    let totalDeaths = 0
    let totalGatherTime = 0
    let totalCaps = 0
    let totalRounds = 0
    let totalRoundsAfterKillTrackingWasImplemented = 0
    const weaponStats = {}
    const sizeStats = {}
    const gameModeStats = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        weaponStats[SOLDAT_WEAPONS[weaponKey].formattedName] = {
            kills: 0,
            deaths: 0,
            totalRounds: 0, // Defined as getting at least 1 kill with the weapon in a given round
        }
    })

    Object.keys(GAME_MODES).forEach(gameMode => {
        gameModeStats[GAME_MODES[gameMode]] = {
            totalGames: 0,
            wonGames: 0,
            lostGames: 0,
            tiedGames: 0
        }
    })

    games.forEach(game => {
        totalGames += 1

        const playerTeam = game.redPlayers.includes(discordId) ? SOLDAT_TEAMS.RED : SOLDAT_TEAMS.BLUE

        if (!(game.size in sizeStats)) {
            sizeStats[game.size] = {
                totalGames: 0,
                wonGames: 0,
                lostGames: 0,
                tiedGames: 0,
            }
        }

        if (game.winner === SOLDAT_TEAMS.TIE) {
            tiedGames += 1
            sizeStats[game.size].tiedGames += 1
            gameModeStats[game.gameMode].tiedGames += 1
        } else if (game.winner === playerTeam) {
            wonGames += 1
            sizeStats[game.size].wonGames += 1
            gameModeStats[game.gameMode].wonGames += 1
        } else {
            lostGames += 1
            sizeStats[game.size].lostGames += 1
            gameModeStats[game.gameMode].lostGames += 1
        }

        sizeStats[game.size].totalGames += 1
        gameModeStats[game.gameMode].totalGames += 1
        const gameTime = game.endTime - game.startTime
        totalGatherTime += gameTime

        // totalCaps += getCaps(discordId, game.events)
        totalRounds += game.rounds.length

        // TODO: This is the start time of the game where we first started tracking kills... it kinda sucks,
        //   so maybe we need to reset stats.
        if (game.startTime >= 1606852578641) {
            totalRoundsAfterKillTrackingWasImplemented += game.rounds.length
        }

        _.forEach(game.rounds, round => {
            totalTeamKills += getTeamKills(discordId, round.events)
            const killsAndDeathsPerWeapon = getKillsAndDeathsPerWeapon(discordId, round.events)

            Object.keys(killsAndDeathsPerWeapon).forEach(weaponName => {
                weaponStats[weaponName].kills += killsAndDeathsPerWeapon[weaponName].kills
                weaponStats[weaponName].deaths += killsAndDeathsPerWeapon[weaponName].deaths

                if (killsAndDeathsPerWeapon[weaponName].kills > 0) {
                    weaponStats[weaponName].totalRounds += 1
                }

                totalKills += killsAndDeathsPerWeapon[weaponName].kills
                totalDeaths += killsAndDeathsPerWeapon[weaponName].deaths
            })
        })
    })

    let firstGameTimestamp = totalGames > 0 ? _.sortBy(games, game => game.startTime)[0].startTime : 0
    let lastGameTimestamp = totalGames > 0 ? _.sortBy(games, game => -game.startTime)[0].startTime : 0

    return {
        totalGames, wonGames, lostGames, weaponStats, totalKills, totalDeaths, totalGatherTime, totalCaps,
        sizeStats, firstGameTimestamp, lastGameTimestamp, totalTeamKills, tiedGames, totalRounds, gameModeStats,
        rating, totalRoundsAfterKillTrackingWasImplemented
    }
}

const getGatherStats = async (statsDb) => {
    const games = await statsDb.getAllGames()

    let overallWeaponStats = {}
    let totalGames = games.length
    let totalRounds = _.sum(games.map(game => game.rounds.length))
    let totalGatherTime = _.sum(games.map(game => game.endTime - game.startTime))
    let firstGameTimestamp = totalGames > 0 ? _.sortBy(games, game => game.startTime)[0].startTime : 0
    let lastGameTimestamp = totalGames > 0 ? _.sortBy(games, game => -game.startTime)[0].startTime : 0

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        overallWeaponStats[SOLDAT_WEAPONS[weaponKey].formattedName] = {
            kills: 0,
        }
    })

    let mapStats = {}

    games.forEach(game => {
        game.rounds.forEach(round => {
            if (!(round.mapName in mapStats)) {
                mapStats[round.mapName] = {
                    totalRounds: 0
                }
            }

            mapStats[round.mapName].totalRounds += 1

            _.forEach(round.events, event => {
                if (event.type === SOLDAT_EVENTS.PLAYER_KILL) {
                    overallWeaponStats[event.weaponName].kills += 1
                }
            })
        })
    })

    return {
        totalGames, totalGatherTime, mapStats, firstGameTimestamp, lastGameTimestamp, totalRounds, overallWeaponStats
    }
}

const getTopPlayers = async (statsDb, minimumGamesPlayed, gameMode) => {
    const allDiscordIds = await statsDb.getAllDiscordIds()
    const allPlayerStats = []

    for (let discordId of allDiscordIds) {
        const stats = await getPlayerStats(statsDb, discordId)
        if (stats !== undefined) {
            allPlayerStats.push({
                discordId,
                playerStats: stats
            })
        } else {
            _.remove(allDiscordIds, discordId)
        }
    }
    const playersWithEnoughGames = _.filter(allPlayerStats, player => player.playerStats.gameModeStats[gameMode].totalGames >= minimumGamesPlayed)

    let topPlayersByWinRate = _.sortBy(playersWithEnoughGames, player => -(player.playerStats.gameModeStats[gameMode].wonGames / player.playerStats.gameModeStats[gameMode].totalGames))
    topPlayersByWinRate = _.take(topPlayersByWinRate, 5)

    let topPlayersBySkillEstimate = _.sortBy(playersWithEnoughGames, player => -ratings.getSkillEstimate(player.playerStats.rating))
    topPlayersBySkillEstimate = _.take(topPlayersBySkillEstimate, 5)

    // Take all players here
    let topPlayersByTotalGames = _.sortBy(allPlayerStats, player => -player.playerStats.gameModeStats[gameMode].totalGames)
    topPlayersByTotalGames = _.take(topPlayersByTotalGames, 5)

    let topPlayersByKda = _.sortBy(playersWithEnoughGames, player => -(player.playerStats.totalKills / player.playerStats.totalDeaths))
    topPlayersByKda = _.take(topPlayersByKda, 5)

    let topPlayersByTeamKills = _.sortBy(playersWithEnoughGames, player => -(player.playerStats.totalTeamKills / player.playerStats.totalKills))
    topPlayersByTeamKills = _.take(topPlayersByTeamKills, 5)

    let topPlayersByWeaponKills = {}

    _.forEach(_.values(SOLDAT_WEAPONS), weapon => {
        let topPlayersByThisWeaponKills = _.sortBy(playersWithEnoughGames, player => -player.playerStats.weaponStats[weapon.formattedName].kills)
        topPlayersByThisWeaponKills = _.take(topPlayersByThisWeaponKills, 5)
        topPlayersByWeaponKills[weapon.formattedName] = topPlayersByThisWeaponKills
    })

    let topPlayersByWeaponKillsPerRound = {}

    _.forEach(_.values(SOLDAT_WEAPONS), weapon => {
        let topPlayersByThisWeaponKillsPerRound = _.sortBy(playersWithEnoughGames, player => -player.playerStats.weaponStats[weapon.formattedName].kills / player.playerStats.totalRoundsAfterKillTrackingWasImplemented)
        topPlayersByThisWeaponKillsPerRound = _.take(topPlayersByThisWeaponKillsPerRound, 5)
        topPlayersByWeaponKillsPerRound[weapon.formattedName] = topPlayersByThisWeaponKillsPerRound
    })

    return {
        topPlayersByWinRate, topPlayersByTotalGames, allDiscordIds, topPlayersBySkillEstimate,
        topPlayersByKda, topPlayersByTeamKills, topPlayersByWeaponKills, topPlayersByWeaponKillsPerRound
    }
}

const getTeamCaps = (events, teamName) => {
    let caps = 0

    events.forEach(event => {
        if (event.type === SOLDAT_EVENTS.FLAG_CAP) {
            if (event.teamName === teamName) {
                caps += 1
            }
        }
    })

    return caps
}

export const getKillsAndDeathsPerPlayer = (allPlayers, events) => {
    const playerKillsAndDeaths = {}

    _.forEach(allPlayers, discordId => {
        playerKillsAndDeaths[discordId] = {
            kills: 0,
            deaths: 0
        }
    })

    events.forEach(event => {

        if (event.type === SOLDAT_EVENTS.PLAYER_KILL) {
            if (filterKillEvent(event) && event.killerDiscordId in playerKillsAndDeaths) {
                playerKillsAndDeaths[event.killerDiscordId].kills += 1
            }

            if (filterDeathEvent(event) && event.victimDiscordId in playerKillsAndDeaths) {
                playerKillsAndDeaths[event.victimDiscordId].deaths += 1
            }
        }
    })

    return playerKillsAndDeaths
}



export default {
    getPlayerStats, getGatherStats,
    getTopPlayers, getTeamCaps
};