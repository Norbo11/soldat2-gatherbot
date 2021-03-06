import moment from 'moment';
import {GAME_MODES, formatGameMode} from './constants';
import ratings from './ratings';
import _ from 'lodash';

const roundSkill = (skill) => {
    return skill.toFixed(2)
}

const formatRating = (rating) => {
    const skillEstimate = ratings.getSkillEstimate(rating)
    return `Skill ${roundSkill(rating.mu)}, Uncertainty ${roundSkill(rating.sigma)}, Rating Estimate ${roundSkill(skillEstimate)}`
}


const skillChangeEmoji = (oldSkill, newSkill) => {
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


const uncertaintyChangeEmoji = (oldUncertainty, newUncertainty) => {
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


const getSkillChangeStrings = (discordIds, discordIdToOldRating, discordIdToNewRating) => {

    return discordIds.map(discordId => {
        const oldRating = discordIdToOldRating[discordId]
        const newRating = discordIdToNewRating[discordId]

        // We are rounding before we take a difference in order to treat small differences as 0 and display an equals sign
        return `${skillChangeEmoji(oldRating.mu, newRating.mu)} ${roundSkill(roundSkill(newRating.mu) - roundSkill(oldRating.mu))}`;
    })
}

const getUncertaintyChangeStrings = (discordIds, discordIdToOldRating, discordIdToNewRating) => {

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

    return `${stats.wonGames}-${stats.tiedGames}-${stats.lostGames} (${Math.round(stats.wonGames / (stats.wonGames + stats.lostGames) * 100)}% winrate)`
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

    favouriteWeapons = _.sortBy(favouriteWeapons, weaponStat => -weaponStat.kills / playerStats.totalRounds)
    favouriteWeapons = _.take(favouriteWeapons, 5)
    favouriteWeapons = favouriteWeapons.map(weaponStat => `**${weaponStat.weaponName}**: ${weaponStat.kills} kills (${(weaponStat.kills / playerStats.totalRoundsAfterKillTrackingWasImplemented).toFixed(2)} per round)`)

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

const formatTopPlayers = (gameMode, topPlayers) => {
    const topPlayersByKda = topPlayers.topPlayersByKda.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `<@${topPlayer.discordId}>: ${playerStats.totalKills}/${playerStats.totalDeaths} (${(playerStats.totalKills / playerStats.totalDeaths).toFixed(2)})`
    })

    const topPlayersByTotalGames = topPlayers.topPlayersByTotalGames.map(topPlayer => {
        const playerStats = topPlayer.playerStats.gameModeStats[gameMode]
        return `<@${topPlayer.discordId}>: ${playerStats.totalGames}`
    })

    // const topPlayersByTeamKills = topPlayers.topPlayersByTeamKills.map(topPlayer => {
    //     const playerStats = topPlayer.playerStats
    //     return `**${discordIdToUsername[topPlayer.discordId]}**: ${playerStats.totalTeamKills} team kills (${(playerStats.totalTeamKills / playerStats.totalKills * 100).toFixed(1)}% of kills)`
    // })

    const topPlayersBySkillEstimate = topPlayers.topPlayersBySkillEstimate.map(topPlayer => {
        const playerStats = topPlayer.playerStats
        const rating = playerStats.rating
        const estimate = ratings.getSkillEstimate(rating)
        return `<@${topPlayer.discordId}>: ${roundSkill(estimate)} (${playerStats.wonGames}-${playerStats.tiedGames}-${playerStats.lostGames})`
    })

    return {
        embed: {
            title: `Top ${formatGameMode(gameMode)} Players`,
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

const formatTopPlayersByWeapon = (topPlayers, weapon) => {
    const topPlayersByWeaponKills = topPlayers.topPlayersByWeaponKills[weapon.formattedName].map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `<@${topPlayer.discordId}>: ${playerStats.weaponStats[weapon.formattedName].kills} kills`
    })

    const topPlayersByWeaponKillsPerRound = topPlayers.topPlayersByWeaponKillsPerRound[weapon.formattedName].map(topPlayer => {
        const playerStats = topPlayer.playerStats
        return `<@${topPlayer.discordId}>: ${(playerStats.weaponStats[weapon.formattedName].kills / playerStats.totalRoundsAfterKillTrackingWasImplemented).toFixed(2)} kills`
    })

    return {
        embed: {
            title: `Top ${weapon.formattedName} Players`,
            fields: [
                {
                    name: `**Total Kills**`,
                    value: topPlayersByWeaponKills.length > 0 ? topPlayersByWeaponKills.join("\n") : "No kills with this weapon",
                    inline: true
                },
                {
                    name: `**Avg. Kills Per Round**`,
                    value: topPlayersByWeaponKillsPerRound.length > 0 ? topPlayersByWeaponKillsPerRound.join("\n") : "No kills with this weapon",
                    inline: true
                },
            ]
        }
    }
}


const formatOverallWeaponStats = (overallWeaponStats) => {

    let sortedWeaponStats = _.map(_.keys(overallWeaponStats), weaponName => {
        const stats = overallWeaponStats[weaponName]
        return {
            weaponName, stats
        }

    })

    sortedWeaponStats = _.sortBy(sortedWeaponStats, x => -x.stats.kills)

    const outputLines = _.map(sortedWeaponStats, x => {
        return `**${x.weaponName}**: ${x.stats.kills} total kills`
    })

    return {
        embed: {
            fields: [
                {
                    name: `**Overall Weapon Stats**`,
                    value: outputLines.join("\n") ,
                    inline: true
                },
            ]
        }
    }
}


export const formatClip = (clip) => {
    return `Clip **#${clip.id}** added by <@${clip.addedByDiscordId}> on ${moment(clip.addedTime).format("dddd, MMMM Do YYYY, h:mm:ss a")}\n${clip.clipUrl}`
}

export default {
    formatGeneralStatsForPlayer, formatGatherStats, formatTopPlayersByWeapon, formatTopPlayers, skillChangeEmoji,
    uncertaintyChangeEmoji, getSkillChangeStrings, getUncertaintyChangeStrings, formatOverallWeaponStats
};
