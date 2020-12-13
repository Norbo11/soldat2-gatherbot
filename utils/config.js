import fs from "fs"

export const readBotConfig = () => {
    const contents = fs.readFileSync(process.env.CONFIG_PATH)
    const config = JSON.parse(contents)
    return config
}