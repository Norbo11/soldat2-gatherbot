const _ = require("lodash")
const moment = require("moment")

const logger = require("../utils/logger")
const constants = require("./constants")
const ratings = require("./ratings")
const discord = require("../utils/discord")

const SOLDAT_EVENTS = constants.SOLDAT_EVENTS
const SOLDAT_WEAPONS = constants.SOLDAT_WEAPONS
const SOLDAT_TEAMS = constants.SOLDAT_TEAMS
const GAME_MODES = constants.GAME_MODES

getCaps = (discordId, events) => {
    events = _.filter(events, event =>
        event.type === SOLDAT_EVENTS.FLAG_CAP
        && event.discordId === discordId
    )

    return events.length
}

getKillsAndDeathsPerWeapon = (discordId, events) => {
    const weaponStats = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        weaponStats[SOLDAT_WEAPONS[weaponKey].formattedName] = {
            kills: 0,
            deaths: 0
        }
    })

    const killEvents = _.filter(events, event =>
        event.type === SOLDAT_EVENTS.PLAYER_KILL
        && event.killerDiscordId === discordId
        && event.killerDiscordId !== event.victimDiscordId // Do not count selfkills as kills
        && event.killerTeam !== event.victimTeam // Do not count friendly kills
    )

    const deathEvents = _.filter(events, event =>
        event.type === SOLDAT_EVENTS.PLAYER_KILL
        && event.victimDiscordId === discordId

        // Count deaths from other people, or selfkills
        && (event.killerTeam !== event.victimTeam || event.killerDiscordId === discordId)
    )

    killEvents.forEach(event => {
        weaponStats[event.weaponName].kills += 1
    })

    deathEvents.forEach(event => {
        weaponStats[event.weaponName].deaths += 1
    })

    return weaponStats
}

getTeamKills = (discordId, events) => {

    const teamKillEvents = _.filter(events, event =>
        event.type === SOLDAT_EVENTS.PLAYER_KILL
        && event.killerDiscordId !== event.victimDiscordId // Do not count selfkills as team kills
        && event.killerTeam === event.victimTeam
    )

    return teamKillEvents.length
}

