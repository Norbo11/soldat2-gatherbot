const _ = require("lodash")

// The IDs here must match the IDs in the TTW script
const TTW_CLASSES = {
    LONG_RANGE_INFANTRY: {
        id: "1",
        name: "LONG_RANGE_INFANTRY",
        aliases: ["LONG", "LRI"],
        formattedName: "Long Range Infantry",
    },
    SHORT_RANGE_INFANTRY: {
        id: "2",
        name: "SHORT_RANGE_INFANTRY",
        aliases: ["SHORT", "SRI"],
        formattedName: "Short Range Infantry",
    },
    MEDIC: {
        id: "3",
        name: "MEDIC",
        aliases: ["MEDIC", "MED", "DOC"],
        formattedName: "General",
    },
    GENERAL: {
        id: "4",
        name: "GENERAL",
        aliases: ["GENERAL", "GEN"],
        formattedName: "General",
    },
    RADIOMAN: {
        id: "5",
        name: "RADIOMAN",
        aliases: ["RADIOMAN", "RAD"],
        formattedName: "Radioman",
    },
    SABOTEUR: {
        id: "6",
        name: "SABOTEUR",
        aliases: ["SABOTEUR", "SABO"],
        formattedName: "Saboteur",
    },
    ENGINEER: {
        id: "7",
        name: "ENGINEER",
        aliases: ["ENGINEER", "ENG"],
        formattedName: "Engineer",
    },
    ELITE: {
        id: "8",
        name: "ELITE",
        aliases: ["ELITE", "ELI", "SNIPER", "SNIP"],
        formattedName: "Elite",
    },
    SPY: {
        id: "9",
        name: "SPY",
        aliases: ["SPY"],
        formattedName: "Spy",
    },
    ARTILLERY: {
        id: "10",
        name: "ARTILLERY",
        aliases: ["ARTILLERY", "ART"],
        formattedName: "Artillery",
    },
}

const TTW_EVENTS = {
    PLAYER_CLASS_SWITCH: "PLAYER_CLASS_SWITCH",
    FLAG_CAP: "FLAG_CAP",
    GATHER_PAUSE: "GATHER_PAUSE",
    GATHER_UNPAUSE: "GATHER_UNPAUSE",
    BUNKER_CONQUER: "BUNKER_CONQUER",
    PLAYER_KILL: "PLAYER_KILL"
}

getClassById = (id) => {
    const key = _.findKey(TTW_CLASSES, ttwClass => ttwClass.id === id)
    return TTW_CLASSES[key]
}

const TEAMS = {
    "1": "Red",
    "2": "Blue"
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

getWeaponByFormattedName = (formattedName) => {
    const key = _.findKey(SOLDAT_WEAPONS, weapon => weapon.formattedName.toUpperCase().startsWith(formattedName.toUpperCase()))
    return SOLDAT_WEAPONS[key]
}

getWeaponById = (id) => {
    const key = _.findKey(SOLDAT_WEAPONS, weapon => weapon.id === id)
    return SOLDAT_WEAPONS[key]
}

const MAPS_LIST = [
    "ttw_42ndWood", "ttw_Borderwars", "ttw_Concrete", "ttw_Forgotten", "ttw_Junkyard", "ttw_Mudder", "ttw_rime", "ttw_Take", "ttw_Village",
    "ttw_Afrique", "ttw_Bridge", "ttw_crater", "ttw_Fort", "ttw_kaibatsu", "ttw_Myst2", "ttw_Rime", "ttw_Tenshin2", "ttw_Waste",
    "ttw_afterGlory", "ttw_cadet", "ttw_crecent", "ttw_fortress", "ttw_kamiquasi", "ttw_Myst", "ttw_Tenshin", "ttw_WIP",
    "ttw_Alize", "ttw_Caen", "ttw_Creek", "ttw_Frostbite", "ttw_Kampfer", "ttw_NewNature", "ttw_rover", "ttw_Teroya", "ttw_Ypres-fix",
    "ttw_redthing", "ttw_Cangaceiros", "ttw_crimson", "ttw_frost", "ttw_Krath", "ttw_Nomans", "ttw_shaft", "ttw_tower",
    "ttw_Anoxi", "ttw_cannibals", "ttw_Dawn", "ttw_generic", "ttw_Limbo", "ttw_nworld", "ttw_Skybridge", "ttw_Toxic",
    "ttw_art", "ttw_castle", "ttw_desert", "ttw_Gloryhill", "ttw_marsh", "ttw_paperwar", "ttw_Skyscrapers", "ttw_Trainyards", "ttw_Ypres_n",
    "ttw_Autumn", "ttw_Cathedral", "ttw_Drain", "ttw_Grasshill", "ttw_meteorite", "ttw_Pinewood", "ttw_SoldiersFoly", "ttw_Untitled3", "ttw_Ypres",
    "ttw_Bachvu", "ttw_ColdMorning", "ttw_El_Alamein", "ttw_hue", "ttw_Mound", "Kopia", "ttw_Plat", "ttw_storm", "ttw_Valley",
    "ttw_BattleField", "ttw_ColdMorning.old", "ttw_Forest", "ttw_Junkyard2", "ttw_Mound", "ttw_Rage", "ttw_Struggle", "ttw_Verdun"
]


const IN_GAME_STATES = {
    NO_GATHER: "NO_GATHER",
    GATHER_PRE_RESET: "GATHER_PRE_RESET",
    GATHER_STARTED: "GATHER_STARTED",
}

const NOT_AUTHED_KICK_TIMER_SECONDS = 60

module.exports = {
    TTW_EVENTS, TTW_CLASSES, SOLDAT_WEAPONS, MAPS_LIST, IN_GAME_STATES, NOT_AUTHED_KICK_TIMER_SECONDS, TEAMS,
    getWeaponById, getWeaponByFormattedName, getClassById
}
