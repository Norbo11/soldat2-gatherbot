import _ from 'lodash';


const SOLDAT_EVENTS = {
    FLAG_CAP: "FLAG_CAP",
    GATHER_PAUSE: "GATHER_PAUSE",
    GATHER_UNPAUSE: "GATHER_UNPAUSE",
    PLAYER_KILL: "PLAYER_KILL",
    BASE_CAPTURE: "BASE_CAPTURE"
}

const SOLDAT_TEAMS = {
    BLUE: "Blue",
    RED: "Red",
    TIE: "Tie",
}

const getSoldatTeamById = (id) => {
    return id === "0" ? SOLDAT_TEAMS.BLUE : SOLDAT_TEAMS.RED
}

const GAME_MODES = {
    CAPTURE_THE_FLAG: "CaptureTheFlag",
    CAPTURE_THE_BASES: "CaptureTheBases"
}


const formatGameMode = (gameMode) => {
    if (gameMode === GAME_MODES.CAPTURE_THE_FLAG) {
        gameMode = "Capture The Flag"
    } else {
        gameMode = "Capture The Bases"
    }
    return gameMode
}

// The IDs here are arbitrary - they don't necessarily match whatever IDs the game uses
const SOLDAT_WEAPONS = {
    BARRETT: {
        id: "1",
        formattedName: "Barrett"
    },
    CHAINSAW: {
        id: "2",
        formattedName: "Chainsaw"
    },
    DRAGUNOV: {
        id: "3",
        formattedName: "Dragunov"
    },
    FLAK_CANNON: {
        id: "4",
        formattedName: "FlakCannon"
    },
    KALASHNIKOV: {
        id: "5",
        formattedName: "Kalashnikov"
    },
    KNIFE: {
        id: "6",
        formattedName: "Knife"
    },
    M79: {
        id: "7",
        formattedName: "M79"
    },
    MAKAROV: {
        id: "8",
        formattedName: "Makarov"
    },
    MINIGUN: {
        id: "9",
        formattedName: "Minigun"
    },
    MP5: {
        id: "10",
        formattedName: "MP5"
    },
    RHEINMETALL: {
        id: "11",
        formattedName: "Rheinmetall"
    },
    SPAS12: {
        id: "12",
        formattedName: "Spas12"
    },
    TEC9: {
        id: "13",
        formattedName: "Tec-9"
    },
    HANDS: {
        id: "14",
        formattedName: "Melee"
    },
    GRENADE: {
        id: "15",
        formattedName: "RGD5"
    },
    // This shows up when you kill yourself or use the respawn button
    NA: {
        id: "16",
        formattedName: "N/A"
    },
}

const IN_GAME_STATES = {
    NO_GATHER: "NO_GATHER",
    GATHER_STARTED: "GATHER_STARTED",
}


const getWeaponById = (id) => {
    const key = _.findKey(SOLDAT_WEAPONS, weapon => weapon.id === id)
    return SOLDAT_WEAPONS[key]
}

const getWeaponByFormattedName = (formattedName) => {
    const key = _.findKey(SOLDAT_WEAPONS, weapon => weapon.formattedName.toUpperCase().startsWith(formattedName.toUpperCase()))
    return SOLDAT_WEAPONS[key]
}

export default {
    SOLDAT_EVENTS, SOLDAT_WEAPONS, IN_GAME_STATES, SOLDAT_TEAMS, GAME_MODES,
    getWeaponById, getWeaponByFormattedName, formatGameMode, getSoldatTeamById
};
