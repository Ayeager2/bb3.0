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

const TARGET_TIERS = {
    [TARGET_TIER.BEGINNER]: new Set([
        "n00dles",
        "foodnstuff",
        "sigma-cosmetics",
    ]),

    [TARGET_TIER.EARLY]: new Set([
        "joesguns",
        "hong-fang-tea",
        "harakiri-sushi",
        "iron-gym",
        "max-hardware",
        "zer0",
        "nectar-net",
    ]),

    [TARGET_TIER.MID]: new Set([
        "neo-net",
        "phantasy",
        "omega-net",
        "silver-helix",
        "the-hub",
        "rho-construction",
        "johnson-ortho",
        "crush-fitness",
        "avmnite-02h",
    ]),

    [TARGET_TIER.LATE]: new Set([
        "computek",
        "netlink",
        "I.I.I.I",
        "summit-uni",
        "catalyst",
        "syscore",
        "zb-institute",
        "lexo-corp",
        "global-pharm",
        "omnia",
        "solaris",
        "taiyang-digital",
        "run4theh111z",
    ]),

    [TARGET_TIER.ENDGAME]: new Set([
        "ecorp",
        "megacorp",
        "nwo",
        "blade",
        "clarkinc",
        "omnitek",
        "4sigma",
        "kuai-gong",
        "fulcrumtech",
        "fulcrumassets",
        "The-Cave",
    ]),

    [TARGET_TIER.SPECIAL]: new Set([
        "CSEC",
        "darkweb",
        "w0r1d_d43m0n",
        "home",
    ]),
};

export function getTargetTier(server) {
    for (const [tier, servers] of Object.entries(TARGET_TIERS)) {
        if (servers.has(server)) return tier;
    }

    return TARGET_TIER.UNKNOWN;
}

export function isTargetAllowedForMode(
    ns,
    server,
    mode = "money"
) {
    const hacking = ns.getHackingLevel();
    const tier = getTargetTier(server);

    if (tier === TARGET_TIER.SPECIAL) {
        return false;
    }

    if (mode === "bootstrap") {
        return true;
    }

    if (mode === "exp") {
        if (hacking < 250) {
            return true;
        }

        if (hacking < 750) {
            return tier !== TARGET_TIER.BEGINNER;
        }

        if (hacking < 1500) {
            return ![
                TARGET_TIER.BEGINNER,
                TARGET_TIER.EARLY,
            ].includes(tier);
        }

        return ![
            TARGET_TIER.BEGINNER,
            TARGET_TIER.EARLY,
        ].includes(tier);
    }

    if (mode === "prep") {
        if (hacking < 250) {
            return true;
        }

        if (hacking < 750) {
            return tier !== TARGET_TIER.BEGINNER;
        }

        return ![
            TARGET_TIER.BEGINNER,
            TARGET_TIER.EARLY,
        ].includes(tier);
    }

    if (mode === "progression") {
        if (hacking < 250) {
            return true;
        }

        if (hacking < 750) {
            return tier !== TARGET_TIER.BEGINNER;
        }

        return ![
            TARGET_TIER.BEGINNER,
            TARGET_TIER.EARLY,
        ].includes(tier);
    }

    if (mode === "money") {
        if (hacking < 250) {
            return true;
        }

        if (hacking < 750) {
            return tier !== TARGET_TIER.BEGINNER;
        }

        return ![
            TARGET_TIER.BEGINNER,
            TARGET_TIER.EARLY,
        ].includes(tier);
    }

    return true;
}

export function filterTargetsByMode(
    ns,
    servers,
    mode = "money"
) {
    return [...servers].filter(server =>
        isTargetAllowedForMode(
            ns,
            server,
            mode
        )
    );
}