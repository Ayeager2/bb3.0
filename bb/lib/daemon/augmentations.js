//lib/daemon/augmentations.js
const AUGMENTATION_STATE_FILE = "/data/augmentation-state.txt";
const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";

import { getAugmentationStagePolicy } from "/lib/daemon/augmentation-stage-policy.js";

const DEFAULT_MAX_PRICE = 1_000_000_000_000; // 1t

const BITNODE_STRATEGIES = {
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
        },
    },

    2: {
        name: "BN2 Crime / Gang",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            combat: 100,
            crime: 100,
            money: 60,
            faction_rep: 55,
            hacking: 35,
            hacking_exp: 30,
            charisma: 25,
            company_rep: 10,
            hacknet: 5,
            bladeburner: 0,
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
        },
    },
};

export function buildAugmentationPlan(ns, options = {}) {
    const bitNode = getCurrentBitNode(ns);

    const strategy =
        BITNODE_STRATEGIES[bitNode] ??
        BITNODE_STRATEGIES.default;

    const maxPrice =
        options.maxPrice ??
        strategy.maxPrice ??
        DEFAULT_MAX_PRICE;

    const reserveMoney =
        options.reserveMoney ??
        1_000_000_000;

    const data = readJson(ns, AUGMENTATION_STATE_FILE);

    if (!data?.factions?.length) {
        return writePlan(ns, {
            updatedAt: Date.now(),
            bitNode,
            ready: false,
            strategy,
            nextGoal: null,
            blockedReason:
                "No augmentation-state.txt found. Run /tools/augmentation-data-builder.js --force",
            candidates: [],
        });
    }

    const money = ns.getPlayer().money;
    const spendable = Math.max(0, money - reserveMoney);
    const candidates = [];
    const ownedAugmentations = getOwnedAugmentationSet(ns);

    for (const faction of data.factions) {
        if (!faction.joined) continue;

        for (const aug of faction.augmentations ?? []) {
            if (shouldSkipAug(aug, maxPrice, ownedAugmentations)) continue;

            const live =
                getLiveAugmentationSnapshot(ns, faction.faction, aug.name);
            const price =
                live.price ?? aug.price;
            const rep =
                live.rep ?? aug.rep;
            const factionRep =
                live.factionRep ?? aug.factionRep;
            const hasRep = factionRep >= rep;
            const affordable = spendable >= price;
            const hasPrereqs = hasPrereqsMet(data, aug);

            const statScore = scoreStats(aug.stats ?? {}, strategy.statWeights);
            const strategicScore = scoreStrategicValue(aug.name, faction, aug, strategy);
            const readinessScore = scoreReadiness({ hasRep, affordable, hasPrereqs });
            const stagePolicy = getAugmentationStagePolicy({
                name: aug.name,
                faction: faction.faction,
            });
            const priorityClass = getAugPriorityClass({
                statBreakdown: getStatBreakdown(aug.stats ?? {}, strategy.statWeights),
            });
            const pricePenalty = Math.log10(Math.max(10, price)) * 8;
            const repPenalty = Math.log10(Math.max(10, rep)) * 3;

            const score =
                statScore +
                strategicScore +
                stagePolicy.priority +
                readinessScore -
                pricePenalty -
                repPenalty;

            candidates.push({
                name: aug.name,
                faction: faction.faction,
                theme: faction.theme,
                price,
                rep,
                factionRep,
                hasRep,
                affordable,
                hasPrereqs,
                prereqs: aug.prereqs ?? [],
                stats: aug.stats ?? {},
                statBreakdown: getStatBreakdown(aug.stats ?? {}, strategy.statWeights),
                priorityClass,
                stagePolicy,
                tags: aug.tags ?? [],
                score,
            });
        }
    }

    candidates.sort((a, b) => compareForPurchase(a, b, strategy));

    const forcedRedPill = getForcedRedPillGoal(ns);

    const nextGoal =
        forcedRedPill ??
        candidates[0] ??
        null;

    return writePlan(ns, {
        updatedAt: Date.now(),
        bitNode,
        strategy,
        money,
        reserveMoney,
        spendable,
        maxPrice,
        ready: !!nextGoal && nextGoal.hasRep && nextGoal.affordable && nextGoal.hasPrereqs,
        nextGoal,
        blockedReason: getBlockedReason(nextGoal),
        candidates: candidates.slice(0, 25),
    });
}

function shouldSkipAug(aug, maxPrice, ownedAugmentations = new Set()) {
    if (!aug) return true;
    if (aug.owned || aug.installed || aug.queued) return true;
    if (ownedAugmentations.has(aug.name)) return true;
    if (aug.name === "NeuroFlux Governor") return true;
    if (!Number.isFinite(aug.price) || aug.price <= 0) return true;
    // Do not skip expensive augments entirely.
    // Keep them visible as blocked goals unless they are absurdly beyond policy.
    if (aug.price > maxPrice * 10) return true;
    return false;
}

function compareForPurchase(a, b) {
    const aStage = a.stagePolicy?.priority ?? 0;
    const bStage = b.stagePolicy?.priority ?? 0;

    if (aStage !== bStage) return bStage - aStage;

    if (a.hasRep && !b.hasRep) return -1;
    if (!a.hasRep && b.hasRep) return 1;

    if (a.hasPrereqs && !b.hasPrereqs) return -1;
    if (!a.hasPrereqs && b.hasPrereqs) return 1;

    const aReady = a.hasRep && a.affordable && a.hasPrereqs;
    const bReady = b.hasRep && b.affordable && b.hasPrereqs;

    if (aReady && !bReady) return -1;
    if (!aReady && bReady) return 1;

    const aRepReadyMoneyBlocked = a.hasRep && !a.affordable && a.hasPrereqs;
    const bRepReadyMoneyBlocked = b.hasRep && !b.affordable && b.hasPrereqs;

    if (aRepReadyMoneyBlocked && !bRepReadyMoneyBlocked) return -1;
    if (!aRepReadyMoneyBlocked && bRepReadyMoneyBlocked) return 1;

    if ((aReady && bReady) || (aRepReadyMoneyBlocked && bRepReadyMoneyBlocked)) {
        const aClass = getAugPriorityClass(a);
        const bClass = getAugPriorityClass(b);

        if (aClass !== bClass) return bClass - aClass;

        return a.price - b.price;
    }

    return b.score - a.score;
}

