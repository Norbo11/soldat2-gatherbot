const logger = require("./logger")
const moment = require("moment")
const stats = require("../utils/stats")
const _ = require("lodash")

teamEmoji = (teamName) => {
    if (teamName === "Red") {
        return ":a:"
    } else if (teamName === "Blue") {
        return ":regional_indicator_b:"
    } else {
        logger.log.error(`Invalid team name ${teamName}`)
    }
}

getPlayerStrings = (redTeamIds, blueTeamIds, delim = "\n") => {
    const redPlayersString = redTeamIds.length > 0 ? redTeamIds.map(id => `<@${id}>`).join(delim) : "No players"
    const bluePlayersString = blueTeamIds.length > 0 ? blueTeamIds.map(id => `<@${id}>`).join(delim) : "No players"

    return {redPlayersString, bluePlayersString}
}

getPlayerFields = (redTeamIds, blueTeamIds) => {
    const {redPlayersString, bluePlayersString} = getPlayerStrings(redTeamIds, blueTeamIds)

    return [
        {
            name: `${teamEmoji("Red")} Red Team`,
            value: `${redPlayersString}`,
            inline: true
        },
        {
            name: `${teamEmoji("Blue")} Blue Team`,
            value: `${bluePlayersString}`,
            inline: true
        }
    ];
}

getGatherLengthField = (startTime, endTime, inline = false) => {
    const momentDuration = moment.duration(endTime - startTime)
    return {
        name: "Gather Duration",
        value: momentDuration.humanize(),
        inline
    }
}

getMapField = (mapName, inline = false) => {
    return {
        name: "Map",
        value: `${mapName}`,
        inline,
    }
}

getKillAndDeathFields = (playerKillsAndDeaths, discordIdToUsername) => {
    const playerKDs = []

    _.forEach(playerKillsAndDeaths, (killsAndDeaths, discordId) => {
        playerKDs.push(`**${discordIdToUsername[discordId]}**: ${killsAndDeaths.kills}/${killsAndDeaths.deaths}`)
    })

    return [
        {
            name: "Player Kills/Deaths",
            value: playerKDs.join("\n")
        }
    ]
}

getGatherEndFields = (game) => {
    return [
        getGatherLengthField(game.startTime, game.endTime, true),
        getMapField(game.mapName, true),
        ...getWinnerAndLoserFields(
            game.redCaps,
            game.blueCaps,
            game.redPlayers,
            game.bluePlayers,
        ),
    ]
}

getServerLinkField = (password = "") => {
    return {
        name: "Link",
        value: `IP: ${process.env.SERVER_IP} - Port: ${process.env.SERVER_PORT}`,
    }
}

getPlayerFieldsWithKillsAndDeaths = (discordIds, playerKillsAndDeaths) => {
    // return discordIds.map(discordId => {
    //     const kills = (playerKillsAndDeaths[discordId] || {kills: 0}).kills
    //     const deaths = (playerKillsAndDeaths[discordId] || {deaths: 0}).deaths
    //
    //     return `<@${discordId}>: ${kills}/${deaths} (${(kills / deaths).toFixed(2)})`
    // })

    return discordIds.map(discordId => {
        return `<@${discordId}>`
    })
}

getWinnerAndLoserFields = (redCaps, blueCaps, redDiscordIds, blueDiscordIds) => {

    // TODO: Hook this up
    const playerKillsAndDeaths = {}
    const allPlayers = [...redDiscordIds, ...blueDiscordIds]

    allPlayers.forEach(discordId => {
        playerKillsAndDeaths[discordId] = {
            kills: 0,
            deaths: 0
        }
    })

    const redPlayersString = getPlayerFieldsWithKillsAndDeaths(redDiscordIds, playerKillsAndDeaths).join("\n")
    const bluePlayersString = getPlayerFieldsWithKillsAndDeaths(blueDiscordIds, playerKillsAndDeaths).join("\n")

    const winningTeam = redCaps > blueCaps ? "Red" : "Blue"
    const losingTeam = redCaps > blueCaps ? "Blue" : "Red"
    const winnerCaps = redCaps > blueCaps ? redCaps : blueCaps
    const loserCaps = redCaps > blueCaps ? blueCaps : redCaps
    const winningPlayersString = redCaps > blueCaps ? redPlayersString : bluePlayersString
    const losingPlayersString = redCaps > blueCaps ? bluePlayersString : redPlayersString

    return [
        {
            name: `${teamEmoji(winningTeam)} **Winning Team (${winnerCaps} caps)**`,
            value: `${winningPlayersString}`,
        },
        {
            name: `${teamEmoji(losingTeam)} Losing Team (${loserCaps} caps)`,
            value: `${losingPlayersString}`,
        },
    ]
}

getDiscordIdToUsernameMap = async (client, discordIdToUsername, discordIds) => {
    return Promise.all(discordIds.map(async (discordId) => {
        try {
            const user = await client.fetchUser(discordId)
            discordIdToUsername[discordId] = user.username
        } catch (e) {
            logger.log.warn(`Could not find user with discord ID ${discordId}`)
        }
    }))
}

module.exports = {
    teamEmoji, getPlayerStrings, getPlayerFields, getWinnerAndLoserFields, getGatherLengthField, getGatherEndFields,
    getMapField, getServerLinkField, getDiscordIdToUsernameMap
}