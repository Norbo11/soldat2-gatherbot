import pino from 'pino';
import pinoms from 'pino-multi-stream';
import pinoPretty from 'pino-pretty';
import fs from 'fs';

const streams = [
    {
        stream: fs.createWriteStream("./ttw-gatherbot.log", {
            flags: "a" // append mode
        }),
        level: "debug"
    },
    {
        stream: pinoms.prettyStream({
            prettyPrint: {
                levelFirst: true,
                colorize: true,
            },
            prettifier: pinoPretty
        }),
        level: "debug"
    }
]

const log = pino({
}, pinoms.multistream(streams))

export default {
    log
};