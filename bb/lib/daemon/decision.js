// /lib/daemon/decision.js
import { CONFIG } from "/lib/daemon/config.js";

import {
    getBestMoneyTarget,
    isTargetReasonableForMoney,
    getBestPrepTarget,
    prepNeed,
    getBestExpTarget
} from "/lib/daemon/targets.js";

import {
    getBn4VictoryPlan,
    getBn4Readiness,
} from "/lib/daemon/progression.js";

import { getAugmentationDecision } from "/lib/daemon/augmentation-decision.js";
import { buildResetPlan } from "/lib/daemon/reset-planner.js";

import {
    buildStrategicMoneyTargetPlan,
} from "/lib/daemon/target-intelligence.js";
import { getSecondaryMoneyTarget } from "/lib/daemon/targets.js";
import { buildFactionProgressionState } from "/lib/daemon/faction-progression.js";
import { getWorldDaemonStatus } from "/lib/daemon/progression.js";

const EARLY_MONEY_UNTIL_HACKING = 1000;

export function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? 1;
    } catch {
        return 1;
    }
}

export function getBitNodeRoadmap(ns) {
    const bitNode = getCurrentBitNode(ns);

    const roadmaps = {
        1: "standard-growth",
        2: "crime-gang",
        3: "corporation",
        4: "singularity",
        5: "intelligence",
        6: "bladeburner",
        7: "bladeburner-singularity",
        8: "stock-market",
        9: "hacknet",
        10: "sleeves",
        11: "company",
        12: "challenge-repeat",
        13: "stanek",
        14: "go",
    };

    return {
        bitNode,
        roadmap: roadmaps[bitNode] ?? "unknown",
    };
}

export function chooseModeFromRoadmap(ns, roadmap, rootedServers) {
    if (roadmap === "singularity") {
        const resetPlan = buildResetPlan(ns);
        const plan = getBn4VictoryPlan(ns);
        const augDecision = getAugmentationDecision(ns);
        const factionProgression = buildFactionProgressionState(ns);

        const redPillOwned = hasRedPill(ns);
        const world = getWorldDaemonStatus(ns);

        if (redPillOwned) {
            if (!world.exists) return "progression";
            if (!world.hackReady) return "exp";
            if (!world.rooted) return "progression";

            return "destroy-node";
        }

        if (resetPlan.ready) {
            return "reset-prep";
        }

        if (
            factionProgression.currentBlocker !== "none" &&
            factionProgression.recommendedMode
        ) {
            return factionProgression.recommendedMode;
        }

        if (shouldStartAugmentationPush(ns, augDecision)) {
            return getProgressionModeHint(augDecision);
        }

        if (plan.stage === "level-hacking") {
            return ns.getHackingLevel() < EARLY_MONEY_UNTIL_HACKING
                ? "money"
                : "exp";
        }

        if (
            plan.stage === "join-daedalus" ||
            plan.stage === "get-red-pill" ||
            plan.stage === "destroy-bitnode"
        ) {
            return getProgressionModeHint(augDecision);
        }

        if (plan.stage === "final-leveling") return "exp";
        if (plan.stage === "prep-world-daemon") return "progression";
    }

    if (roadmap === "stock-market") return "money";
    if (roadmap === "corporation") return "money";
    if (roadmap === "bladeburner") return "exp";
    if (roadmap === "crime-gang") return "progression";

    return chooseMode(ns, rootedServers);
}

