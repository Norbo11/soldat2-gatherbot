import constants from '../game/constants';
import glob from 'glob';
import _ from 'lodash';

const GAME_MODES = constants.GAME_MODES


const getMapsForGameMode = (gameMode) => {
    const mapFiles = _.map(glob.sync(process.env.MAPS_FOLDER + "/**/*.json"), file => file.substring(file.lastIndexOf("/") + 1).replace(".json", ""))
    const prefix = gameMode === GAME_MODES.CAPTURE_THE_FLAG ? "ctf" : "ctb"
    return _.filter(mapFiles, file => file.startsWith(prefix))
}


const verifyMap = (mapName, gameMode) => {
    const maps = getMapsForGameMode(gameMode)
    return _.includes(maps, mapName)
}


export default {
    getMapsForGameMode, verifyMap
};
