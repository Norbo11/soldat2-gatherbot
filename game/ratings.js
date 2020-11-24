require("lodash.combinations")
const trueskill = require("ts-trueskill")
const _ = require("lodash")



const getRating = (player) => {
    return new trueskill.Rating(player.ratingMu, player.ratingSigma)
}

const getPlayer = (ratingMu, ratingSigma) => {
    return {
        ratingMu, ratingSigma
    }
}

const createRating = () => {
    return new trueskill.Rating()
}


const createNewPlayer = () => {
    const rating = createRating()
    return getPlayer(rating.mu, rating.sigma)
}


const getRatingGroups = (blueDiscordIds, redDiscordIds, discordIdToPlayer) => {
    const blueRatings = _.map(blueDiscordIds, discordId => getRating(discordIdToPlayer[discordId]))
    const redRatings = _.map(redDiscordIds, discordId => getRating(discordIdToPlayer[discordId]))

    return [blueRatings, redRatings]
}


const formatRating = (mu, sigma) => {
    return `Skill ${_.round(mu, 1)}, Uncertainty ${_.round(sigma, 1)}`
}


const getSkillEstimate = (rating) => {
    return trueskill.expose(rating)
}


const rateRounds = (game, discordIdToPlayer) => {
    const discordIdToRating = {}

    _.forEach(game.rounds, round => {
        const ratingGroups = getRatingGroups(game.bluePlayers, game.redPlayers, discordIdToPlayer)

        let ranks;

        if (round.winner === "Tie") {
            ranks = [0, 0]
        } else if (round.winner === "Blue") {
            ranks = [0, 1]
        } else {
            ranks = [1, 0]
        }

        const [newBlueRatings, newRedRatings] = trueskill.rate(ratingGroups, ranks)

        _.forEach(newBlueRatings, (rating, i) => {
            const player = game.bluePlayers[i]
            discordIdToRating[player] = rating
        })

        _.forEach(newRedRatings, (rating, i) => {
            const player = game.redPlayers[i]
            discordIdToRating[player] = rating
        })
    })

    return discordIdToRating
}


const getBalancedMatch = (discordIdToPlayer, size) => {
    const allDiscordIds = _.keys(discordIdToPlayer)
    const combinations = _.combinations(allDiscordIds, size / 2)

    const possibleMatches = _.map(combinations, blueDiscordIds => {
        const redDiscordIds = _.filter(allDiscordIds, discordId => !_.includes(blueDiscordIds, discordId))
        const ratingGroups = getRatingGroups(blueDiscordIds, redDiscordIds, discordIdToPlayer)
        const matchQuality = trueskill.quality(ratingGroups)
        const [blueRatings, redRatings] = ratingGroups
        const blueWinProbability = trueskill.winProbability(blueRatings, redRatings)
        const redWinProbability = trueskill.winProbability(redRatings, blueRatings)

        return {
            blueDiscordIds,
            redDiscordIds,
            matchQuality,
            ratingGroups,
            blueWinProbability,
            redWinProbability,
            allDiscordIds,
        }
    })

    const sortedByQuality = _.sortBy(possibleMatches, match => -match.matchQuality)
    const highestQualityMatch = sortedByQuality[0]

    // TODO: It might be cool for the bot to display the 3 highest quality matches it considered and which one it
    //  picked? Or possibly even randomly pick between the top 3 quality matches.
    return highestQualityMatch
}

module.exports = {
    createRating, createNewPlayer, rateRounds, getBalancedMatch, getRating, formatRating, getPlayer, getSkillEstimate
}