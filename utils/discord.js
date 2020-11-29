const logger = require("./logger")
const moment = require("moment")
const _ = require("lodash")
const constants = require("../game/constants")
const ratings = require("../game/ratings")

const GAME_MODES = constants.GAME_MODES

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


roundSkill = (skill) => {
    return skill.toFixed(2)
}


formatRating = (rating) => {
    const skillEstimate = ratings.getSkillEstimate(rating)
    return `Skill ${roundSkill(rating.mu)}, Uncertainty ${roundSkill(rating.sigma)}, Rating Estimate ${roundSkill(skillEstimate)}`
}

skillChangeEmoji = (oldSkill, newSkill) => {
    oldSkill = roundSkill(oldSkill)
    newSkill = roundSkill(newSkill)

    if (newSkill > oldSkill) {
        return `<:green_arrow_up:${process.env.GREEN_ARROW_UP_EMOJI_ID}>`
    } else if (newSkill < oldSkill) {
        return `<:red_arrow_down:${process.env.RED_ARROW_DOWN_EMOJI_ID}>`
    } else {
        return `<:black_equals:${process.env.BLACK_EQUALS_EMOJI_ID}>`
    }
}


uncertaintyChangeEmoji = (oldUncertainty, newUncertainty) => {
    oldUncertainty = roundSkill(oldUncertainty)
    newUncertainty = roundSkill(newUncertainty)

    if (newUncertainty > oldUncertainty) {
        return ":arrow_up:"
    } else if (newUncertainty < oldUncertainty) {
        return ":arrow_down:"
    } else {
        return `<:black_equals:${process.env.BLACK_EQUALS_EMOJI_ID}>`
    }
}


getPlayerNameStrings = (redTeamIds, blueTeamIds, delim = "\n") => {
    const redPlayersString = redTeamIds.length > 0 ? redTeamIds.map(id => `<@${id}>`).join(delim) : "No players"
    const bluePlayersString = blueTeamIds.length > 0 ? blueTeamIds.map(id => `<@${id}>`).join(delim) : "No players"

    return {redPlayersString, bluePlayersString}
}

getPlayerFields = (match) => {
    const {redDiscordIds, blueDiscordIds} = match
    const {redPlayersString, bluePlayersString} = getPlayerNameStrings(redDiscordIds, blueDiscordIds)

    return [
        {
            name: `${teamEmoji("Blue")} Blue Team (${_.round(match.blueWinProbability * 100, 1)}% chance to win)`,
            value: `${bluePlayersString}`,
        },
        {
            name: `${teamEmoji("Red")} Red Team (${_.round(match.redWinProbability * 100, 1)}% chance to win)`,
            value: `${redPlayersString}`,
        },
    ];
}

getMatchQualityField = (matchQuality) => {
    return {
        name: "Match Quality",
        value: `${_.round(matchQuality, 1)}% chance to draw`,
        inline: true
    }
}