function getAugPriorityClass(item) {
    const breakdown = item.statBreakdown ?? {};

    if ((breakdown.hacking ?? 0) > 0 || (breakdown.hacking_exp ?? 0) > 0) return 4;
    if ((breakdown.faction_rep ?? 0) > 0) return 3;
    if ((breakdown.money ?? 0) > 0) return 2;
    if ((breakdown.company_rep ?? 0) > 0) return 1;

    return 0;
}

function scoreReadiness(readiness) {
    let score = 0;

    if (readiness.hasRep) score += 500;
    if (readiness.affordable) score += 300;
    if (readiness.hasPrereqs) score += 200;

    return score;
}

function scoreStrategicValue(name, faction, aug, strategy) {
    let score = 0;
    const lower = String(name).toLowerCase();

    if (lower.includes("red pill")) score += 5000;
    if (lower.includes("bitwire")) score += 400;
    if (lower.includes("cranial")) score += 350;
    if (lower.includes("synaptic")) score += 300;
    if (lower.includes("neurotrainer")) score += 250;
    if (lower.includes("datajack")) score += 250;

    // Faction theme matters, but less than actual stats.
    if (faction.theme === "hacking") score += strategy.statWeights.hacking ?? 0;
    if (faction.theme === "crime") score += strategy.statWeights.crime ?? 0;
    if (faction.theme === "combat") score += strategy.statWeights.combat ?? 0;
    if (faction.theme === "company") score += strategy.statWeights.company_rep ?? 0;

    return score;
}

function scoreStats(stats, weights) {
    return Object.values(getStatBreakdown(stats, weights))
        .reduce((sum, value) => sum + value, 0);
}

function getStatBreakdown(stats, weights) {
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

function getStatCategory(key) {
    if (key.includes("hacknet")) return "hacknet";
    if (key.includes("bladeburner")) return "bladeburner";

    if (key.includes("hacking_exp") || key.includes("hackingexp")) return "hacking_exp";
    if (key.includes("hacking")) return "hacking";
    if (key.includes("hack")) return "hacking";

    if (key.includes("faction")) return "faction_rep";
    if (key.includes("company")) return "company_rep";

    if (key.includes("charisma")) return "charisma";
    if (key.includes("crime")) return "crime";

    if (
        key.includes("strength") ||
        key.includes("defense") ||
        key.includes("dexterity") ||
        key.includes("agility")
    ) {
        return "combat";
    }

    if (key.includes("money") || key.includes("cash")) return "money";

    return "misc";
}

function hasPrereqsMet(data, aug) {
    const prereqs = aug.prereqs ?? [];
    if (prereqs.length === 0) return true;

    const owned = new Set();

    for (const item of data.uniqueAugmentations ?? []) {
        if (item.owned || item.installed || item.queued) {
            owned.add(item.name);
        }
    }

    return prereqs.every(x => owned.has(x));
}

function getBlockedReason(goal) {
    if (!goal) return "No valid augmentation candidate found.";
    if (!goal.hasPrereqs) return `Missing prereq for ${goal.name}: ${goal.prereqs.join(", ")}`;
    if (!goal.hasRep) return `Need more rep with ${goal.faction}.`;
    if (!goal.affordable) return `Need more money for ${goal.name}.`;
    return "Ready to buy.";
}

function writePlan(ns, plan) {
    ns.write(AUGMENTATION_PLAN_FILE, JSON.stringify(plan, null, 2), "w");
    return plan;
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer().bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function getForcedRedPillGoal(ns) {
    try {
        const player = ns.getPlayer();

        if (!player.factions.includes("Daedalus")) {
            return null;
        }

        const owned =
            ns.singularity.getOwnedAugmentations(true);

        if (owned.includes("The Red Pill")) {
            return null;
        }

        const rep =
            ns.singularity.getFactionRep("Daedalus");

        const repReq =
            ns.singularity.getAugmentationRepReq("The Red Pill");

        const price =
            ns.singularity.getAugmentationPrice("The Red Pill");

        return {
            name: "The Red Pill",
            faction: "Daedalus",
            theme: "endgame",

            price,
            rep: repReq,
            factionRep: rep,

            hasRep: rep >= repReq,
            affordable: player.money >= price,
            hasPrereqs: true,
            prereqs: [],

            stats: {},
            statBreakdown: {},
            priorityClass: 999,
            stagePolicy: getAugmentationStagePolicy({
                name: "The Red Pill",
                faction: "Daedalus",
            }),

            tags: ["red-pill", "endgame"],

            score: Number.MAX_SAFE_INTEGER,
        };
    } catch {
        return null;
    }
}

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};
        const raw = ns.read(file);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function getOwnedAugmentationSet(ns) {
    try {
        return new Set(ns.singularity.getOwnedAugmentations(true));
    } catch {
        return new Set();
    }
}

function getLiveAugmentationSnapshot(ns, faction, aug) {
    try {
        return {
            price: ns.singularity.getAugmentationPrice(aug),
            rep: ns.singularity.getAugmentationRepReq(aug),
            factionRep: ns.singularity.getFactionRep(faction),
        };
    } catch {
        return {};
    }
}
