require("dotenv").config()
const db = require("../game/db")
const _ = require("lodash")
const Discord = require("discord.js")
const ratings = require("../game/ratings")


const backloadRatings = async () => {

    const dbConn = await db.getDbConnection()
    const statsDb = new db.StatsDB(dbConn)

    const games = await statsDb.getAllGames()
    const client = new Discord.Client()
    await client.login(process.env.BOT_TOKEN)

    // const trueSkill = new trueskill.TrueSkill(
    //     25.0,  // Initial mean of ratings
    //     25 / 3,  // Initial standard deviation of ratings, recommend 1/3 of mu
    //     4.166666667,  // Distance that guarantees about 76% chance of winning
    //     0.08333334,  // Dynamic factor
    //     0.1,  // Probability of drawing
    // )

    const names = {}
    const discordIdToRating = {}

    const translateName = async discordId => {
        const username = (await client.fetchUser(discordId)).username
        names[discordId] = username
        return username
    }

    const addPlayer = discordId => {
        if (!(discordId in discordIdToRating)) {
            discordIdToRating[discordId] = ratings.createRating()
        }
    }

    for (let game of games) {
        const teams = {
            ["Blue"]: game.bluePlayers,
            ["Red"]: game.redPlayers,
        }

        const allDiscordIds = [...game.bluePlayers, ...game.redPlayers]

        for (let discordId of allDiscordIds) {
            await translateName(discordId)
            addPlayer(discordId)
        }

        console.log(`Game ${game.startTime}`)
        console.log(`Blue Team: ${teams["Blue"].map(discordId => `${names[discordId]} (${ratings.getRating(discordId)})`).join(", ")}`)
        console.log(`Red Team: ${teams["Red"].map(discordId => `${names[discordId]} (${ratings.getRating(discordId)})`).join(", ")}`)
        console.log(`Winner: ${game.winner}`)

        for (let round of game.rounds) {
            const newRatings = ratings.rateRound(game.bluePlayers, game.redPlayers, discordIdToRating, round)

            for (let discordId of _.keys(newRatings)) {
                const rating = newRatings[discordId]
                discordIdToRating[discordId] = rating

                await statsDb.updateRating(discordId, game.startTime, round.startTime, rating.mu, rating.sigma)
            }
        }
    }

    console.log("Final ratings:")
    let sortedRatings = _.map(discordIdToRating, (rating, discordId) => {
        return {
            name: names[discordId],
            conservativeSkillEstimate: ratings.getSkillEstimate(rating),
            rating,
            discordId
        }
    })

    sortedRatings = _.sortBy(sortedRatings, rating => rating.conservativeSkillEstimate)

    _.forEach(sortedRatings, (rating) => {
        console.log(`${rating.name}: ${rating.rating} = ${rating.conservativeSkillEstimate}`)
    })

}


(async () => {
    await backloadRatings()
})()
