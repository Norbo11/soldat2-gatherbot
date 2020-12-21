require("dotenv").config()
import db from '../game/db';
import _ from 'lodash';
import Discord from 'discord.js';

const guild = "761205877432385567"
const channel = "761314449532387368"


const backloadRatings = (async () => {

    const dbConn = await db.getDbConnection()
    const statsDb = new db.StatsDB(dbConn)

    const games = await statsDb.getAllGames()
    const client = new Discord.Client()
    await client.login(process.env.BOT_TOKEN)

    let ratings = {}

    const names = {

    }

    const getRating = player => player in ratings ? ratings[player] : 1000
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

        const newRatings = {}
        const players = [...game.bluePlayers, ...game.redPlayers]

        const teamRatings = {
            "Blue": _.map(teams["Blue"], getRating).reduce((a, b) => a + b) / (game.size / 2),
            "Red": _.map(teams["Red"], getRating).reduce((a, b) => a + b) / (game.size / 2)
        }

        for (let player of players) {
            await translateName(player)
        }

        console.log(`Game ${game.startTime}`)
        console.log(`Blue Team: ${teams["Blue"].map(player => `${names[player]} (${getRating(player)})`).join(", ")} (avg rating ${teamRatings["Blue"]})`)
        console.log(`Red Team: ${teams["Red"].map(player => `${names[player]} (${getRating(player)})`).join(", ")} (avg rating ${teamRatings["Red"]})`)

        _.forEach(game.rounds, (round, i) => {
            console.log(`Round ${i + 1} winner: ${round.winner} (${round.blueCaps} - ${round.redCaps})`)
        })

        _.forEach(players, player => {
            const ownTeam = _.includes(teams["Blue"], player) ? "Blue" : "Red"
            const margins = []

            _.forEach(game.rounds, round => {
                const ownCaps = ownTeam === "Red" ? round.redCaps : round.blueCaps
                const oppCaps = ownTeam === "Red" ? round.blueCaps : round.redCaps
                let margin = ownCaps - oppCaps
                if (margin > 6) {
                    margin = 6
                }
                if (margin < -6) {
                    margin = -6
                }
                if (round.winner === ownTeam) {
                    margin = margin + 10
                } else if (round.winner === flipTeam(ownTeam)) {
                    margin = margin - 10
                }
                margins.push(margin)
            })

            const overallMargin = margins.reduce((a, b) => a + b)
            const x = 0.49
            const m = 53
            const actualOutcome = x + 0.5 - Math.pow(x, 1 + overallMargin / m)

            const rOwn = getRating(player)

            const rTeam = teamRatings[ownTeam]
            const rOpp = teamRatings[flipTeam(ownTeam)]

            const S = 100

            const expectedOutcome = 1 / (1 + Math.pow(10, (rOpp - rTeam) / S))

            const k = 100
            const outcomeDelta = (actualOutcome - expectedOutcome)
            const ratingChange = k * outcomeDelta
            const newRating = rOwn + ratingChange
            newRatings[player] = newRating

            console.log(`${names[player]}, overall margin ${overallMargin}, expected outcome ${expectedOutcome}, actual outcome ${actualOutcome}, rating change ${ratingChange} (${rOwn} -> ${newRating})`)
        })

        ratings = {...ratings, ...newRatings}
    }

    console.log("Final ratings:")
    _.forEach(ratings, (rating, discordId) => {
        console.log(`${names[discordId]}: ${rating}`)
    })

})


(async () => {
    await backloadRatings()
})()
