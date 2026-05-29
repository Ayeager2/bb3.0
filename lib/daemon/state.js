import { CONFIG } from "/lib/daemon/config.js";

import {
    safeGetPurchasedServers,
    safeGetCloudServers,
    formatMoney,
} from "/lib/daemon/safe.js";

import {
    getTargetStats,
    scoreMoneyTarget,
} from "/lib/daemon/targets.js";

import {
    getBn4Readiness,
    getBn4VictoryPlan,
} from "/lib/daemon/progression.js";

export function buildGlobalState(ns, decision, capabilities) {
    const player = ns.getPlayer();
    const targetStats = decision.target ? getTargetStats(ns, decision.target) : null;

    return {
        version: 5,
        updatedAt: Date.now(),

        mode: decision.mode,
        target: decision.target,
        targetOverride: decision.targetOverride,
        targetStats,

        spendingPolicy: decision.spendingPolicy,
        reserveMoney: decision.spendingPolicy.reserveMoney,
        allowServerPurchases: decision.spendingPolicy.allowServerPurchases,
        allowStockTrading: decision.spendingPolicy.allowStockTrading,

        protoBatching: CONFIG.protoBatching,
        multiTargetPolicy: buildAdaptiveMultiTargetPolicy(ns, decision),
        controller: {
            name: "central-ai-controller-v4-stale-host-safe",
            reason: getDecisionReason(ns, decision),
        },

        player: {
            money: player.money,
            hacking: ns.getHackingLevel(),
        },

        servers: {
            rootedCount: decision.rootedServers.size,
            purchased: safeGetPurchasedServers(ns),
            cloud: safeGetCloudServers(ns),
        },

        goals: {
            homeRam: decision.spendingPolicy.allowHomeRam,
            purchasedServers: decision.spendingPolicy.allowServerPurchases,
            exes: decision.spendingPolicy.allowExePurchases,
            fourS: decision.spendingPolicy.allowStockTrading,
            factions: decision.spendingPolicy.priority === "faction",
            singularity: capabilities.singularity,
            betterScoring: true,
            expMode: decision.mode === "exp",
            resetPlanning: decision.spendingPolicy.priority === "reset-prep",
            multiTargetScaling: CONFIG.multiTargetPolicy.enabled,
        },

        bitNodePlan: decision.bitNodePlan,
        bn4Readiness: getBn4Readiness(ns),
        bn4VictoryPlan: getBn4VictoryPlan(ns),

        capabilities,

        sharePolicy: {
            enabled:
                decision.spendingPolicy.priority === "faction" ||
                decision.spendingPolicy.priority === "reset-prep",

            aggressive:
                decision.spendingPolicy.priority === "reset-prep",

            reserveRamPercent:
                decision.spendingPolicy.priority === "reset-prep"
                    ? 0.10
                    : 0.25,
        },
    };
}

export function buildAdaptiveMultiTargetPolicy(ns, decision) {
    const hacking = ns.getHackingLevel();
    const money = ns.getPlayer().money;
    const mode = decision.mode;
    const priority = decision.spendingPolicy?.priority ?? "income";

    let primary = 0.60;
    let secondary = 0.30;
    let exp = 0.10;

    if (mode === "exp" || priority === "leveling") {
        primary = 0.25;
        secondary = 0.15;
        exp = 0.60;
    } else if (mode === "prep") {
        primary = 0.70;
        secondary = 0.20;
        exp = 0.10;
    } else if (priority === "income" && money < CONFIG.moneyUntilAmount) {
        primary = 0.75;
        secondary = 0.20;
        exp = 0.05;
    } else if (priority === "upgrades") {
        primary = 0.70;
        secondary = 0.25;
        exp = 0.05;
    } else if (priority === "faction") {
        primary = 0.45;
        secondary = 0.20;
        exp = 0.35;
    } else if (priority === "reset-prep") {
        primary = 0.30;
        secondary = 0.10;
        exp = 0.60;
    }

    if (hacking < CONFIG.expUntilHackingLevel * 0.5) {
        exp = Math.max(exp, 0.70);
        primary = 0.20;
        secondary = 0.10;
    }

    const normalized = normalizeLanePercents(primary, secondary, exp);

    return {
        enabled: CONFIG.multiTargetPolicy.enabled,
        primaryMoneyRamPercent: normalized.primary,
        secondaryMoneyRamPercent: normalized.secondary,
        expRamPercent: normalized.exp,
        minBatchesPerLane: CONFIG.multiTargetPolicy.minBatchesPerLane,
        showSkippedLanes: CONFIG.multiTargetPolicy.showSkippedLanes,

        adaptive: true,
        reason: getLanePolicyReason(mode, priority, hacking, money),
    };
}

export function normalizeLanePercents(primary, secondary, exp) {
    const total = primary + secondary + exp;

    if (total <= 0) {
        return {
            primary: 0.60,
            secondary: 0.30,
            exp: 0.10,
        };
    }

    return {
        primary: primary / total,
        secondary: secondary / total,
        exp: exp / total,
    };
}

export function getLanePolicyReason(mode, priority, hacking, money) {
    if (mode === "exp" || priority === "leveling") {
        return `Leveling mode: hacking ${hacking}; EXP lane boosted.`;
    }

    if (mode === "prep") {
        return "Prep mode: primary lane boosted to stabilize money target.";
    }

    if (priority === "income" && money < CONFIG.moneyUntilAmount) {
        return "Income priority: primary money lane boosted.";
    }

    if (priority === "upgrades") {
        return "Upgrade priority: money lanes favored for EXEs/server growth.";
    }

    if (priority === "faction") {
        return "Faction priority: balanced income and EXP support.";
    }

    if (priority === "reset-prep") {
        return "Reset-prep priority: EXP/intelligence support boosted.";
    }

    return "Default balanced money policy.";
}

export function getDecisionReason(ns, decision) {
    const hacking = ns.getHackingLevel();
    const money = ns.getPlayer().money;

    if (decision.mode === "exp") {
        return `Hacking ${hacking} below ${CONFIG.expUntilHackingLevel}; prioritizing EXP.`;
    }

    if (decision.mode === "prep") {
        const stats = getTargetStats(ns, decision.target);
        return `Prep-aware mode selected ${decision.target}; prepNeed=${stats.prepNeed.toFixed(2)}, sec+${stats.securityDiff.toFixed(2)}, money=${(stats.moneyPercent * 100).toFixed(1)}%.`;
    }

    if (decision.spendingPolicy.priority === "upgrades") {
        return "Port openers or core upgrades incomplete; prioritizing upgrade spending.";
    }

    if (decision.spendingPolicy.priority === "faction") {
        return "BN4/faction prep active; preserving cash for augmentation progression.";
    }

    if (decision.spendingPolicy.priority === "reset-prep") {
        return "BN4 readiness met; reset-prep mode active.";
    }

    if (money < CONFIG.moneyUntilAmount) {
        return `Money below ${formatMoney(CONFIG.moneyUntilAmount)}; prioritizing income.`;
    }

    const stats = getTargetStats(ns, decision.target);
    return `Money mode using ${decision.target}; score=${scoreMoneyTarget(ns, decision.target).toFixed(2)}, prepNeed=${stats.prepNeed.toFixed(2)}.`;
}