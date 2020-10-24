const logger = require("./logger")
const moment = require("moment")
const _ = require("lodash")
const constants = require("../game/constants")

teamEmoji = (teamName) => {
    if (teamName === constants.SOLDAT_TEAMS.RED) {
        return ":a:"
    } else if (teamName === constants.SOLDAT_TEAMS.BLUE) {
        return ":regional_indicator_b:"
    } else if (teamName === constants.SOLDAT_TEAMS.TIE) {
        return ":poop:"
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

getResultField = (winner) => {
    const roundResult = winner !== constants.SOLDAT_TEAMS.TIE ? `${winner} win` : `Tie`

    return {
        name: "Result",
        value: roundResult
    }
}


getGatherEndFields = (game) => {
    return [
        getResultField(game.winner),
        getGatherLengthField(game.startTime, game.endTime, true),
        ...game.rounds.flatMap(round => getRoundEndFields(game.redPlayers, game.bluePlayers, round.winner, round.blueCaps, round.redCaps)),
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

getRoundEndFields = (redDiscordIds, blueDiscordIds, winner, blueCaps, redCaps) => {

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

    return [
        getResultField(winner),
        {
            name: `${teamEmoji(constants.SOLDAT_TEAMS.BLUE)} Blue Team (${blueCaps} caps)`,
            value: `${bluePlayersString}`,
        },
        {
            name: `${teamEmoji(constants.SOLDAT_TEAMS.RED)} Red Team (${redCaps} caps)`,
            value: `${redPlayersString}`,
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
    teamEmoji, getPlayerStrings, getPlayerFields, getWinnerAndLoserFields: getRoundEndFields, getGatherLengthField, getGatherEndFields,
    getMapField, getServerLinkField, getDiscordIdToUsernameMap
}