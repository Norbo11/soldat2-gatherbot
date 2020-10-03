const logger = require("./logger")
const moment = require("moment")
const stats = require("../utils/stats")
const _ = require("lodash")

teamEmoji = (teamName) => {
    if (teamName === "Alpha") {
        return ":a:"
    } else if (teamName === "Bravo") {
        return ":regional_indicator_b:"
    } else {
        logger.log.error(`Invalid team name ${teamName}`)
    }
}

getPlayerStrings = (alphaTeamIds, bravoTeamIds, delim = "\n") => {
    const alphaPlayersString = alphaTeamIds.length > 0 ? alphaTeamIds.map(id => `<@${id}>`).join(delim) : "No players"
    const bravoPlayersString = bravoTeamIds.length > 0 ? bravoTeamIds.map(id => `<@${id}>`).join(delim) : "No players"

    return {alphaPlayersString, bravoPlayersString}
}

getPlayerFields = (alphaTeamIds, bravoTeamIds) => {
    const {alphaPlayersString, bravoPlayersString} = getPlayerStrings(alphaTeamIds, bravoTeamIds)

    return [
        {
            name: `${teamEmoji("Alpha")} Alpha Team`,
            value: `${alphaPlayersString}`,
            inline: true
        },
        {
            name: `${teamEmoji("Bravo")} Bravo Team`,
            value: `${bravoPlayersString}`,
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
            game.alphaCaps,
            game.bravoCaps,
            game.alphaPlayers,
            game.bravoPlayers,
        ),
    ]
}

getServerLinkField = (password = "") => {
    return {
        name: "Link",
        value: `soldat://${process.env.SERVER_IP}:${process.env.SERVER_PORT}/${password}`,
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

getWinnerAndLoserFields = (alphaCaps, bravoCaps, alphaDiscordIds, bravoDiscordIds) => {

    // TODO: Hook this up
    const playerKillsAndDeaths = {}
    const allPlayers = [...alphaDiscordIds, ...bravoDiscordIds]

    allPlayers.forEach(discordId => {
        playerKillsAndDeaths[discordId] = {
            kills: 0,
            deaths: 0
        }
    })

    const alphaPlayersString = getPlayerFieldsWithKillsAndDeaths(alphaDiscordIds, playerKillsAndDeaths).join("\n")
    const bravoPlayersString = getPlayerFieldsWithKillsAndDeaths(bravoDiscordIds, playerKillsAndDeaths).join("\n")

    const winningTeam = alphaCaps > bravoCaps ? "Alpha" : "Bravo"
    const losingTeam = alphaCaps > bravoCaps ? "Bravo" : "Alpha"
    const winnerCaps = alphaCaps > bravoCaps ? alphaCaps : bravoCaps
    const loserCaps = alphaCaps > bravoCaps ? bravoCaps : alphaCaps
    const winningPlayersString = alphaCaps > bravoCaps ? alphaPlayersString : bravoPlayersString
    const losingPlayersString = alphaCaps > bravoCaps ? bravoPlayersString : alphaPlayersString

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