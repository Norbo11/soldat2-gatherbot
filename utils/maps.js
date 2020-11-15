const constants = require("../game/constants")
const glob = require("glob")
const _ = require("lodash")

const GAME_MODES = constants.GAME_MODES


getMapsForGameMode = (gameMode) => {
    const mapFiles = _.map(glob.sync(process.env.MAPS_FOLDER + "/**/*.json"), file => file.substring(file.lastIndexOf("/") + 1).replace(".json", ""))
    const prefix = gameMode === GAME_MODES.CAPTURE_THE_FLAG ? "ctf" : "ctb"
    return _.filter(mapFiles, file => file.startsWith(prefix))
}


verifyMap = (mapName, gameMode) => {
    const maps = getMapsForGameMode(gameMode)
    return _.includes(maps, mapName)
}


module.exports = {
    getMapsForGameMode, verifyMap
}