getDurationField = (startTime, endTime, inline = false, prefix = "Gather") => {
    const momentDuration = moment.duration(endTime - startTime)
    return {
        name: `${prefix} Duration`,
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

getResultField = (winner, inline = false) => {
    const roundResult = `${teamEmoji(winner)} ${winner} ` + (winner === constants.SOLDAT_TEAMS.TIE ? "Tie" : "Win")

    return {
        name: "Result",
        value: roundResult,
        inline
    }
}


getGameModeField = (gameMode) => {
    return {
        name: "Game Mode",
        value: constants.formatGameMode(gameMode)
    }
}

getServerLinkField = (password = "") => {
    return {
        name: "Link",
        value: `IP: ${process.env.SERVER_IP} - Port: ${process.env.SERVER_PORT}`,
    }
}


getPlayerNameStringsWithKillsAndDeaths = (discordIds, playerKillsAndDeaths = undefined) => {
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

getSkillChangeStrings = (discordIds, discordIdToOldRating, discordIdToNewRating) => {

    return discordIds.map(discordId => {
        const oldRating = discordIdToOldRating[discordId]
        const newRating = discordIdToNewRating[discordId]

        // We are rounding before we take a difference in order to treat small differences as 0 and display an equals sign
        return `${skillChangeEmoji(oldRating.mu, newRating.mu)} ${roundSkill(roundSkill(newRating.mu) - roundSkill(oldRating.mu))}`;
    })
}

getUncertaintyChangeStrings = (discordIds, discordIdToOldRating, discordIdToNewRating) => {

    return discordIds.map(discordId => {
        const oldRating = discordIdToOldRating[discordId]
        const newRating = discordIdToNewRating[discordId]

        // We are rounding before we take a difference in order to treat small differences as 0 and display an equals sign
        return `${uncertaintyChangeEmoji(oldRating.sigma, newRating.sigma)} ${roundSkill(roundSkill(newRating.sigma) - roundSkill(oldRating.sigma))}`;
    })
}


getGatherEndFieldsForTeam = (teamName, discordIds, roundWins, discordIdToOldRating, discordIdToNewRating) => {

    const playerNameStrings = getPlayerNameStringsWithKillsAndDeaths(discordIds)
    const skillChangeStrings = getSkillChangeStrings(discordIds, discordIdToOldRating, discordIdToNewRating)
    const uncertaintyChangeStrings = getUncertaintyChangeStrings(discordIds, discordIdToOldRating, discordIdToNewRating)

    return [
        {
            name: `${teamEmoji(teamName)} ${teamName} Team (${roundWins} round wins)`,
            value: `${playerNameStrings.join("\n")}`,
            inline: true
        },
        {
            name: `Skill`,
            value: `${skillChangeStrings.join("\n")}`,
            inline: true
        },
        {
            name: `Uncertainty`,
            value: `${uncertaintyChangeStrings.join("\n")}`,
            inline: true
        },
    ]
}


getGatherEndFields = (game, discordIdToOldRating = undefined, discordIdToNewRating = undefined) => {
    return [
        getResultField(game.winner, true),
        getDurationField(game.startTime, game.endTime, true, "Gather"),
        getGameModeField(game.gameMode),
        ...getGatherEndFieldsForTeam(constants.SOLDAT_TEAMS.BLUE, game.bluePlayers, game.blueRoundWins, discordIdToOldRating, discordIdToNewRating),
        ...getGatherEndFieldsForTeam(constants.SOLDAT_TEAMS.RED, game.redPlayers, game.redRoundWins, discordIdToOldRating, discordIdToNewRating)
    ]
}


getRoundEndFields = (gameMode, redDiscordIds, blueDiscordIds, round) => {

    // TODO: Hook this up
    const playerKillsAndDeaths = {}
    const allPlayers = [...redDiscordIds, ...blueDiscordIds]

    allPlayers.forEach(discordId => {
        playerKillsAndDeaths[discordId] = {
            kills: 0,
            deaths: 0
        }
    })

    const redPlayersString = getPlayerNameStringsWithKillsAndDeaths(redDiscordIds, playerKillsAndDeaths).join("\n")
    const bluePlayersString = getPlayerNameStringsWithKillsAndDeaths(blueDiscordIds, playerKillsAndDeaths).join("\n")

    const flagsOrBases = gameMode === GAME_MODES.CAPTURE_THE_FLAG ? "flags" : "bases"

    return [
        getResultField(round.winner, true),
        getDurationField(round.startTime, round.endTime, true, "Round"),
        getMapField(round.mapName),
        {
            name: `${teamEmoji(constants.SOLDAT_TEAMS.BLUE)} Blue Team (${round.blueCaps} ${flagsOrBases} captured)`,
            value: `${bluePlayersString}`,
        },
        {
            name: `${teamEmoji(constants.SOLDAT_TEAMS.RED)} Red Team (${round.redCaps} ${flagsOrBases} captured)`,
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
    teamEmoji,
    getPlayerNameStrings,
    getPlayerFields,
    getRoundEndFields,
    getDurationField,
    getGatherEndFields,
    getMapField,
    getServerLinkField,
    getDiscordIdToUsernameMap,
    getGameModeField,
    getMatchQualityField,
    roundSkill,
    formatRating
}