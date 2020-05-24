const gather = require("../utils/gather.js")
const soldat = require("../utils/soldat")

module.exports = {
    aliases: ['size'],
    description: 'Get or set the gather size.',
    execute(client, message, args) {
        if (args.length === 0) {
            message.channel.send(`The current gather size is ${gather.gatherState.currentSize}`)
            return
        }

        const newSize = parseInt(args[0])

        if (newSize % 2 !== 0) {
            message.channel.send(`The gather size must be a multiple of 2.`)
            return
        }

        message.channel.send("Changing size, hang on...")

        soldat.soldatClient.write(`/gathersize ${newSize}\n`);
        soldat.soldatClient.write('/restart\n');
        soldat.soldatClient.write(`/say Gather size set to ${newSize}\n`);

        const listener = (data) => {
            const read = data.toString();

            if (read.match(/Initializing bunkers/)) {
                gather.gatherState.currentSize = newSize
                gather.gatherState.currentQueue = []
                gather.displayQueue(message)

                soldat.soldatClient.removeListener('data', listener)
            }
        }

        soldat.soldatClient.addListener('data', listener);

        setTimeout(() => {
            soldat.soldatClient.removeListener('data', listener)
        }, 7000)

    },
};