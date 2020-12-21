import {formatServersMessage} from '../utils/discord';

export default {
    aliases: ["server", "servers"],
    description: "Get the IP address of the server.",
    execute(client, message, args) {
        const servers = currentQueueManager.getAllServers()
        message.channel.send(formatServersMessage(servers)).catch((e) => console.error(e.response.body))
    },
};
