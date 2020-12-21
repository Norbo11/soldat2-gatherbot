import 'lodash.combinations';
import trueskill from 'ts-trueskill';
import logger from '../utils/logger';
import _ from 'lodash';

// The library has a bug where the constructor doesn't properly initialize "sigma", "beta" and "tau" unless you pass
// undefined.
const trueSkill = new trueskill.TrueSkill()

// Mu: the average value for the Gaussian distribution; 99.99% of skill levels will lie within +- 3 sigmas of this value
// If mu is 3 and sigma is 1, 99.99% of skill levels will lie between 0 and 6.
// So if we want 100 skill "levels", multiply mu by 100/6 to get 50
trueSkill.mu = 50

// Sigma: average standard deviation, kept at Mu / 3 following the logic above
trueSkill.sigma = trueSkill.mu / 3

// Beta: the "skill class width", the number of skill points a person must have above someone else to identify
// an 80% probability of a win against that person
trueSkill.beta = trueSkill.sigma / 2

// Tau: determines how easy it is for a player to move up or down the leaderboard, i.e. how "dynamic" the scores are
trueSkill.tau = trueSkill.sigma / 100

// Draw probability: how many rounds will draw on average, as a percentage? Keeping this default for now
trueSkill.drawProbability = 0.1


const NEW_PLAYER_MU = 45
const NEW_PLAYER_SIGMA = trueSkill.sigma


const getRating = (ratingMu, ratingSigma) => {
    return trueSkill.createRating(ratingMu, ratingSigma)
}


const createRating = () => {
    return trueSkill.createRating(NEW_PLAYER_MU, NEW_PLAYER_SIGMA)
}


const getRatingGroups = (blueDiscordIds, redDiscordIds, discordIdToRating) => {
    const blueRatings = _.map(blueDiscordIds, discordId => discordIdToRating[discordId])
    const redRatings = _.map(redDiscordIds, discordId => discordIdToRating[discordId])

    return [blueRatings, redRatings]
}

const getSkillEstimate = (rating) => {
    return trueSkill.expose(rating)
}


const rateRound = (bluePlayers, redPlayers, discordIdToRating, round) => {
    const newDiscordIdToRating = Object.assign({}, discordIdToRating)
    const ratingGroups = getRatingGroups(bluePlayers, redPlayers, newDiscordIdToRating)

    let ranks;

    if (round.winner === "Tie") {
        ranks = [0, 0]
    } else if (round.winner === "Blue") {
        ranks = [0, 1]
    } else {
        ranks = [1, 0]
    }

    const [newBlueRatings, newRedRatings] = trueSkill.rate(ratingGroups, ranks)

    _.forEach(newBlueRatings, (rating, i) => {
        const player = bluePlayers[i]
        newDiscordIdToRating[player] = rating
    })

    _.forEach(newRedRatings, (rating, i) => {
        const player = redPlayers[i]
        newDiscordIdToRating[player] = rating
    })

    return newDiscordIdToRating
}


const rateRounds = (game, discordIdToRating) => {
    let newDiscordIdToRating = Object.assign({}, discordIdToRating)

    _.forEach(game.rounds, round => {
        newDiscordIdToRating = rateRound(game.bluePlayers, game.redPlayers, newDiscordIdToRating, round)
    })

    return newDiscordIdToRating
}


const getBalancedMatch = (discordIdToRating, size) => {
    const allDiscordIds = _.keys(discordIdToRating)
    const combinations = _.combinations(allDiscordIds, size / 2)

    const triedCombinations = new Set()
    const possibleMatches = []

    _.forEach(combinations, blueDiscordIds => {
        const redDiscordIds = _.filter(allDiscordIds, discordId => !_.includes(blueDiscordIds, discordId))

        const combinationString = blueDiscordIds.join("-") + "-" + redDiscordIds.join("-")
        const reverseCombinationString = redDiscordIds.join("-") + "-" + blueDiscordIds.join("-")
        if (triedCombinations.has(combinationString) || triedCombinations.has(reverseCombinationString)) {
            return
        }
        triedCombinations.add(combinationString)
        triedCombinations.add(reverseCombinationString)

        const ratingGroups = getRatingGroups(blueDiscordIds, redDiscordIds, discordIdToRating)
        const matchQuality = trueSkill.quality(ratingGroups)
        const [blueRatings, redRatings] = ratingGroups
        const blueWinProbability = trueSkill.winProbability(blueRatings, redRatings)
        const redWinProbability = trueSkill.winProbability(redRatings, blueRatings)

        possibleMatches.push({
            blueDiscordIds,
            redDiscordIds,
            matchQuality,
            ratingGroups,
            blueWinProbability,
            redWinProbability,
            allDiscordIds,
        })
    })

    const sortedByQuality = _.sortBy(possibleMatches, match => -match.matchQuality)

    logger.log.info("Considered the following matches:")
    _.forEach(sortedByQuality, match => {
        logger.log.info(`${match.blueDiscordIds.join(", ")} vs ${match.redDiscordIds} = ${match.matchQuality}`)
    })

    // TODO: It might be cool for the bot to display the 3 highest quality matches it considered and which one it
    //  picked? Or possibly even randomly pick between the top 3 quality matches.
    return sortedByQuality[0]
}

export default {
    createRating, rateRounds, getBalancedMatch, getSkillEstimate, getRating, rateRound
};