getPlayerStats = async (statsDb, discordId) => {
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
    const weaponStats = {}
    const sizeStats = {}
    const gameModeStats = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        weaponStats[SOLDAT_WEAPONS[weaponKey].formattedName] = {
            kills: 0,
            deaths: 0
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

        _.forEach(game.rounds, round => {
            totalTeamKills += getTeamKills(discordId, round.events)
            const killsAndDeathsPerWeapon = getKillsAndDeathsPerWeapon(discordId, round.events)

            Object.keys(killsAndDeathsPerWeapon).forEach(weaponName => {
                weaponStats[weaponName].kills += killsAndDeathsPerWeapon[weaponName].kills
                weaponStats[weaponName].deaths += killsAndDeathsPerWeapon[weaponName].deaths
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
        rating
    }
}

const getGatherStats = async (statsDb) => {
    const games = await statsDb.getAllGames()

    let totalGames = games.length
    let totalRounds = _.sum(games.map(game => game.rounds.length))
    let totalGatherTime = _.sum(games.map(game => game.endTime - game.startTime))
    let firstGameTimestamp = totalGames > 0 ? _.sortBy(games, game => game.startTime)[0].startTime : 0
    let lastGameTimestamp = totalGames > 0 ? _.sortBy(games, game => -game.startTime)[0].startTime : 0

    let mapStats = {}

    games.forEach(game => {
        game.rounds.forEach(round => {
            if (!(round.mapName in mapStats)) {
                mapStats[round.mapName] = {
                    totalRounds: 0
                }
            }

            mapStats[round.mapName].totalRounds += 1
        })
    })

    return {
        totalGames, totalGatherTime, mapStats, firstGameTimestamp, lastGameTimestamp, totalRounds
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

    return {
        topPlayersByWinRate, topPlayersByTotalGames, allDiscordIds, topPlayersBySkillEstimate,
        topPlayersByKda, topPlayersByTeamKills, topPlayersByWeaponKills
    }
}

const formatMilliseconds = (millis) => {
    if (millis === 0) {
        return "0 seconds"
    } else {
        const momentDuration = moment.duration(millis)
        return momentDuration.humanize()
    }
}

const formatWinsTiesLosses = (playerStats, gameMode) => {

    const stats = playerStats.gameModeStats[gameMode]

    return `${stats.wonGames}-${stats.tiedGames}-${stats.lostGames} (${Math.round(stats.wonGames / stats.totalGames * 100)}% winrate)`
}


const formatGeneralStatsForPlayer = (playerName, playerStats) => {
    const overallStats = [
        `**Gathers Played**: ${playerStats.totalGames}`,
        `**Rounds Played**: ${playerStats.totalRounds}`,
        `**Total Gather Time**: ${formatMilliseconds(playerStats.totalGatherTime)}`,
        `**CTF W-T-L**: ${formatWinsTiesLosses(playerStats, GAME_MODES.CAPTURE_THE_FLAG)}`,
        `**CTB W-T-L**: ${formatWinsTiesLosses(playerStats, GAME_MODES.CAPTURE_THE_BASES)}`,
        `**Kills/Deaths**: ${playerStats.totalKills}/${playerStats.totalDeaths} (${(playerStats.totalKills / playerStats.totalDeaths).toFixed(2)})`,
        // `**Caps**: ${playerStats.totalCaps} (${(playerStats.totalCaps / playerStats.totalGames).toFixed(2)} per game)`,
        `**First Gather**: ${moment(playerStats.firstGameTimestamp).format("DD-MM-YYYY")}`,
        `**Last Gather**: ${moment(playerStats.lastGameTimestamp).from(moment())}`,
        `**Rating**: ${discord.formatRating(playerStats.rating)}`,
    ]

    let favouriteWeapons = Object.keys(playerStats.weaponStats).map(weaponName => {
        return {weaponName, ...playerStats.weaponStats[weaponName]}
    })

    favouriteWeapons = _.sortBy(favouriteWeapons, weaponStat => -weaponStat.kills)
    favouriteWeapons = _.take(favouriteWeapons, 5)
    favouriteWeapons = favouriteWeapons.map(weaponStat => `**${weaponStat.weaponName}**: ${weaponStat.kills} kills`)

    return {
        embed: {
            fields: [
                {
                    name: `**Overall Stats for ${playerName}**`,
                    value: overallStats.join("\n")
                },
                {
                    name: "**Favourite Weapons**",
                    value: favouriteWeapons.join("\n"),
                    inline: true
                },
            ]
        }
    }
}

const formatGatherStats = (gatherStats) => {
    const overallStats = [
        `**Gathers Played**: ${gatherStats.totalGames}`,
        `**Rounds Played**: ${gatherStats.totalRounds}`,
        `**Total Gather Time**: ${formatMilliseconds(gatherStats.totalGatherTime)}`,
        `**Average Gather Time**: ${formatMilliseconds(Math.round(gatherStats.totalGatherTime / gatherStats.totalGames))}`,
        `**First Gather**: ${moment(gatherStats.firstGameTimestamp).format("DD-MM-YYYY")}`,
        `**Last Gather**: ${moment(gatherStats.lastGameTimestamp).from(moment())}`,
    ]

    let favouriteMaps = Object.keys(gatherStats.mapStats).map(mapName => {
        return {mapName, ...gatherStats.mapStats[mapName]}
    })

    favouriteMaps = _.sortBy(favouriteMaps, mapStats => -mapStats.totalRounds)
    favouriteMaps = _.take(favouriteMaps, 5)
    favouriteMaps = favouriteMaps.map(mapStat => `**${mapStat.mapName}**: ${mapStat.totalRounds} rounds`)

    return {
        embed: {
            fields: [
                {
                    name: "**Overall Stats**",
                    value: overallStats.join("\n")
                },
                {
                    name: "**Favourite Maps**",
                    value: favouriteMaps.length > 0 ? favouriteMaps.join("\n") : "No Gathers Played",
                },
            ]
        }
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

const getKillsAndDeathsPerPlayer = (events) => {
    const playerKillsAndDeaths = {}

    events.forEach(event => {
        if (event.type === SOLDAT_EVENTS.PLAYER_KILL) {
            if (!(event.killerDiscordId in playerKillsAndDeaths)) {
                playerKillsAndDeaths[event.killerDiscordId] = {
                    kills: 0,
                    deaths: 0
                }
            }

            if (!(event.victimDiscordId in playerKillsAndDeaths)) {
                playerKillsAndDeaths[event.victimDiscordId] = {
                    kills: 0,
                    deaths: 0
                }
            }

            playerKillsAndDeaths[event.killerDiscordId].kills += 1
            playerKillsAndDeaths[event.victimDiscordId].deaths += 1
        }
    })

    return playerKillsAndDeaths
}


const formatTopPlayers = (gameMode, topPlayers, discordIdToUsername) => {
    const topPlayersByKda = topPlayers.topPlayersByKda.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalKills}/${playerStats.totalDeaths} (${(playerStats.totalKills / playerStats.totalDeaths).toFixed(2)})`
    })

    const topPlayersByTotalGames = topPlayers.topPlayersByTotalGames.map(topPlayer => {
        const playerStats = topPlayer.playerStats.gameModeStats[gameMode]
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalGames} games`
    })

    // const topPlayersByTeamKills = topPlayers.topPlayersByTeamKills.map(topPlayer => {
    //     const playerStats = topPlayer.playerStats
    //     return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalTeamKills} team kills (${(playerStats.totalTeamKills / playerStats.totalKills * 100).toFixed(1)}% of kills)`
    // })

    const topPlayersBySkillEstimate = topPlayers.topPlayersBySkillEstimate.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        const rating = playerStats.rating
        const estimate = ratings.getSkillEstimate(rating)
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${discord.roundSkill(estimate)} (${playerStats.wonGames}-${playerStats.tiedGames}-${playerStats.lostGames})`
    })

    return {
        embed: {
            title: `Top ${constants.formatGameMode(gameMode)} Players`,
            fields: [
                {
                    name: "**Rating Estimate**",
                    value: topPlayersBySkillEstimate.length > 0 ? topPlayersBySkillEstimate.join("\n") : "No Players",
                    inline: true
                },
                {
                    name: "**KDA**",
                    value: topPlayersByKda.length > 0 ? topPlayersByKda.join("\n") : "No Players",
                    inline: true
                },
                {
                    name: "**Total Games**",
                    value: topPlayersByTotalGames.length > 0 ? topPlayersByTotalGames.join("\n") : "No Players",
                    inline: true
                },
            ]
        }
    }
}

const formatTopPlayersByWeapon = (topPlayers, discordIdToUsername, weaponName) => {
    const weapon = constants.getWeaponByFormattedName(weaponName)

    if (weapon === undefined) {
        return `${weaponName} is not a soldat weapon.`
    }

    const topPlayersByWeapon = topPlayers.topPlayersByWeaponKills[weapon.formattedName].map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.weaponStats[weapon.formattedName].kills} kills`
    })

    return {
        embed: {
            fields: [
                {
                    name: `**Top Players by ${weapon.formattedName} kills**`,
                    value: topPlayersByWeapon.length > 0 ? topPlayersByWeapon.join("\n") : "No kills with this weapon"
                },
            ]
        }
    }
}

module.exports = {
    getPlayerStats, formatGeneralStatsForPlayer, getGatherStats, formatGatherStats,
    getTopPlayers, formatTopPlayers, formatTopPlayersByWeapon, getTeamCaps, getKillsAndDeathsPerPlayer
}