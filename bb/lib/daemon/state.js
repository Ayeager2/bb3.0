//bb/lib/daemon/state.js
import { CONFIG } from "/lib/daemon/config.js";
import { getCurrentPhase } from "/lib/daemon/phase.js";
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
    getWorldDaemonStatus
} from "/lib/daemon/progression.js";
import { buildSessionStats } from "/lib/daemon/session.js";
import { getTelemetryCounts } from "/lib/daemon/telemetry.js";
import {
    buildResetPlan,
} from "/lib/daemon/reset-planner.js";
import { buildFactionProgressionState } from "/lib/daemon/faction-progression.js";

export function buildGlobalState(ns, decision, capabilities) {
    const player = ns.getPlayer();
    const targetStats = decision.target ? getTargetStats(ns, decision.target) : null;
    const resetPlan = buildResetPlan(ns);
    const factionProgression = buildFactionProgressionState(ns);
    return {
        version: 5,
        updatedAt: Date.now(),

        mode: decision.mode,
        phase: getCurrentPhase(ns, decision, capabilities),
        target: decision.target,
        targetOverride: decision.targetOverride,
        targetStats,
        targetStability: decision.targetStability ?? null,
        targetSince: decision.targetSince ?? null,
        laneTargets: decision.laneTargets ?? null,
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
            factions:
                decision.spendingPolicy.priority === "progression" ||
                decision.spendingPolicy.priority === "faction",
            singularity: capabilities.singularity,
            betterScoring: true,
            expMode: decision.mode === "exp",
            resetPlanning: decision.spendingPolicy.priority === "reset-prep",
            multiTargetScaling: CONFIG.multiTargetPolicy.enabled,
        },

        bitNodePlan: decision.bitNodePlan,
        factionProgression,
        bn4Readiness: getBn4Readiness(ns),
        bn4VictoryPlan: getBn4VictoryPlan(ns),
        resetPlan,
        capabilities,
        formulasUnlocked:
            ns.fileExists("Formulas.exe", "home") &&
            !!ns.formulas?.hacking,
        sharePolicy: buildSharePolicy(ns, decision),

        sessionStats: buildSessionStats(ns),
        telemetry: getTelemetryCounts(ns),

    };
}

export function buildAdaptiveMultiTargetPolicy(ns, decision) {
    const hacking = ns.getHackingLevel();
    const money = ns.getPlayer().money;
    const mode = decision.mode;
    const priority = decision.spendingPolicy?.priority ?? "income";

    const victoryPlan = getBn4VictoryPlan(ns);
    const world = getWorldDaemonStatus(ns);

    let primary = 0.60;
    let secondary = 0.30;
    let exp = 0.10;
    let reason = getLanePolicyReason(mode, priority, hacking, money);

    if (mode === "exp" || priority === "leveling") {
        primary = 0.00;
        secondary = 0.00;
        exp = 1.00;

        reason =
            victoryPlan.hasRedPill
                ? `Post-Red-Pill EXP sprint: hacking ${hacking}/${world.requiredHack}.`
                : `EXP bottleneck active: hacking ${hacking}; all lanes assigned to EXP.`;
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
    } else if (priority === "progression" || priority === "faction") {
        primary = 0.45;
        secondary = 0.20;
        exp = 0.35;
    } else if (priority === "reset-prep") {
        primary = 0.30;
        secondary = 0.10;
        exp = 0.60;
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
        reason,
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

    if (priority === "progression" || priority === "faction") {
        return "Progression priority: balanced income, faction work, and EXP support.";
    }

    if (priority === "reset-prep") {
        return "Reset-prep priority: EXP/intelligence support boosted.";
    }

    return "Default balanced money policy.";
}

export function getDecisionReason(ns, decision) {
    const hacking = ns.getHackingLevel();
    const money = ns.getPlayer().money;
    const victoryPlan = getBn4VictoryPlan(ns);

    if (decision.mode === "destroy-node") {
        return "Red Pill owned and w0r1d_d43m0n is ready. Destroy-node mode active.";
    }

    if (decision.mode === "exp") {
        if (victoryPlan.hasRedPill) {
            return `Post-Red-Pill EXP sprint: hacking ${hacking}/${victoryPlan.hackingTarget}.`;
        }

        return `Hacking ${hacking} below ${CONFIG.expUntilHackingLevel}; prioritizing EXP.`;
    }

    if (decision.mode === "prep") {
        const stats = getTargetStats(ns, decision.target);
        return `Prep-aware mode selected ${decision.target}; prepNeed=${stats.prepNeed.toFixed(2)}, sec+${stats.securityDiff.toFixed(2)}, money=${(stats.moneyPercent * 100).toFixed(1)}%.`;
    }

    if (decision.spendingPolicy.priority === "destroy-node") {
        return "Destroy-node priority active.";
    }

    if (decision.spendingPolicy.priority === "upgrades") {
        return "Port openers or core upgrades incomplete; prioritizing upgrade spending.";
    }

    if (decision.spendingPolicy.priority === "progression") {
        return "Progression active; handling factions, backdoors, donations, augmentations, or BN4 goals.";
    }

    if (decision.spendingPolicy.priority === "faction") {
        return "Faction prep active; preserving cash for augmentation progression.";
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

function buildSharePolicy(ns, decision) {
    const priority = decision.spendingPolicy?.priority ?? "income";
    const mode = decision.mode ?? "money";

    const money = ns.getPlayer().money;
    const hacking = ns.getHackingLevel();
    const homeRam = ns.getServerMaxRam("home");

    const allowFactionWork =
        decision.spendingPolicy?.allowFactionWork === true;

    const earlyGame =
        homeRam < 256 ||
        money < 25_000_000_000 ||
        hacking < 500;

    if (mode === "exp" || priority === "leveling") {
        return {
            enabled: false,
            aggressive: false,
            reserveRamPercent: 0,
            reason: "Share disabled during EXP leveling.",
        };
    }

    if (earlyGame) {
        return {
            enabled: false,
            aggressive: false,
            reserveRamPercent: 0,
            reason: "Share disabled during early-game growth.",
        };
    }

    if (priority === "reset-prep") {
        return {
            enabled: true,
            aggressive: true,
            reserveRamPercent: 0.10,
            reason: "Share enabled during reset-prep.",
        };
    }

    if (
        priority === "faction" ||
        (priority === "progression" && allowFactionWork)
    ) {
        return {
            enabled: true,
            aggressive: false,
            reserveRamPercent: 0.10,
            reason: "Share enabled for active faction work.",
        };
    }

    return {
        enabled: false,
        aggressive: false,
        reserveRamPercent: 0,
        reason: "Share not useful for current priority.",
    };
}