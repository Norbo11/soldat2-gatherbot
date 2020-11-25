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
    const discordIdToPlayer = {}

    const translateName = async discordId => {
        const username = (await client.fetchUser(discordId)).username
        names[discordId] = username
        return username
    }

    const addPlayer = discordId => {
        if (!(discordId in discordIdToPlayer)) {
            discordIdToPlayer[discordId] = ratings.createNewPlayer()
        }
    }

    const getRating = discordId => {
        const player = discordIdToPlayer[discordId]
        return ratings.getRatingOfPlayer(player)
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
        console.log(`Blue Team: ${teams["Blue"].map(player => `${names[player]} (${getRating(player)})`).join(", ")}`)
        console.log(`Red Team: ${teams["Red"].map(player => `${names[player]} (${getRating(player)})`).join(", ")}`)
        console.log(`Winner: ${game.winner}`)

        const newRatings = ratings.rateRounds(game, discordIdToPlayer)

        _.forEach(newRatings, (newRating, discordId) => {
            discordIdToPlayer[discordId] = ratings.getPlayer(newRating.mu, newRating.sigma)
        })
    }

    console.log("Final ratings:")
    let sortedRatings = _.map(discordIdToPlayer, (player, discordId) => {
        return {
            name: names[discordId],
            conservativeSkillEstimate: ratings.getSkillEstimate(ratings.getRatingOfPlayer(player)),
            rating: ratings.getRatingOfPlayer(player),
            player,
            discordId
        }
    })

    sortedRatings = _.sortBy(sortedRatings, rating => rating.conservativeSkillEstimate)

    _.forEach(sortedRatings, (rating) => {
        console.log(`${rating.name}: ${rating.rating} = ${rating.conservativeSkillEstimate}`)
        statsDb.upsertPlayer(rating.discordId, rating.rating.mu, rating.rating.sigma)
    })

}


(async () => {
    await backloadRatings()
})()
