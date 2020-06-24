const _ = require("lodash")
const moment = require("moment")

const logger = require("./logger")
const constants = require("./constants")
const soldat = require("./soldat")

const TTW_CLASSES = constants.TTW_CLASSES
const TTW_EVENTS = constants.TTW_EVENTS
const SOLDAT_WEAPONS = constants.SOLDAT_WEAPONS

getCaps = (discordId, events) => {
    events = _.filter(events, event =>
        event.type === TTW_EVENTS.FLAG_CAP
        && event.discordId === discordId
    )

    return events.length
}

getNumberOfTimesConquered = (discordId, events) => {
    let currentGeneral = undefined
    let totalConquers = 0

    events.forEach(event => {
        if (event.type === TTW_EVENTS.PLAYER_CLASS_SWITCH && event.newClassId === TTW_CLASSES.GENERAL.id) {
            currentGeneral = event.discordId
        }

        if (event.type === TTW_EVENTS.BUNKER_CONQUER && currentGeneral === discordId) {
            totalConquers += 1
        }
    })

    return totalConquers
}

getTimePlayedPerClass = (startTime, endTime, discordId, events) => {
    const classTime = {}

    Object.keys(TTW_CLASSES).forEach(classKey => {
        classTime[TTW_CLASSES[classKey].id] = 0
    })

    const classSwitchEvents = _.filter(events, event =>
        event.type === TTW_EVENTS.PLAYER_CLASS_SWITCH
        && event.discordId === discordId
    )

    if (classSwitchEvents.length === 0) {
        logger.log.warn(`Got no class switch events for player ${discordId}! Gather start time: ${startTime}`)
        return classTime
    }

    let lastEventTimestamp = classSwitchEvents[0].timestamp
    let lastClassId = classSwitchEvents[0].newClassId

    const remainingEvents = _.takeRight(classSwitchEvents, classSwitchEvents.length - 1)

    remainingEvents.forEach(event => {
        classTime[lastClassId] += event.timestamp - lastEventTimestamp
        lastEventTimestamp = event.timestamp
        lastClassId = event.newClassId
    })

    classTime[lastClassId] += endTime - lastEventTimestamp

    return classTime
}

getKillsAndDeathsPerWeapon = (discordId, events) => {
    const weaponStats = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        weaponStats[SOLDAT_WEAPONS[weaponKey].id] = {
            kills: 0,
            deaths: 0
        }
    })

    const killEvents = _.filter(events, event =>
        event.type === TTW_EVENTS.PLAYER_KILL
        && event.killerDiscordId === discordId
        && event.killerDiscordId !== event.victimDiscordId // Do not count selfkills as kills
        && event.killerTeam !== event.victimTeam // Do not count friendly kills
    )

    // Do count selfkills as deaths
    const deathEvents = _.filter(events, event =>
        event.type === TTW_EVENTS.PLAYER_KILL
        && event.victimDiscordId === discordId
        && event.killerTeam !== event.victimTeam // Do not count friendly kills
    )

    killEvents.forEach(event => {
        weaponStats[event.weaponId].kills += 1
    })

    deathEvents.forEach(event => {
        weaponStats[event.weaponId].deaths += 1
    })

    return weaponStats
}

getTeamKills = (discordId, events) => {

    const teamKillEvents = _.filter(events, event =>
        event.type === TTW_EVENTS.PLAYER_KILL
        && event.killerDiscordId !== event.victimDiscordId // Do not count selfkills as team kills
        && event.killerTeam === event.victimTeam
    )

    return teamKillEvents.length
}

