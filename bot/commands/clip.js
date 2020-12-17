import {formatClip} from "../game/statsFormatting";

export default {
    aliases: ["clip", "clips"],
    description: "Manage video clips from gathers.",
    execute(client, message, args) {

        if (args.length === 0) {
            currentClipManager.getRandomClip().then(clip => {
                // Can be null if no clips are added
                if (clip !== null) {
                    message.channel.send(formatClip(clip))
                }
            })

            return
        } else if (args.length === 1) {
            const clipId = parseInt(args[0])

            currentClipManager.getClip(clipId).then(clip => {
                if (clip === null) {
                    message.reply(`No clip with ID #${clipId} found.`)
                } else {
                    message.channel.send(formatClip(clip))
                }
            })

            return
        } else if (args.length === 2) {
            const command = args[0]

            if (command.toLowerCase() === "add") {
                const clipUrl = args[1]

                if (clipUrl.length > 500) {
                    message.reply("clip URL can be a maximum of 500 characters.")
                    return
                }

                currentClipManager.addClip(message.author.id, clipUrl).then((id) => {
                    message.reply(`clip #${id} added.`)
                })
                return

            } else if (command.toLowerCase() === "remove" || command.toLowerCase() === "delete") {
                const clipId = parseInt(args[1])

                currentClipManager.deleteClip(clipId).then(result => {
                    if (result.deletedCount === 1) {
                        message.reply(`deleted clip with ID ${clipId}.`)
                    } else if (result.deletedCount === 0) {
                        message.reply(`clip with ID ${clipId} does not exist.`)
                    } else {
                        throw new Error(`Deleted more than 1 clip with ID ${clipId}, should not happen!`)
                    }
                })

                return
            }
        }

        message.reply("command format: `!clip` for a random clip, `!clip [id]` for a particular clip, `!clip add [url]` to add new clips or `!clip remove [id]` to delete them.")
    },
};
