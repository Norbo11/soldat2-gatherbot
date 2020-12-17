export default {
    aliases: ["commands"],
    description: "View a list of commands.",
    execute(client, message, args) {
        const helpMessage = client.commands.map((command) => {
            const aliases = command.aliases.map(alias => `${process.env.PREFIX}${alias}`)
            return `**${aliases.join(", ")}**: ${command.description}`
        }).join("\n")

        message.channel.send(helpMessage)
    },
};
