const soldat = require('../utils/soldat')


module.exports = {
    aliases: ['map'],
    description: 'View or change the current map.',
    execute(client, message, args) {
        soldat.soldatClient.write(`/map ${args[0]}\n`);

        const listener = (data) => {
            const read = data.toString();

            if (read.match(/Map not found/)) {
                message.channel.send({
                    embed: {
                        color: 3447003,
                        description: "Map not found!",
                    }
                });

                soldat.soldatClient.removeListener('data', listener)
            }

            if (read.match(/Initializing bunkers/)) {
                const args = message.content.slice(5,).split(' ');
                message.channel.send({
                    embed: {
                        color: 3447003,
                        description: `Map changed to: **${args}**`,
                    }
                });

                soldat.soldatClient.removeListener('data', listener)
            }
        }

        soldat.soldatClient.addListener('data', listener);

        setTimeout(() => {
            soldat.soldatClient.removeListener('data', listener)
        }, 7000)
    },
};