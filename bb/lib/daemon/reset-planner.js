//lib/daemon/reset-planner.js
export const RESET_PLAN_FILE = "/data/reset-plan.txt";

import {
    scorePendingAugmentations,
} from "/lib/daemon/augmentation-scoring.js";

const DEFAULTS = {
    minPurchasedAugs: 8,
    earlyPurchasedAugs: 4,
    minRunTimeMs: 20 * 60 * 1000,
    minMoneyBeforeReset: 0,
    requireManualArmedFlag: true,
    armedFlagFile: "/data/reset-armed.txt",
    minPendingScore: 2500,
    earlyPendingScore: 1500,
};

const HIGH_IMPACT_KEYWORDS = [
    "NeuroFlux",
    "Neural",
    "Synaptic",
    "Cranial",
    "Hack",
    "BitWire",
    "DataJack",
    "CRTX",
    "Artificial",
    "CashRoot",
    "The Red Pill",
];

export function buildResetPlan(ns, options = {}) {
    const bitNode = getCurrentBitNode(ns);
    const cfg = { ...DEFAULTS, ...getBitNodeResetDefaults(bitNode), ...options };

    const purchased = safeGetOwnedAugmentations(ns, true);
    const installed = safeGetOwnedAugmentations(ns, false);

    const pending = getPendingAugmentations(purchased, installed);
    const highImpact = pending.filter(isHighImpactAugmentation);
    const scoredPending = scorePendingAugmentations(
        pending.map(name => buildPendingAugInfo(ns, name)),
        bitNode
    );
    const money = ns.getPlayer().money;
    const runTimeMs = Date.now() - ns.getResetInfo().lastAugReset;

    const armed = !cfg.requireManualArmedFlag ||
        ns.fileExists(cfg.armedFlagFile, "home");

    const enoughNormalAugs = pending.length >= cfg.minPurchasedAugs;
    const enoughEarlyAugs =
        pending.length >= cfg.earlyPurchasedAugs &&
        scoredPending.highImpact.length > 0 &&
        scoredPending.highImpactScore >= cfg.earlyPendingScore;

    const enoughTime = runTimeMs >= cfg.minRunTimeMs;
    const enoughMoney = money >= cfg.minMoneyBeforeReset;
    const enoughScore = scoredPending.totalScore >= cfg.minPendingScore;

    const ready =
        armed &&
        enoughTime &&
        enoughMoney &&
        ((enoughNormalAugs && enoughScore) || enoughEarlyAugs);

    const blockers = [];

    if (!armed) blockers.push(`Missing armed flag: ${cfg.armedFlagFile}`);
    if (!enoughTime) blockers.push("Run too young after last augmentation reset.");
    if (!enoughMoney) blockers.push("Money threshold not met.");
    if (!enoughNormalAugs && !enoughEarlyAugs) {
        blockers.push("Not enough pending augmentations.");
    }
    if (!enoughScore && !enoughEarlyAugs) {
        blockers.push("Pending augmentation score too low.");
    }
    return {
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),

        ready,
        armed,

        pendingCount: pending.length,
        installedCount: installed.length,
        purchasedCount: purchased.length,

        pending,
        highImpact,

        thresholds: cfg,
        runTimeMs,
        money,

        reason: ready
            ? "Reset ready: augmentation threshold met."
            : blockers.join(" "),

        blockers,
        bitNode,
        pendingScore: scoredPending.totalScore,
        highImpactScore: scoredPending.highImpactScore,
        scoredPending: scoredPending.scored,
    };
}

export function writeResetPlan(ns, plan) {
    ns.write(RESET_PLAN_FILE, JSON.stringify(plan, null, 2), "w");
}

function safeGetOwnedAugmentations(ns, purchased) {
    try {
        return ns.singularity.getOwnedAugmentations(purchased);
    } catch {
        return [];
    }
}

function isHighImpactAugmentation(name) {
    return HIGH_IMPACT_KEYWORDS.some(keyword =>
        String(name).toLowerCase().includes(keyword.toLowerCase())
    );
}

function buildPendingAugInfo(ns, name) {
    return {
        name,
        price: safeAugPrice(ns, name),
        rep: safeAugRep(ns, name),
        stats: safeAugStats(ns, name),
    };
}

function safeAugPrice(ns, name) {
    try {
        return ns.singularity.getAugmentationPrice(name);
    } catch {
        return 0;
    }
}

function safeAugRep(ns, name) {
    try {
        return ns.singularity.getAugmentationRepReq(name);
    } catch {
        return 0;
    }
}

function safeAugStats(ns, name) {
    try {
        return ns.singularity.getAugmentationStats(name);
    } catch {
        return {};
    }
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer().bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function getPendingAugmentations(purchased, installed) {
    const installedCounts = countByName(installed);
    const pending = [];

    for (const aug of purchased) {
        const installedCount = installedCounts[aug] ?? 0;

        if (installedCount > 0) {
            installedCounts[aug] = installedCount - 1;
            continue;
        }

        pending.push(aug);
    }

    return pending;
}

function countByName(items = []) {
    const counts = {};

    for (const item of items) {
        counts[item] = (counts[item] ?? 0) + 1;
    }

    return counts;
}

function getBitNodeResetDefaults(bitNode) {
    if (bitNode === 2) {
        return {
            minPurchasedAugs: 6,
            earlyPurchasedAugs: 6,
            minRunTimeMs: 0,
            minPendingScore: 0,
            earlyPendingScore: 0,
            requireManualArmedFlag: false,
        };
    }

    return {};
}