getPlayerStats = async (statsDb, discordId) => {
    const games = await statsDb.getGamesWithPlayer(discordId)

    let totalGames = 0
    let wonGames = 0
    let lostGames = 0
    let totalKills = 0
    let totalTeamKills = 0
    let totalDeaths = 0
    let totalGatherTime = 0
    let totalCaps = 0
    let totalConquers = 0
    const classStats = {}
    const weaponStats = {}
    const sizeStats = {}

    Object.keys(TTW_CLASSES).forEach(classKey => {
        classStats[TTW_CLASSES[classKey].id] = {
            playingTime: 0
        }
    })

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        weaponStats[SOLDAT_WEAPONS[weaponKey].id] = {
            kills: 0,
            deaths: 0
        }
    })

    games.forEach(game => {
        totalGames += 1

        const winningTeam = game.alphaTickets > game.bravoTickets ? "Alpha" : "Bravo"
        const playerTeam = game.alphaPlayers.includes(discordId) ? "Alpha" : "Bravo"

        if (!(game.size in sizeStats)) {
            sizeStats[game.size] = {
                totalGames: 0,
                totalTicketsLeftInWonGames: 0
            }
        }

        if (winningTeam === playerTeam) {
            wonGames += 1
            sizeStats[game.size].totalTicketsLeftInWonGames += game[winningTeam.toLowerCase() + "Tickets"]
        } else {
            lostGames += 1
        }

        sizeStats[game.size].totalGames += 1

        totalCaps += getCaps(discordId, game.events)
        totalConquers += getNumberOfTimesConquered(discordId, game.events)
        totalTeamKills += getTeamKills(discordId, game.events)

        const timePlayedPerClass = getTimePlayedPerClass(game.startTime, game.endTime, discordId, game.events)
        const killsAndDeathsPerWeapon = getKillsAndDeathsPerWeapon(discordId, game.events)
        const gameTime = game.endTime - game.startTime

        Object.keys(timePlayedPerClass).forEach(classId => {
            classStats[classId].playingTime += timePlayedPerClass[classId]
        })

        Object.keys(killsAndDeathsPerWeapon).forEach(weaponId => {
            weaponStats[weaponId].kills += killsAndDeathsPerWeapon[weaponId].kills
            weaponStats[weaponId].deaths += killsAndDeathsPerWeapon[weaponId].deaths
            totalKills += killsAndDeathsPerWeapon[weaponId].kills
            totalDeaths += killsAndDeathsPerWeapon[weaponId].deaths
        })

        totalGatherTime += gameTime
    })

    let firstGameTimestamp = totalGames > 0 ? _.sortBy(games, game => game.startTime)[0].startTime : 0
    let lastGameTimestamp = totalGames > 0 ? _.sortBy(games, game => -game.startTime)[0].startTime : 0

    return {
        totalGames, wonGames, lostGames, classStats, weaponStats, totalKills, totalDeaths, totalGatherTime, totalCaps,
        totalConquers, sizeStats, firstGameTimestamp, lastGameTimestamp, totalTeamKills
    }
}

const getGatherStats = async (statsDb) => {
    const games = await statsDb.getAllGames()

    let totalGames = games.length
    let totalGatherTime = _.sum(games.map(game => game.endTime - game.startTime))
    let totalTicketsLeft = _.sum(games.map(game => game.alphaTickets + game.bravoTickets))
    let firstGameTimestamp = totalGames > 0 ? _.sortBy(games, game => game.startTime)[0].startTime : 0
    let lastGameTimestamp = totalGames > 0 ? _.sortBy(games, game => -game.startTime)[0].startTime : 0

    let mapStats = {}

    games.forEach(game => {
        if (!(game.mapName in mapStats)) {
            mapStats[game.mapName] = {
                totalGames: 0
            }
        }

        mapStats[game.mapName].totalGames += 1
    })

    return {
        totalGames, totalGatherTime, totalTicketsLeft, mapStats, firstGameTimestamp, lastGameTimestamp
    }
}

