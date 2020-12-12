import logger from '../utils/logger';

export default {
    aliases: ["help"],
    description: "Show a help message.",
    execute(client, message, args) {
        const helpMessage = "To play a gather, 4-8 people must !add. You will then be put into balanced teams and " +
            "receive the server IP via private message. Join the server, get into your team, and wait for the blue " +
            "team to pick the first map using the !map command. The red team picks the map for the second round. If it's " +
            "1-1, 1-0 or 0-0 at the end of the second round, decide on a tiebreaker map to play for the third and final round. " +
            "If you're playing Capture The Bases, it's impossible for a round to end in a tie, so there will always be a winner " +
            "of the whole gather. After the gather, check your stats with !stats, change game-mode with !mode, and !add to more gathers. Use " +
            "!commands for a full list of commands. Use !ratings for an explanation of our rating system."
        message.channel.send(helpMessage)
    },
};
