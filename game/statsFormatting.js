const moment = require("moment")
const constants = require("./constants")
const ratings = require("./ratings")
const _ = require("lodash")

const GAME_MODES = constants.GAME_MODES

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
        `**Rating**: ${formatRating(playerStats.rating)}`,
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
        return `**${discordIdToUsername[topPlayer.discordId]}**: ${roundSkill(estimate)} (${playerStats.wonGames}-${playerStats.tiedGames}-${playerStats.lostGames})`
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
                    name: "**K/D Ratio**",
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
    formatGeneralStatsForPlayer, formatGatherStats, formatTopPlayersByWeapon, formatTopPlayers, skillChangeEmoji,
    uncertaintyChangeEmoji, getSkillChangeStrings, getUncertaintyChangeStrings
}