const getTopPlayers = async (statsDb, minimumGamesPlayed) => {
    const discordIds = await statsDb.getAllDiscordIds()
    const allPlayerStats = await Promise.all(discordIds.map(async discordId => {
        return {
            discordId,
            playerStats: await getPlayerStats(statsDb, discordId)
        }
    }))
    const playersWithEnoughGames = _.filter(allPlayerStats, player => player.playerStats.totalGames >= minimumGamesPlayed)

    let topPlayersByWinRate = _.sortBy(playersWithEnoughGames, player => -(player.playerStats.wonGames / player.playerStats.totalGames))
    topPlayersByWinRate = _.take(topPlayersByWinRate, 5)

    // Take all players here
    let topPlayersByTotalGames = _.sortBy(allPlayerStats, player => -player.playerStats.totalGames)
    topPlayersByTotalGames = _.take(topPlayersByTotalGames, 5)

    let topPlayersByKda = _.sortBy(playersWithEnoughGames, player => -(player.playerStats.totalKills / player.playerStats.totalDeaths))
    topPlayersByKda = _.take(topPlayersByKda, 5)

    let topPlayersByTeamKills = _.sortBy(playersWithEnoughGames, player => -(player.playerStats.totalTeamKills / player.playerStats.totalKills))
    topPlayersByTeamKills = _.take(topPlayersByTeamKills, 5)

    let topPlayersByWeaponKills = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weaponKey => {
        const weaponId = SOLDAT_WEAPONS[weaponKey].id
        let topPlayersByThisWeaponKills = _.sortBy(playersWithEnoughGames, player => -player.playerStats.weaponStats[weaponId].kills)
        topPlayersByThisWeaponKills = _.take(topPlayersByThisWeaponKills, 5)
        topPlayersByWeaponKills[weaponId] = topPlayersByThisWeaponKills
    })

    const allDiscordIds = allPlayerStats.map(player => player.discordId)

    return {
        topPlayersByWinRate, topPlayersByTotalGames, topPlayersByKda, allDiscordIds, topPlayersByWeaponKills,
        topPlayersByTeamKills
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

const formatGeneralStatsForPlayer = (playerName, playerStats) => {
    const overallStats = [
        `**Gathers Played**: ${playerStats.totalGames}`,
        `**Total Gather Time**: ${formatMilliseconds(playerStats.totalGatherTime)}`,
        `**Won/Lost**: ${playerStats.wonGames}/${playerStats.lostGames} (${Math.round(playerStats.wonGames / playerStats.totalGames * 100)}%)`,
        `**Kills/Deaths**: ${playerStats.totalKills}/${playerStats.totalDeaths} (${(playerStats.totalKills / playerStats.totalDeaths).toFixed(2)})`,
        `**Caps**: ${playerStats.totalCaps} (${(playerStats.totalCaps / playerStats.totalGames).toFixed(2)} per game)`,
        `**Bunker Conquers**: ${playerStats.totalConquers}`,
        `**First Gather**: ${moment(playerStats.firstGameTimestamp).format("DD-MM-YYYY")}`,
        `**Last Gather**: ${moment(playerStats.lastGameTimestamp).from(moment())}`,
        `**Friendly Fire**: ${playerStats.totalTeamKills} team kills (${(playerStats.totalTeamKills / playerStats.totalKills * 100).toFixed(1)}% of kills)`,
    ]

    let favouriteWeapons = Object.keys(playerStats.weaponStats).map(weaponId => {
        return {weaponName: constants.getWeaponById(weaponId).formattedName, ...playerStats.weaponStats[weaponId]}
    })

    favouriteWeapons = _.sortBy(favouriteWeapons, weaponStat => -weaponStat.kills)
    favouriteWeapons = _.take(favouriteWeapons, 5)
    favouriteWeapons = favouriteWeapons.map(weaponStat => `**${weaponStat.weaponName}**: ${weaponStat.kills} kills`)

    let favouriteClasses = Object.keys(playerStats.classStats).map(classId => {
        return {className: constants.getClassById(classId).formattedName, ...playerStats.classStats[classId]}
    })

    favouriteClasses = _.sortBy(favouriteClasses, classStat => -classStat.playingTime)
    favouriteClasses = _.take(favouriteClasses, 5)
    favouriteClasses = favouriteClasses.map(classStat => `**${classStat.className}**: ${formatMilliseconds(classStat.playingTime)}`)

    let averageTickets = Object.keys(playerStats.sizeStats).map(size => {
        return {size: size, ...playerStats.sizeStats[size]}
    })
    averageTickets = _.sortBy(averageTickets, sizeStat => -sizeStat.size)
    averageTickets = _.take(averageTickets, 5)
    averageTickets = averageTickets.map(sizeStat => `**Size ${sizeStat.size}**: ${Math.round(sizeStat.totalTicketsLeftInWonGames / sizeStat.totalGames)} tickets`)

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
                {
                    name: "**Favourite Classes**",
                    value: favouriteClasses.join("\n"),
                    inline: true
                },
                {
                    name: "**Avg Tickets Left in Won Games**",
                    value: averageTickets.join("\n"),
                    inline: false
                },
            ]
        }
    }
}

