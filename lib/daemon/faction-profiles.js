// /lib/daemon/faction-profiles.js

export const HACKING_FACTION_PROFILES = [
    profile("CyberSec", "hacking", { 4: 100, 2: 30, default: 60 }, {
        hacking: 50,
        backdoor: true,
        server: "CSEC",
    }),
    profile("NiteSec", "hacking", { 4: 95, 2: 40, default: 60 }, {
        hacking: 200,
        backdoor: true,
        server: "avmnite-02h",
        homeRam: 32,
    }),
    profile("The Black Hand", "hacking", { 4: 90, 2: 60, default: 65 }, {
        hacking: 300,
        backdoor: true,
        server: "I.I.I.I",
        homeRam: 64,
    }),
    profile("BitRunners", "hacking", { 4: 100, 2: 60, default: 75 }, {
        hacking: 500,
        backdoor: true,
        server: "run4theh111z",
        homeRam: 128,
    }),
];

export const EARLY_FACTION_PROFILES = [
    profile("Tian Di Hui", "hacking", { 4: 75, 2: 30, default: 50 }, {
        hacking: 50,
        travel: "Chongqing",
        money: 1_000_000,
    }),
    profile("Netburners", "hacking", { 4: 80, 2: 20, default: 55 }, {
        hacking: 80,
        hacknetLevels: 100,
        hacknetRam: 8,
        hacknetCores: 4,
    }),
];

export const CITY_FACTION_PROFILES = [
    city("Sector-12", "general", 15_000_000, { 4: 40, 2: 30, default: 50 }),
    city("Aevum", "general", 40_000_000, { 4: 40, 2: 30, default: 50 }),
    city("Volhaven", "general", 50_000_000, { 4: 35, 2: 30, default: 45 }),
    city("Chongqing", "hacking", 20_000_000, { 4: 70, 2: 30, default: 45 }),
    city("New Tokyo", "hacking", 20_000_000, { 4: 65, 2: 30, default: 45 }),
    city("Ishima", "hacking", 30_000_000, { 4: 60, 2: 30, default: 45 }),
];

export const CRIMINAL_FACTION_PROFILES = [
    profile("Slum Snakes", "crime", { 4: 20, 2: 100, default: 30 }, {
        money: 1_000_000,
        karma: -9,
        combat: 30,
    }),
    profile("Tetrads", "crime", { 4: 20, 2: 95, default: 30 }, {
        travel: "Chongqing",
        karma: -18,
        combat: 75,
    }),
    profile("Silhouette", "crime", { 4: 25, 2: 80, default: 35 }, {
        money: 15_000_000,
        karma: -22,
        companyRole: "executive",
    }),
    profile("Speakers for the Dead", "combat", { 4: 20, 2: 100, default: 35 }, {
        hacking: 100,
        karma: -45,
        combat: 300,
        kills: 30,
        notWorkingFor: ["CIA", "NSA"],
    }),
    profile("The Dark Army", "combat", { 4: 25, 2: 100, default: 40 }, {
        hacking: 300,
        travel: "Chongqing",
        karma: -45,
        combat: 300,
        kills: 5,
        notWorkingFor: ["CIA", "NSA"],
    }),
    profile("The Syndicate", "crime", { 4: 20, 2: 95, default: 35 }, {
        hacking: 200,
        travel: "Aevum",
        money: 10_000_000,
        karma: -90,
        combat: 200,
        notWorkingFor: ["CIA", "NSA"],
    }),
];

export const MEGACORP_FACTION_PROFILES = [
    corp("ECorp"),
    corp("MegaCorp"),
    corp("Bachman & Associates"),
    corp("Blade Industries"),
    corp("NWO"),
    corp("Clarke Incorporated"),
    corp("OmniTek Incorporated"),
    corp("Four Sigma"),
    corp("KuaiGong International"),
    corp("Fulcrum Secret Technologies", {
        hacking: 1000,
        backdoor: true,
        server: "fulcrumassets",
    }),
];

export const ENDGAME_FACTION_PROFILES = [
    profile("The Covenant", "endgame", { 4: 90, 2: 80, default: 90 }, {
        augmentations: 20,
        money: 75_000_000_000,
        hacking: 850,
        combat: 850,
    }),
    profile("Daedalus", "endgame", { 4: 100, 2: 90, default: 100 }, {
        augmentations: 30,
        money: 100_000_000_000,
        hacking: 2500,
        combatAlternative: 1500,
    }),
    profile("Illuminati", "endgame", { 4: 90, 2: 90, default: 95 }, {
        augmentations: 30,
        money: 150_000_000_000,
        hacking: 1500,
        combat: 1200,
    }),
];

export const LATE_SPECIAL_FACTION_PROFILES = [
    profile("Bladeburners", "bladeburner", { 6: 100, default: 10 }, {
        later: true,
        note: "Handle after Bladeburner system exists.",
    }),
    profile("Church of the Machine God", "stanek", { 13: 100, default: 10 }, {
        later: true,
        note: "Handle after Stanek/BN13 planning exists.",
    }),
    profile("Shadows of Anarchy", "bladeburner", { 6: 100, default: 10 }, {
        later: true,
        note: "Handle after Bladeburner system exists.",
    }),
];

export const ALL_FACTION_PROFILES = [
    ...HACKING_FACTION_PROFILES,
    ...EARLY_FACTION_PROFILES,
    ...CITY_FACTION_PROFILES,
    ...CRIMINAL_FACTION_PROFILES,
    ...MEGACORP_FACTION_PROFILES,
    ...ENDGAME_FACTION_PROFILES,
    ...LATE_SPECIAL_FACTION_PROFILES,
];

function city(faction, theme, money, priorityByBitNode) {
    return profile(faction, theme, priorityByBitNode, {
        travel: faction,
        money,
    });
}

function corp(faction, extraRequirements = {}) {
    return profile(faction, "company", { 4: 35, 2: 30, default: 45 }, {
        company: faction,
        companyRep: 200_000,
        ...extraRequirements,
    });
}

function profile(faction, theme, priorityByBitNode, requirements = {}) {
    return {
        faction,
        theme,
        source: "manual-profile",
        priorityByBitNode,
        requirements: {
            hacking: null,
            backdoor: false,
            server: null,
            travel: null,
            money: null,
            karma: null,
            combat: null,
            combatAlternative: null,
            company: null,
            companyRep: null,
            companyRole: null,
            augmentations: null,
            kills: null,
            homeRam: null,
            hacknetLevels: null,
            hacknetRam: null,
            hacknetCores: null,
            notWorkingFor: null,
            later: false,
            note: null,
            ...requirements,
        },
        augmentations: [],
    };
}