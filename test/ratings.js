const chai = require('chai');
const chaiSubset = require('chai-subset');
const _ = require('lodash')
chai.use(chaiSubset)

const assert = chai.assert

const ratings = require("../game/ratings")


const printRatings = (nameToRating) => {
    _.forEach(_.keys(nameToRating), name => {
        console.log(`${name}: ${nameToRating[name]} ${ratings.getSkillEstimate(nameToRating[name])}`)
    })
}


const computeRatingDiff = (oldRatings, newRatings) => {
    const muDiffs = {}
    const sigmaDiffs = {}

    _.forEach(oldRatings, (oldRating, key) => {
        const newRating = newRatings[key]

        muDiffs[key] = newRating.mu - oldRating.mu
        sigmaDiffs[key] = newRating.sigma - oldRating.sigma
    })

    return {muDiffs, sigmaDiffs}
}


describe("Ratings", () => {
    it("should balance teams of 2 strong 2 weak", () => {
        const players = {
            "a": ratings.getRating(60, 2),
            "b": ratings.getRating(60, 2),
            "c": ratings.getRating(30, 2),
            "d": ratings.getRating(30, 2),
        }

        const match = ratings.getBalancedMatch(players, 4)
        assert.containSubset(match, {
            matchQuality: 0.9723873019805175,
            blueDiscordIds: ["a", "c"],
            redDiscordIds: ["b", "d"],
            blueWinProbability: 0.5000000150000002
        })
    })

    it("should balance teams of 2 strong 2 weak; higher ratings but same match quality", () => {
        const players = {
            "a": ratings.getRating(70, 2),
            "b": ratings.getRating(70, 2),
            "c": ratings.getRating(30, 2),
            "d": ratings.getRating(30, 2),
        }

        const match = ratings.getBalancedMatch(players, 4)
        assert.containSubset(match, {
            matchQuality: 0.9723873019805175,
            blueDiscordIds: ["a", "c"],
            redDiscordIds: ["b", "d"],
            blueWinProbability: 0.5000000150000002
        })
    })

    it("should balance teams of 2 strong 2 weak; lower match quality due to slight imbalance", () => {
        const players = {
            "a": ratings.getRating(70, 2),
            "b": ratings.getRating(60, 2),
            "c": ratings.getRating(30, 2),
            "d": ratings.getRating(30, 2),
        }

        const match = ratings.getBalancedMatch(players, 4)
        assert.containSubset(match, {
            matchQuality: 0.8202076272860593,
            blueDiscordIds: ["a", "c"],
            redDiscordIds: ["b", "d"],
            blueWinProbability: 0.7057165363415296,
            redWinProbability: 0.2942834636584703
        })
    })


    it("should balance teams of 4 strong", () => {
        const players = {
            "a": ratings.getRating(60, 2),
            "b": ratings.getRating(60, 2),
            "c": ratings.getRating(60, 2),
            "d": ratings.getRating(60, 2),
        }

        const match = ratings.getBalancedMatch(players, 4)
        assert.containSubset(match, {
            matchQuality: 0.9723873019805175,
            blueDiscordIds: ["a", "b"],
            redDiscordIds: ["c", "d"],
            blueWinProbability: 0.5000000150000002,
            redWinProbability: 0.5000000150000002
        })
    })

    it("should balance teams of 4 strong but lower match quality due to increased uncertainty", () => {
        const players = {
            "a": ratings.getRating(60, 2),
            "b": ratings.getRating(60, 2),
            "c": ratings.getRating(60, 6),
            "d": ratings.getRating(60, 6),
        }

        const match = ratings.getBalancedMatch(players, 4)
        assert.containSubset(match, {
            // Lower match quality due to increased uncertainty
            // This match quality is actually the same across the 3 combinations of teams which may be a bit
            // counter-intuitive; you'd think a, b vs c, d would have the lowest match quality
            matchQuality: 0.8811342210628017,

            // Certain + uncertain vs certain + uncertain
            blueDiscordIds: ["a", "b"],
            redDiscordIds: ["c", "d"],

            // Same win probabilities
            blueWinProbability: 0.5000000150000002,
            redWinProbability: 0.5000000150000002
        })
    })

    it("should do a big rating increase if 2 weak beat 2 strong", () => {

        const oldRatings = {
            "a": ratings.getRating(30, 100 / 3),
            "b": ratings.getRating(30, 100 / 3),
            "c": ratings.getRating(70, 100 / 3),
            "d": ratings.getRating(70, 100 / 3),
        }

        const game = {
            bluePlayers: ["a", "b"],
            redPlayers: ["c", "d"],
            rounds: [
                {
                    winner: "Blue"
                },
                {
                    winner: "Blue"
                },
            ]
        }

        const newRatings = ratings.rateRounds(game, oldRatings)
        const {muDiffs, sigmaDiffs} = computeRatingDiff(oldRatings, newRatings)

        // Big increase in a and b ratings, equal decrease in c and d ratings
        assert.equal(muDiffs["a"], 35.08022293058653)
        assert.equal(muDiffs["b"], 35.08022293058653)
        assert.equal(muDiffs["c"], -35.080222930586544)
        assert.equal(muDiffs["d"], -35.080222930586544)

        // Decrease in uncertainties as the system learned a lot about these players' relative skill levels
        // Seems a bit counter-intuitive because this result was very surprising, but because the
        // uncertainty was high to start off with, the system wasn't sure about skill levels to behind with.
        assert.equal(sigmaDiffs["a"], -5.306623193545484)
        assert.equal(sigmaDiffs["b"], -5.306623193545484)
        assert.equal(sigmaDiffs["c"], -5.306623193545484)
        assert.equal(sigmaDiffs["d"], -5.306623193545484)
    })

    it("should do a big rating increase if 2 weak beat 2 strong when starting with more certainty", () => {

        const oldRatings = {
            "a": ratings.getRating(30, 100 / 6),
            "b": ratings.getRating(30, 100 / 6),
            "c": ratings.getRating(70, 100 / 6),
            "d": ratings.getRating(70, 100 / 6),
        }

        const game = {
            bluePlayers: ["a", "b"],
            redPlayers: ["c", "d"],
            rounds: [
                {
                    winner: "Blue"
                },
                {
                    winner: "Blue"
                },
            ]
        }

        const newRatings = ratings.rateRounds(game, oldRatings)
        const {muDiffs, sigmaDiffs} = computeRatingDiff(oldRatings, newRatings)

        // Smaller increases in a and b ratings than before due to higher starting certainty,
        // despite the surprising result
        assert.equal(muDiffs["a"], 25.05722457942357)
        assert.equal(muDiffs["b"], 25.05722457942357)
        assert.equal(muDiffs["c"], -25.057224579423554)
        assert.equal(muDiffs["d"], -25.05722457942356)

        // Smaller decreases in uncertainty
        assert.equal(sigmaDiffs["a"], -2.5736584808598906)
        assert.equal(sigmaDiffs["b"], -2.5736584808598906)
        assert.equal(sigmaDiffs["c"], -2.5736584808598906)
        assert.equal(sigmaDiffs["d"], -2.5736584808598906)
    })

    it("should do a small rating increase if 2 strong beat 2 weak", () => {

        const oldRatings = {
            "a": ratings.getRating(30, 100 / 3),
            "b": ratings.getRating(30, 100 / 3),
            "c": ratings.getRating(70, 100 / 3),
            "d": ratings.getRating(70, 100 / 3),
        }

        const game = {
            bluePlayers: ["a", "b"],
            redPlayers: ["c", "d"],
            rounds: [
                {
                    winner: "Red"
                },
                {
                    winner: "Red"
                }
            ]
        }

        const newRatings = ratings.rateRounds(game, oldRatings)
        const {muDiffs, sigmaDiffs} = computeRatingDiff(oldRatings, newRatings)

        // Small decrease in a and b ratings, equally small increase in c and d ratings
        assert.equal(muDiffs["a"], -6.364513402145704)
        assert.equal(muDiffs["b"], -6.364513402145704)
        assert.equal(muDiffs["c"], 6.36451340214569)
        assert.equal(muDiffs["d"], 6.36451340214569)

        // Decrease in uncertainty due to unsurprising result
        assert.equal(sigmaDiffs["a"], -2.277736555496798)
        assert.equal(sigmaDiffs["b"], -2.277736555496798)
        assert.equal(sigmaDiffs["c"], -2.277736555496798)
        assert.equal(sigmaDiffs["d"], -2.277736555496798)
    })

    it("ties do not change rating if all skill levels are the same", () => {
        const oldRatings = {
            "a": ratings.getRating(50, 100 / 3),
            "b": ratings.getRating(50, 100 / 3),
            "c": ratings.getRating(50, 100 / 3),
            "d": ratings.getRating(50, 100 / 3),
        }

        const game = {
            bluePlayers: ["a", "b"],
            redPlayers: ["c", "d"],
            rounds: [
                {
                    winner: "Tie"
                },
            ]
        }

        const newRatings = ratings.rateRounds(game, oldRatings)
        const {muDiffs, sigmaDiffs} = computeRatingDiff(oldRatings, newRatings)

        assert.closeTo(muDiffs["a"], 0.0, 1e-10)
    })

    it("win, lose, tie  slightly favours the team that won last", () => {

        const oldRatings = {
            "a": ratings.getRating(50, 100 / 3),
            "b": ratings.getRating(50, 100 / 3),
            "c": ratings.getRating(50, 100 / 3),
            "d": ratings.getRating(50, 100 / 3),
        }

        const game = {
            bluePlayers: ["a", "b"],
            redPlayers: ["c", "d"],
            rounds: [
                {
                    winner: "Red"
                },
                {
                    winner: "Blue"
                },
                {
                    winner: "Tie"
                }
            ]
        }

        const newRatings = ratings.rateRounds(game, oldRatings)
        const {muDiffs, sigmaDiffs} = computeRatingDiff(oldRatings, newRatings)

        // c, d won the first match leading to a shift in skill levels
        // a, b then won the second match, and they are now the "weaker" team, so the skills shifted back up
        // a, b then tied with c, d, when they were still expected to lose, so overall they gained a bit of skill
        assert.equal(muDiffs["a"], 0.6462135347494851)
        assert.equal(muDiffs["b"], 0.6462135347494851)
        assert.equal(muDiffs["c"], -0.646213534749478)
        assert.equal(muDiffs["d"], -0.646213534749478)

        assert.equal(sigmaDiffs["a"], -8.958561018878004)
        assert.equal(sigmaDiffs["b"], -8.958561018878004)
        assert.equal(sigmaDiffs["c"], -8.958561018878004)
        assert.equal(sigmaDiffs["d"], -8.958561018878004)

        printRatings(newRatings)
    })

    it("win, lose, tie slightly favours the team that won last even with higher certainties" , () => {
        // This also feels a bit unintuitive

        const oldRatings = {
            "a": ratings.getRating(50, 100 / 6),
            "b": ratings.getRating(50, 100 / 6),
            "c": ratings.getRating(50, 100 / 6),
            "d": ratings.getRating(50, 100 / 6),
        }

        const game = {
            bluePlayers: ["a", "b"],
            redPlayers: ["c", "d"],
            rounds: [
                {
                    winner: "Red"
                },
                {
                    winner: "Blue"
                },
                {
                    winner: "Tie"
                }
            ]
        }

        const newRatings = ratings.rateRounds(game, oldRatings)
        const {muDiffs, sigmaDiffs} = computeRatingDiff(oldRatings, newRatings)

        // c, d won the first match leading to a shift in skill levels
        // a, b then won the second match, and they are now the "weaker" team, so the skills shifted back up
        // a, b then tied with c, d, when they were still expected to lose, so overall they gained a bit of skill
        assert.equal(muDiffs["a"], 0.7511869514309311)
        assert.equal(muDiffs["b"], 0.7511869514309311)
        assert.equal(muDiffs["c"], -0.7511869514309595)
        assert.equal(muDiffs["d"], -0.7511869514309595)

        assert.equal(sigmaDiffs["a"], -3.7346272702428305)
        assert.equal(sigmaDiffs["b"], -3.7346272702428305)
        assert.equal(sigmaDiffs["c"], -3.7346272702428305)
        assert.equal(sigmaDiffs["d"], -3.7346272702428305)

        printRatings(newRatings)
    })
})
