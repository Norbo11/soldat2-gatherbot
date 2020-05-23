const state = require("../state/state.js")
const _ = require("lodash")

module.exports = {
    aliases: ['del', 'remove'],
    description: 'Remove yourself from the gather queue.',
    execute(client, message, args) {
        _.remove(state.currentQueue, (x) => x === message.author)
        state.displayQueue(message)
    },
};
