const logger = require("../utils/logger")

module.exports = {
    aliases: ["trueskill", "ratings", "ratinghelp"],
    description: "Show a help message about the rating system.",
    execute(client, message, args) {
        const helpMessage = "Soldat 2 Gather uses the **TrueSkill** rating system in order to rank players. " +
            "A player's rating is composed of two numbers:\n" +
            "- **Skill (S)**: a number between 0 and 100 which denotes the skill of the player, relative to all other players.\n" +
            "- **Uncertainty (U)**: a number, in the same units as Skill, which denotes how 'unsure' the system is that their Skill " +
            "is a true representation of how they actually play.\n" +
            "The 'true skill' of the player is then believed to between **[S - 3U, S + 3U]**. " +
            "For example, a new player starts with a Skill of **50.0** and an Uncertainty of **16.67**. This means the system currently " +
            "thinks the player's true skill is anywhere between 0-100 (which makes sense, as we know nothing about them).\n" +
            "As the player plays their first games, TrueSkill learns about the player by adjusting their Skill and Uncertainty values to reflect " +
            "what happened in their matches. For example, winning against highly skilled players will cause their Skill to go up and their " +
            "Uncertainty to go down; e.g., they may reach an S of 70 and a U of 5, putting their true skill level anywhere between " +
            "55 and 85. \n"

        const helpMessage2 =
            "A player with a lot of games will have a much lower uncertainty and therefore a tighter interval around their " +
            "true skill. Unsurprising results will result in small skill adjustments. Surprising results, e.g. " +
            "weak players beating better players, will result in large skill adjustments. Uncertainty usually reflects " +
            "how many games a player has played, although we plan at some point to periodically increase Uncertainty for all players who " +
            "haven't played for a long time.\n" +
            "The **Skill Estimate** seen on some bot commands is displaying the lower-end of the confidence interval (S - 3U) and " +
            "this is used to conservatively rank players on leaderboards. Player skills are distributed around a " +
            "normal bell-curve distribution, which means that the skill difference between levels 50 and 60 is much lower " +
            "than the skill difference between levels 60 and 70. \n" +
            "We use TrueSkill ratings to balance teams by maximising the probability that the match ends in a draw."

        message.channel.send(helpMessage)
        message.channel.send(helpMessage2)
    },
};