const formatGatherStats = (gatherStats) => {
    const overallStats = [
        `**Gathers Played**: ${gatherStats.totalGames}`,
        `**Total Gather Time**: ${formatMilliseconds(gatherStats.totalGatherTime)}`,
        `**Average Gather Time**: ${formatMilliseconds(Math.round(gatherStats.totalGatherTime / gatherStats.totalGames))}`,
        `**Average Tickets Left**: ${Math.round(gatherStats.totalTicketsLeft / gatherStats.totalGames)}`,
        `**First Gather**: ${moment(gatherStats.firstGameTimestamp).format("DD-MM-YYYY")}`,
        `**Last Gather**: ${moment(gatherStats.lastGameTimestamp).from(moment())}`,
    ]

    let favouriteMaps = Object.keys(gatherStats.mapStats).map(mapName => {
        return {mapName, ...gatherStats.mapStats[mapName]}
    })

    favouriteMaps = _.sortBy(favouriteMaps, mapStats => -mapStats.totalGames)
    favouriteMaps = _.take(favouriteMaps, 5)
    favouriteMaps = favouriteMaps.map(mapStat => `**${mapStat.mapName}**: ${mapStat.totalGames} games`)

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
        if (event.type === TTW_EVENTS.FLAG_CAP) {
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
        if (event.type === TTW_EVENTS.PLAYER_KILL) {
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


const formatTopPlayers = (topPlayers, discordIdToUsername) => {
    const topPlayersByWinRate = topPlayers.topPlayersByWinRate.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.wonGames}/${playerStats.lostGames} (${Math.round(playerStats.wonGames / playerStats.totalGames * 100)}%)`
    })

    const topPlayersByKda = topPlayers.topPlayersByKda.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalKills}/${playerStats.totalDeaths} (${(playerStats.totalKills / playerStats.totalDeaths).toFixed(2)})`
    })

    const topPlayersByTotalGames = topPlayers.topPlayersByTotalGames.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalGames} games`
    })

    const topPlayersByTeamKills = topPlayers.topPlayersByTeamKills.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalTeamKills} team kills (${(playerStats.totalTeamKills / playerStats.totalKills * 100).toFixed(1)}% of kills)`
    })

    return {
        embed: {
            fields: [
                {
                    name: "**Win Rate**",
                    value: topPlayersByWinRate.length > 0 ? topPlayersByWinRate.join("\n") : "No Players",
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
                {
                    name: "**Friendly Fire**",
                    value: topPlayersByTeamKills.length > 0 ? topPlayersByTeamKills.join("\n") : "No Players",
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

    const weaponId = weapon.id

    const topPlayersByWeapon = topPlayers.topPlayersByWeaponKills[weaponId].map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.weaponStats[weaponId].kills} kills`
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