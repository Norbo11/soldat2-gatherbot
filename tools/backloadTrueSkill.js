require("dotenv").config()
const db = require("../game/db")
const _ = require("lodash")
const Discord = require("discord.js")
const trueskill = require("ts-trueskill")


const backloadRatings = async () => {

    const dbConn = await db.getDbConnection()
    const statsDb = new db.StatsDB(dbConn)

    const games = await statsDb.getAllGames()
    const client = new Discord.Client()
    await client.login(process.env.BOT_TOKEN)

    let ratings = {}

    // const trueSkill = new trueskill.TrueSkill(
    //     25.0,  // Initial mean of ratings
    //     25 / 3,  // Initial standard deviation of ratings, recommend 1/3 of mu
    //     4.166666667,  // Distance that guarantees about 76% chance of winning
    //     0.08333334,  // Dynamic factor
    //     0.1,  // Probability of drawing
    // )

    const names = {

    }

    const getRating = player => player in ratings ? ratings[player] : new trueskill.Rating()
    const flipTeam = team => team === "Blue" ? "Red" : "Blue"

    const translateName = async discordId => {
        const username = (await client.fetchUser(discordId)).username
        names[discordId] = username
        return username
    }

    for (let game of games) {
        const teams = {
            ["Blue"]: game.bluePlayers,
            ["Red"]: game.redPlayers,
        }

        const players = [...game.bluePlayers, ...game.redPlayers]

        for (let player of players) {
            await translateName(player)
        }

        console.log(`Game ${game.startTime}`)
        console.log(`Blue Team: ${teams["Blue"].map(player => `${names[player]} (${getRating(player)})`).join(", ")}`)
        console.log(`Red Team: ${teams["Red"].map(player => `${names[player]} (${getRating(player)})`).join(", ")}`)
        console.log(`Winner: ${game.winner}`)

        _.forEach(game.rounds, round => {
            const blueRatings = _.map(game.bluePlayers, getRating)
            const redRatings = _.map(game.redPlayers, getRating)

            const ratingGroups = [blueRatings, redRatings]
            const matchQuality = trueskill.quality(ratingGroups)

            const winProbability = trueskill.winProbability(blueRatings, redRatings)
            let ranks;

            if (round.winner === "Tie") {
                ranks = [0, 0]
            } else if (round.winner === "Blue") {
                ranks = [0, 1]
            } else {
                ranks = [1, 0]
            }

            console.log(`Match quality ${matchQuality}`)
            console.log(`Win probability ${winProbability}`)

            const [newBlueRatings, newRedRatings] = trueskill.rate(ratingGroups, ranks)

            _.forEach(newBlueRatings, (rating, i) => {
                const player = game.bluePlayers[i]
                console.log(`${names[player]}: ${rating}`)
                ratings[player] = rating
            })

            _.forEach(newRedRatings, (rating, i) => {
                const player = game.redPlayers[i]
                console.log(`${names[player]}: ${rating}`)
                ratings[player] = rating
            })
        })
    }

    console.log("Final ratings:")
    let sortedRatings = _.map(ratings, (rating, discordId) => {
        return {
            rating: rating,
            name: names[discordId],
            conservativeSkillEstimate: trueskill.expose(rating)
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