export function chooseMode(ns, rootedServers) {
    const money = ns.getPlayer().money;
    const hacking = ns.getHackingLevel();
    const augDecision = getAugmentationDecision(ns);

    if (shouldStartAugmentationPush(ns, augDecision)) {
        return getProgressionModeHint(augDecision);
    }

    if (hacking < EARLY_MONEY_UNTIL_HACKING) return "money";

    if (
        augDecision.shouldWorkFaction ||
        augDecision.shouldDonateFaction ||
        augDecision.shouldBuyAugment
    ) {
        return "progression";
    }

    if (augDecision.shouldEarnMoney) {
        return "money";
    }

    if (hacking < CONFIG.expUntilHackingLevel) return "exp";
    if (money < CONFIG.moneyUntilAmount) return "money";

    const bestMoney = getBestMoneyTarget(ns, rootedServers);
    if (bestMoney && isTargetReasonableForMoney(ns, bestMoney)) {
        return "money";
    }

    const bestPrep = getBestPrepTarget(ns, rootedServers);
    if (bestPrep && prepNeed(ns, bestPrep) > CONFIG.prepModeNeedThreshold) {
        return "prep";
    }

    return "money";
}

export function choosePriority(ns, mode) {
    const money = ns.getPlayer().money;
    const hacking = ns.getHackingLevel();
    const bn4 = getBn4Readiness(ns);
    const augDecision = getAugmentationDecision(ns);
    const resetPlan = buildResetPlan(ns);

    if (mode === "destroy-node") return "destroy-node";
    if (mode === "reset-prep") return "reset-prep";
    if (mode === "progression") return "progression";
    if (mode === "exp") return "leveling";

    if (resetPlan.ready) return "reset-prep";

    const factionProgression = buildFactionProgressionState(ns);

    if (
        factionProgression.currentBlocker !== "none" &&
        factionProgression.recommendedMode === "progression"
    ) {
        return "progression";
    }

    if (shouldStartAugmentationPush(ns, augDecision)) {
        return augDecision.shouldEarnMoney ? "income" : "progression";
    }

    if (hacking < EARLY_MONEY_UNTIL_HACKING) return "income";

    if (augDecision.shouldWorkFaction) return "progression";
    if (augDecision.shouldDonateFaction) return "progression";
    if (augDecision.shouldBuyAugment) return "progression";
    if (augDecision.shouldEarnMoney) return "income";

    if (bn4.ready) return "progression";
    if (bn4.readyCount >= 3) return "progression";

    if (hacking < CONFIG.expUntilHackingLevel) return "leveling";
    if (money < CONFIG.moneyUntilAmount) return "income";

    if (!hasAllPortOpeners(ns)) return "income";

    if (money > 250_000_000_000) return "progression";

    return "income";
}

