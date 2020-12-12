import logger from './logger';
import moment from 'moment';
import _ from 'lodash';
import constants from '../game/constants';
import stats from '../game/stats';
import statsFormatting from '../game/statsFormatting';

const GAME_MODES = constants.GAME_MODES

const teamEmoji = (teamName) => {
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



const getPlayerNameStrings = (redTeamIds, blueTeamIds, delim = "\n") => {
    const redPlayersString = redTeamIds.length > 0 ? redTeamIds.map(id => `<@${id}>`).join(delim) : "No players"
    const bluePlayersString = blueTeamIds.length > 0 ? blueTeamIds.map(id => `<@${id}>`).join(delim) : "No players"

    return {redPlayersString, bluePlayersString}
}

const getPlayerFields = (match) => {
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

const getMatchQualityField = (matchQuality) => {
    return {
        name: "Match Quality",
        value: `${_.round(matchQuality, 1)}% chance to draw`,
        inline: true
    }
}

const getDurationField = (startTime, endTime, inline = false, prefix = "Gather") => {
    const momentDuration = moment.duration(endTime - startTime)
    return {
        name: `${prefix} Duration`,
        value: momentDuration.humanize(),
        inline
    }
}

const getMapField = (mapName, inline = false) => {
    return {
        name: "Map",
        value: `${mapName}`,
        inline,
    }
}

const getResultField = (winner, inline = false) => {
    const roundResult = `${teamEmoji(winner)} ${winner} ` + (winner === constants.SOLDAT_TEAMS.TIE ? "" : "Win")

    return {
        name: "Result",
        value: roundResult,
        inline
    }
}


const getGameModeField = (gameMode) => {
    return {
        name: "Game Mode",
        value: constants.formatGameMode(gameMode)
    }
}

const getServerLinkField = (password = "") => {
    return {
        name: "Link",
        value: `IP: ${process.env.SERVER_IP} - Port: ${process.env.SERVER_PORT}`,
    }
}


const getPlayerNameStringsWithKillsAndDeaths = (discordIds, playerKillsAndDeaths) => {
    return discordIds.map(discordId => {
        const kills = (playerKillsAndDeaths[discordId] || {kills: 0}).kills
        const deaths = (playerKillsAndDeaths[discordId] || {deaths: 0}).deaths

        return `<@${discordId}>: ${kills}/${deaths} (${(kills / deaths).toFixed(2)})`
    })
}


const getGatherEndFieldsForTeam = (teamName, discordIds, roundWins, playerKillsAndDeaths, discordIdToOldRating, discordIdToNewRating) => {

    const playerNameStrings = getPlayerNameStringsWithKillsAndDeaths(discordIds, playerKillsAndDeaths)
    const skillChangeStrings = statsFormatting.getSkillChangeStrings(discordIds, discordIdToOldRating, discordIdToNewRating)
    const uncertaintyChangeStrings = statsFormatting.getUncertaintyChangeStrings(discordIds, discordIdToOldRating, discordIdToNewRating)

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


const getGatherEndFields = (game, discordIdToOldRating = undefined, discordIdToNewRating = undefined) => {
    const allEvents = _.flatMap(game.rounds, round => round.events)
    const playerKillsAndDeaths = stats.getKillsAndDeathsPerPlayer(allEvents)

    return [
        getResultField(game.winner, true),
        getDurationField(game.startTime, game.endTime, true, "Gather"),
        getGameModeField(game.gameMode),
        ...getGatherEndFieldsForTeam(constants.SOLDAT_TEAMS.BLUE, game.bluePlayers, game.blueRoundWins, playerKillsAndDeaths, discordIdToOldRating, discordIdToNewRating),
        ...getGatherEndFieldsForTeam(constants.SOLDAT_TEAMS.RED, game.redPlayers, game.redRoundWins, playerKillsAndDeaths, discordIdToOldRating, discordIdToNewRating)
    ]
}


const getRoundEndFields = (gameMode, redDiscordIds, blueDiscordIds, round) => {

    // TODO: Hook this up
    const playerKillsAndDeaths = stats.getKillsAndDeathsPerPlayer(round.events)
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


export default {
    teamEmoji,
    getPlayerNameStrings,
    getPlayerFields,
    getRoundEndFields,
    getDurationField,
    getGatherEndFields,
    getMapField,
    getServerLinkField,
    getGameModeField,
    getMatchQualityField,

};