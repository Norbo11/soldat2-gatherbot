const _ = require("lodash")


const SOLDAT_EVENTS = {
    FLAG_CAP: "FLAG_CAP",
    GATHER_PAUSE: "GATHER_PAUSE",
    GATHER_UNPAUSE: "GATHER_UNPAUSE",
    PLAYER_KILL: "PLAYER_KILL"
}

const SOLDAT_TEAMS = {
    BLUE: "Blue",
    RED: "Red",
    TIE: "Tie",
}

// The IDs here are arbitrary - they don't necessarily match whatever IDs the game uses
const SOLDAT_WEAPONS = {
    DESERT_EAGLES: {
        id: "1",
        formattedName: "Desert Eagles"
    },
    HK_MP5: {
        id: "2",
        formattedName: "HK MP5"
    },
    AK_74: {
        id: "3",
        formattedName: "Ak-74"
    },
    STEYR_AUG: {
        id: "4",
        formattedName: "Steyr AUG"
    },
    SPAS_12: {
        id: "5",
        formattedName: "Spas-12"
    },
    RUGER_77: {
        id: "6",
        formattedName: "Ruger 77"
    },
    M79: {
        id: "7",
        formattedName: "M79"
    },
    BARRET_M82A1: {
        id: "8",
        formattedName: "Barrett M82A1"
    },
    FN_MINIMI: {
        id: "9",
        formattedName: "FN Minimi"
    },
    XM214_MINIGUN: {
        id: "10",
        formattedName: "XM214 Minigun"
    },
    USSOCOM: {
        id: "11",
        formattedName: "USSOCOM"
    },
    COMBAT_KNIFE: {
        id: "12",
        formattedName: "Combat Knife"
    },
    CHAINSAW: {
        id: "13",
        formattedName: "Chainsaw"
    },
    M72_LAW: {
        id: "14",
        formattedName: "LAW"
    },
    HANDS: {
        id: "15",
        formattedName: "Hands"
    },
    GRENADE: {
        id: "16",
        formattedName: "Grenade"
    },
}

const IN_GAME_STATES = {
    NO_GATHER: "NO_GATHER",
    GATHER_STARTED: "GATHER_STARTED",
}

const NOT_AUTHED_KICK_TIMER_SECONDS = 60


getWeaponById = (id) => {
    const key = _.findKey(SOLDAT_WEAPONS, weapon => weapon.id === id)
    return SOLDAT_WEAPONS[key]
}

getWeaponByFormattedName = (formattedName) => {
    const key = _.findKey(SOLDAT_WEAPONS, weapon => weapon.formattedName.toUpperCase().startsWith(formattedName.toUpperCase()))
    return SOLDAT_WEAPONS[key]
}

module.exports = {
    SOLDAT_EVENTS, SOLDAT_WEAPONS, IN_GAME_STATES, NOT_AUTHED_KICK_TIMER_SECONDS, SOLDAT_TEAMS,
    getWeaponById, getWeaponByFormattedName
}