export function chooseSpendingPolicy(ns, mode, capabilities = {}, overrides = {}) {
    const augDecision = getAugmentationDecision(ns);

    const priority =
        overrides?.priority ||
        choosePriority(ns, mode);

    const factionProgression = buildFactionProgressionState(ns);
    const joiningDaedalus =
        factionProgression.currentFactionStage === "daedalus" &&
        factionProgression.currentBlocker === "daedalus-join";

    if (mode === "bootstrap") {
        return {
            priority: "bootstrap",
            reserveMoney: 1_000_000,

            allowExePurchases: true,
            allowHomeRam: true,
            allowServerPurchases: true,
            allowStockTrading: false,
            allowHacknet: false,

            allowAugmentPurchases: false,
            allowFactionWork: false,
            allowFactionDonation: false,
            allowFactionJoin: false,
            allowBackdoors: false,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "reset-prep" || mode === "reset-prep") {
        return {
            priority: "reset-prep",
            reserveMoney: 0,

            allowServerPurchases: false,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: false,
            allowExePurchases: false,

            allowAugmentPurchases: false,
            allowFactionWork: false,
            allowFactionDonation: false,
            allowFactionJoin: false,
            allowBackdoors: false,

            allowReset: capabilities.singularity === true,
            allowIntTravel: false,
        };
    }

    if (mode === "exp" || priority === "leveling") {
        return {
            priority: "leveling",
            reserveMoney: CONFIG.minReserveMoney,

            allowServerPurchases: true,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: true,
            allowExePurchases: true,

            allowAugmentPurchases: false,
            allowFactionWork: false,
            allowFactionDonation: false,
            allowFactionJoin: capabilities.singularity === true,
            allowBackdoors: capabilities.singularity === true,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "progression" || mode === "progression") {
        return {
            priority: "progression",

            reserveMoney:
                joiningDaedalus
                    ? 100_000_000_000
                    : augDecision.shouldEarnMoney === true
                        ? CONFIG.midReserveMoney
                        : CONFIG.minReserveMoney,

            allowServerPurchases:
                joiningDaedalus
                    ? false
                    : augDecision.shouldEarnMoney === true,

            allowStockTrading:
                joiningDaedalus
                    ? false
                    : augDecision.shouldEarnMoney === true,

            allowHacknet: false,

            allowHomeRam:
                joiningDaedalus
                    ? false
                    : augDecision.shouldEarnMoney === true,

            allowExePurchases: true,

            allowAugmentPurchases:
                augDecision.shouldBuyAugment === true,

            allowFactionWork: true,

            allowFactionDonation:
                augDecision.shouldDonateFaction === true,

            allowFactionJoin:
                capabilities.singularity === true,

            allowBackdoors:
                capabilities.singularity === true,

            allowReset:
                capabilities.singularity === true &&
                augDecision.shouldBuyAugment !== true &&
                augDecision.shouldWorkFaction !== true &&
                augDecision.shouldDonateFaction !== true,

            allowIntTravel:
                capabilities.singularity === true,
        };
    }

    if (priority === "income" || mode === "money") {
        return {
            priority: "income",
            reserveMoney:
                joiningDaedalus
                    ? 100_000_000_000
                    : augDecision.shouldEarnMoney === true
                        ? CONFIG.midReserveMoney
                        : CONFIG.minReserveMoney,

            allowServerPurchases: true,
            allowStockTrading: true,
            allowHacknet: true,
            allowHomeRam: true,
            allowExePurchases: true,

            allowAugmentPurchases: false,
            allowFactionWork: false,
            allowFactionDonation: false,
            allowFactionJoin: capabilities.singularity === true,
            allowBackdoors: capabilities.singularity === true,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (mode === "destroy-node") {
        return {
            priority: "destroy-node",
            reserveMoney: 0,

            allowServerPurchases: false,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: false,
            allowExePurchases: false,

            allowAugmentPurchases: false,
            allowFactionWork: false,
            allowFactionDonation: false,
            allowFactionJoin: false,

            allowBackdoors: true,

            allowReset: true,
            allowIntTravel: false,
        };
    }

    return {
        priority,
        reserveMoney: CONFIG.minReserveMoney,

        allowServerPurchases: true,
        allowStockTrading: true,
        allowHacknet: true,
        allowHomeRam: true,
        allowExePurchases: true,

        allowAugmentPurchases: false,
        allowFactionWork: false,
        allowFactionDonation: false,
        allowFactionJoin: capabilities.singularity === true,
        allowBackdoors: true,
        allowReset: false,
        allowIntTravel: false,
    };
}

function getProgressionModeHint(augDecision) {
    if (augDecision.shouldEarnMoney) return "money";

    if (
        augDecision.shouldWorkFaction ||
        augDecision.shouldDonateFaction ||
        augDecision.shouldBuyAugment
    ) {
        return "progression";
    }

    return "progression";
}

function shouldStartAugmentationPush(ns, augDecision) {
    const cfg = CONFIG.augmentationPush ?? {};

    const minHacking = cfg.minHackingLevel ?? 500;
    const minMoney = cfg.minMoney ?? 5_000_000_000;
    const requireCorePrograms = cfg.requireCorePrograms ?? true;

    if (ns.getHackingLevel() < minHacking) return false;
    if (ns.getPlayer().money < minMoney) return false;
    if (requireCorePrograms && !hasAllPortOpeners(ns)) return false;
    if (!augDecision) return false;
    if (augDecision.reason === "No augmentation goal found.") return false;

    return true;
}

export function chooseTargetOverride() {
    return null;
}

export function buildStrategicTargetDecision(ns, {
    mode,
    rootedServers,
    currentTarget = null,
    targetSince = null,
    forceTarget = null,
} = {}) {
    const now = Date.now();

    const targetAgeMs =
        targetSince && currentTarget
            ? Math.max(0, now - targetSince)
            : Number.MAX_SAFE_INTEGER;

    const phase = mode === "money"
        ? "scaling"
        : mode;

    if (mode === "money" || mode === "progression") {
        const plan = buildStrategicMoneyTargetPlan(
            ns,
            rootedServers,
            currentTarget,
            {
                phase,
                lane: "primary",
                targetAgeMs,
                forceTarget,
            }
        );

        return {
            target: plan.target,
            targetSince:
                plan.changed || !targetSince
                    ? now
                    : targetSince,
            targetStability: plan.targetStability,
            targetPlan: plan,
            reason: plan.reason,
            laneTargets: {
                primary: plan.target,
                secondary: getSecondaryMoneyTarget(ns, rootedServers, plan.target, {
                    phase,
                    lane: "secondary",
                }),
                exp: getBestExpTarget(ns, rootedServers, {
                    phase,
                    lane: "exp",
                }),
                prep: getBestPrepTarget(ns, rootedServers, {
                    phase,
                    lane: "prep",
                }),
            },
        };
    }

    if (mode === "exp") {
        const expTarget =
            getBestExpTarget(ns, rootedServers) ||
            "joesguns";

        return {
            target: expTarget,
            targetSince: targetSince || now,
            targetStability: {
                held: true,
                reason: "exp target selected",
            },
            targetPlan: {
                type: "exp",
                target: expTarget,
            },
            reason: `exp target ${expTarget}`,
        };
    }

    if (mode === "prep") {
        const prepTarget =
            getBestPrepTarget(ns, rootedServers) ||
            currentTarget ||
            "n00dles";

        return {
            target: prepTarget,
            targetSince: targetSince || now,
            targetStability: {
                held: true,
                reason: "prep target selected",
            },
            targetPlan: {
                type: "prep",
                target: prepTarget,
            },
            reason: `prep target ${prepTarget}`,
        };
    }

    const fallback =
        currentTarget ||
        getBestMoneyTarget(ns, rootedServers) ||
        "n00dles";

    return {
        target: fallback,
        targetSince: targetSince || now,
        targetStability: null,
        targetPlan: null,
        reason: `mode ${mode} using fallback target ${fallback}`,
    };
}

export function hasAllPortOpeners(ns) {
    return (
        ns.fileExists("BruteSSH.exe", "home") &&
        ns.fileExists("FTPCrack.exe", "home") &&
        ns.fileExists("relaySMTP.exe", "home") &&
        ns.fileExists("HTTPWorm.exe", "home") &&
        ns.fileExists("SQLInject.exe", "home")
    );
}

export function detectCapabilities(ns) {
    return {
        singularity: hasSingularityAccess(ns),
        sleeves: hasSleevesAccess(ns),
        corporations: hasCorporationAccess(ns),
        gangs: hasGangAccess(ns),
        bladeburner: hasBladeburnerAccess(ns),
    };
}

export function hasSingularityAccess(ns) {
    try {
        ns.singularity.checkFactionInvitations();
        return true;
    } catch {
        return false;
    }
}

export function hasSleevesAccess() {
    return false;
}

export function hasCorporationAccess() {
    return false;
}

export function hasGangAccess() {
    return false;
}

export function hasBladeburnerAccess() {
    return false;
}

function hasWorldDaemonInfrastructure(ns) {
    const minServerRam = 1_048_576; // 1PB in GB
    const servers = ns.cloud.getServerNames();
    const limit = 25;

    if (servers.length < limit) return false;

    return servers.every((server) =>
        ns.getServerMaxRam(server) >= minServerRam
    );
}

function hasRedPill(ns) {
    try {
        return ns.singularity
            .getOwnedAugmentations(true)
            .includes("The Red Pill");
    } catch {
        return false;
    }
}