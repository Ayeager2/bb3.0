const DEFAULT_MAX_PRICE = 1000000000000;

export const BITNODE_STRATEGIES = {
    9: {
        name: "BN9 Hacknet / Hash Economy",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            hacknet: 160,
            hacking: 45,
            hacking_exp: 35,
            faction_rep: 70,
            money: 50,
            company_rep: 15,
            charisma: 15,
            combat: 5,
            crime: 5,
            bladeburner: 0,
            misc: 5,
        },
    },

    4: {
        name: "BN4 Singularity / Hacking",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            hacking: 100,
            hacking_exp: 90,
            faction_rep: 85,
            money: 55,
            company_rep: 20,
            charisma: 15,
            combat: 8,
            crime: 5,
            hacknet: 5,
            bladeburner: 0,
            misc: 5,
        },
    },

    default: {
        name: "Balanced",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            hacking: 70,
            hacking_exp: 60,
            faction_rep: 65,
            money: 55,
            company_rep: 35,
            charisma: 25,
            combat: 30,
            crime: 30,
            hacknet: 20,
            bladeburner: 0,
            misc: 5,
        },
    },
};

export function getBitNodeAugmentationStrategy(bitNode) {
    return BITNODE_STRATEGIES[bitNode] ?? BITNODE_STRATEGIES.default;
}

export function scoreAugmentation(item, strategy) {
    const statBreakdown = getStatBreakdown(item.stats ?? {}, strategy.statWeights);
    const statScore = Object.values(statBreakdown).reduce((sum, value) => sum + value, 0);
    const strategicScore = scoreStrategicValue(item.name, item, strategy);

    const pricePenalty = Math.log10(Math.max(10, item.price ?? 10)) * 8;
    const repPenalty = Math.log10(Math.max(10, item.rep ?? 10)) * 3;

    return {
        score: statScore + strategicScore - pricePenalty - repPenalty,
        statBreakdown,
        statScore,
        strategicScore,
        pricePenalty,
        repPenalty,
        priorityClass: getAugPriorityClass(statBreakdown),
    };
}

export function scorePendingAugmentations(pending = [], bitNode = 1) {
    const strategy = getBitNodeAugmentationStrategy(bitNode);

    const scored = pending.map(aug => {
        const score = scoreAugmentation(aug, strategy);

        return {
            ...aug,
            ...score,
        };
    });

    const totalScore = scored.reduce((sum, aug) => sum + Math.max(0, aug.score ?? 0), 0);
    const highImpact = scored.filter(aug => {
        const name = String(aug.name).toLowerCase();

        if (name.includes("neuroflux")) return false;
        if (name.includes("red pill")) return true;

        return (aug.priorityClass ?? 0) >= 3;
    });

    return {
        strategy,
        totalScore,
        highImpactScore: highImpact.reduce((sum, aug) => sum + Math.max(0, aug.score ?? 0), 0),
        highImpact,
        scored,
    };
}

export function getStatBreakdown(stats, weights) {
    const result = {
        hacking: 0,
        hacking_exp: 0,
        faction_rep: 0,
        money: 0,
        company_rep: 0,
        charisma: 0,
        combat: 0,
        crime: 0,
        hacknet: 0,
        bladeburner: 0,
        misc: 0,
    };

    for (const [rawKey, rawValue] of Object.entries(stats ?? {})) {
        if (typeof rawValue !== "number") continue;
        if (rawValue <= 1) continue;

        const key = rawKey.toLowerCase();
        const gain = rawValue - 1;
        const category = getStatCategory(key);
        const weight = weights[category] ?? weights.misc ?? 0;

        result[category] += gain * weight * 100;
    }

    return result;
}

export function getAugPriorityClass(breakdown = {}) {
    if ((breakdown.hacking ?? 0) > 0 || (breakdown.hacking_exp ?? 0) > 0) return 4;
    if ((breakdown.faction_rep ?? 0) > 0) return 3;
    if ((breakdown.money ?? 0) > 0) return 2;
    if ((breakdown.company_rep ?? 0) > 0) return 1;
    return 0;
}

function scoreStrategicValue(name, item, strategy) {
    let score = 0;
    const lower = String(name).toLowerCase();

    if (lower.includes("red pill")) score += 5000;
    if (lower.includes("bitwire")) score += 400;
    if (lower.includes("cranial")) score += 350;
    if (lower.includes("synaptic")) score += 300;
    if (lower.includes("neurotrainer")) score += 250;
    if (lower.includes("datajack")) score += 250;

    if (item.theme === "hacking") score += strategy.statWeights.hacking ?? 0;
    if (item.theme === "crime") score += strategy.statWeights.crime ?? 0;
    if (item.theme === "combat") score += strategy.statWeights.combat ?? 0;
    if (item.theme === "company") score += strategy.statWeights.company_rep ?? 0;

    return score;
}

function getStatCategory(key) {
    if (key.includes("hacknet")) return "hacknet";
    if (key.includes("bladeburner")) return "bladeburner";
    if (key.includes("hacking_exp") || key.includes("hackingexp")) return "hacking_exp";
    if (key.includes("hacking") || key.includes("hack")) return "hacking";
    if (key.includes("faction")) return "faction_rep";
    if (key.includes("company")) return "company_rep";
    if (key.includes("charisma")) return "charisma";
    if (key.includes("crime")) return "crime";
    if (key.includes("strength") || key.includes("defense") || key.includes("dexterity") || key.includes("agility")) return "combat";
    if (key.includes("money") || key.includes("cash")) return "money";
    return "misc";
}
