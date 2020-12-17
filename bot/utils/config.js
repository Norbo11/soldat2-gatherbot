import fs from "fs"

export const SERVER_STRATEGIES = {
    RUN_SERVER_WITH_FRESH_CREDENTIALS: "RUN_SERVER_WITH_FRESH_CREDENTIALS",
    ASSUME_SERVER_RUNNING_WITH_FIXED_CREDENTIALS: "ASSUME_SERVER_RUNNING_WITH_FIXED_CREDENTIALS",
}

export const readBotConfig = () => {
    const contents = fs.readFileSync(process.env.CONFIG_PATH)
    const config = JSON.parse(contents)
    return config
}