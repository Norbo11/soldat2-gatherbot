const _ = require("lodash")
const logger = require("./logger")
const gather = require("./gather")
const soldat = require("./soldat")

const TTW_CLASSES = gather.TTW_CLASSES
const TTW_EVENTS = gather.TTW_EVENTS
const SOLDAT_WEAPONS = soldat.SOLDAT_WEAPONS

gameFinished = async (statsDb, game, ingameNameToDiscordId = (x) => x) => {
    // TODO: Implement third argument
    return await statsDb.insertGame(game)
}

getAllGames = async (statsDb) => {
    return await statsDb.getAllGames()
}

getTimePlayedPerClass = (startTime, endTime, playerName, events) => {
    const classTime = {}

    Object.keys(TTW_CLASSES).forEach(className => {
        classTime[className] = 0
    })

    let lastEventTimestamp = startTime
    let lastClass = undefined

    events = _.filter(events, event => event.type === TTW_EVENTS.PLAYER_CLASS_SWITCH && event.playerName === playerName)

    events.forEach(event => {
        classTime[event.oldClass] += event.timestamp - lastEventTimestamp
        lastEventTimestamp = event.timestamp
        lastClass = event.newClass
    })

    // Guard against cases when we somehow did not get any class switch events for the player
    if (lastClass !== undefined) {
        classTime[lastClass] += endTime - lastEventTimestamp
    } else {
        logger.log.warn(`Got no class switch events for player ${playerName}! Gather start time: ${startTime}`)
    }

    return classTime
}

getKillsAndDeathsPerWeapon = (playerName, events) => {
    const weaponStats = {}

    Object.keys(SOLDAT_WEAPONS).forEach(weapon => {
        weaponStats[SOLDAT_WEAPONS[weapon]] = {
            kills: 0,
            deaths: 0
        }
    })

    const killEvents = _.filter(events, event => event.type === TTW_EVENTS.PLAYER_KILL && event.killerName === playerName)
    const deathEvents = _.filter(events, event => event.type === TTW_EVENTS.PLAYER_KILL && event.victimName === playerName)

    killEvents.forEach(event => {
        weaponStats[event.weapon].kills += 1
    })

    deathEvents.forEach(event => {
        weaponStats[event.weapon].deaths += 1
    })

    return weaponStats
}

getPlayerStats = async (statsDb, discordId) => {
    const games = await statsDb.getGamesWithPlayer(discordId)

    let totalGames = 0
    let wonGames = 0
    let lostGames = 0
    let totalKills = 0
    let totalDeaths = 0
    const classStats = {}
    const weaponStats = {}

    Object.keys(TTW_CLASSES).forEach(className => {
        classStats[className] = {
            playingTime: 0
        }
    })

    Object.keys(SOLDAT_WEAPONS).forEach(weapon => {
        weaponStats[SOLDAT_WEAPONS[weapon]] = {
            kills: 0,
            deaths: 0
        }
    })

    games.forEach(game => {
        totalGames += 1

        const winningTeam = game.alphaTickets > game.bravoTickets ? "Alpha" : "Bravo"
        const playerTeam = game.alphaPlayers.includes(discordId) ? "Alpha" : "Bravo"

        if (winningTeam === playerTeam) {
            wonGames += 1
        } else {
            lostGames += 1
        }

        const timePlayedPerClass = getTimePlayedPerClass(game.startTime, game.endTime, discordId, game.events)
        const killsAndDeathsPerWeapon = getKillsAndDeathsPerWeapon(discordId, game.events)

        Object.keys(timePlayedPerClass).forEach(className => {
            classStats[className].playingTime += timePlayedPerClass[className]
        })

        Object.keys(killsAndDeathsPerWeapon).forEach(weapon => {
            weaponStats[weapon].kills += killsAndDeathsPerWeapon[weapon].kills
            weaponStats[weapon].deaths += killsAndDeathsPerWeapon[weapon].deaths
            totalKills += killsAndDeathsPerWeapon[weapon].kills
            totalDeaths += killsAndDeathsPerWeapon[weapon].deaths
        })
    })

    return {
        totalGames, wonGames, lostGames, classStats, weaponStats, totalKills, totalDeaths
    }
}

module.exports = {
    gameFinished, getAllGames, getPlayerStats
}