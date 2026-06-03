// /lib/daemon/target-tiers.js

export const TARGET_TIER = {
    BEGINNER: "BEGINNER",
    EARLY: "EARLY",
    MID: "MID",
    LATE: "LATE",
    ENDGAME: "ENDGAME",
    SPECIAL: "SPECIAL",
    UNKNOWN: "UNKNOWN",
};

export const TARGET_LANE = {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    MONEY: "money",
    EXP: "exp",
    PREP: "prep",
};

const TARGET_TIERS = {
    [TARGET_TIER.BEGINNER]: new Set(["n00dles", "foodnstuff", "sigma-cosmetics"]),
    [TARGET_TIER.EARLY]: new Set(["joesguns", "hong-fang-tea", "harakiri-sushi", "iron-gym", "max-hardware", "zer0", "nectar-net"]),
    [TARGET_TIER.MID]: new Set(["neo-net", "phantasy", "omega-net", "silver-helix", "the-hub", "rho-construction", "johnson-ortho", "crush-fitness", "avmnite-02h"]),
    [TARGET_TIER.LATE]: new Set(["computek", "netlink", "I.I.I.I", "summit-uni", "catalyst", "syscore", "zb-institute", "lexo-corp", "global-pharm", "omnia", "solaris", "taiyang-digital", "run4theh111z"]),
    [TARGET_TIER.ENDGAME]: new Set(["ecorp", "megacorp", "nwo", "blade", "clarkinc", "omnitek", "4sigma", "kuai-gong", "fulcrumtech", "fulcrumassets", "The-Cave"]),
    [TARGET_TIER.SPECIAL]: new Set(["CSEC", "darkweb", "w0r1d_d43m0n", "home"]),
};

export const PHASE_ALLOWED_TIERS = {
    bootstrap: [TARGET_TIER.BEGINNER, TARGET_TIER.EARLY],
    expansion: [TARGET_TIER.EARLY, TARGET_TIER.MID],
    scaling: [TARGET_TIER.MID, TARGET_TIER.LATE],
    progression: [TARGET_TIER.MID, TARGET_TIER.LATE, TARGET_TIER.ENDGAME],
    faction: [TARGET_TIER.LATE, TARGET_TIER.ENDGAME],
    "reset-prep": [TARGET_TIER.LATE, TARGET_TIER.ENDGAME],
    "destroy-node": [TARGET_TIER.ENDGAME],
};

export function getTargetTier(server) {
    for (const [tier, servers] of Object.entries(TARGET_TIERS)) {
        if (servers.has(server)) return tier;
    }

    return TARGET_TIER.UNKNOWN;
}

export function getAllowedTiersForLane(phase = "scaling", lane = TARGET_LANE.MONEY) {
    const base = PHASE_ALLOWED_TIERS[phase] ?? PHASE_ALLOWED_TIERS.scaling;

    if (lane === TARGET_LANE.EXP) {
        return uniqueTiers([
            ...base,
            TARGET_TIER.MID,
            TARGET_TIER.LATE,
        ]);
    }

    if (lane === TARGET_LANE.PREP) {
        return uniqueTiers([
            ...base,
            TARGET_TIER.MID,
            TARGET_TIER.LATE,
            TARGET_TIER.ENDGAME,
        ]);
    }

    return uniqueTiers(base);
}

export function isTargetAllowedForStrategy(server, {
    phase = "scaling",
    lane = TARGET_LANE.MONEY,
    allowUnknown = true,
} = {}) {
    const tier = getTargetTier(server);

    if (tier === TARGET_TIER.SPECIAL) return false;
    if (tier === TARGET_TIER.UNKNOWN) return allowUnknown;

    return getAllowedTiersForLane(phase, lane).includes(tier);
}

export function filterTargetsByStrategy(ns, servers, {
    phase = "scaling",
    lane = TARGET_LANE.MONEY,
    allowUnknown = true,
} = {}) {
    return [...(servers ?? [])].filter(server =>
        isTargetAllowedForStrategy(server, {
            phase,
            lane,
            allowUnknown,
        })
    );
}

function uniqueTiers(tiers) {
    return [...new Set(tiers)];
}