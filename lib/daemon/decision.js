import { CONFIG } from "/lib/daemon/config.js";

import {
    getBestMoneyTarget,
    isTargetReasonableForMoney,
    getBestPrepTarget,
    prepNeed,
} from "/lib/daemon/targets.js";

import {
    getBn4VictoryPlan,
    getBn4Readiness,
} from "/lib/daemon/progression.js";

import { getAugmentationDecision } from "/lib/daemon/augmentation-decision.js";

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
        const plan = getBn4VictoryPlan(ns);
        const augDecision = getAugmentationDecision(ns);

        if (plan.stage === "level-hacking") return "exp";

        if (plan.stage === "join-daedalus" || plan.stage === "get-red-pill") {
            return augDecision.modeHint ?? "faction";
        }

        if (plan.stage === "final-leveling") return "exp";
        if (plan.stage === "prep-world-daemon") return "prep";
        if (plan.stage === "destroy-bitnode") return "reset-prep";
    }

    if (roadmap === "stock-market") return "money";
    if (roadmap === "corporation") return "money";
    if (roadmap === "bladeburner") return "exp";
    if (roadmap === "crime-gang") return "faction";

    return chooseMode(ns, rootedServers);
}

export function chooseMode(ns, rootedServers) {
    const money = ns.getPlayer().money;
    const hacking = ns.getHackingLevel();

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

    if (augDecision.shouldWorkFaction) return "faction";
    if (augDecision.shouldEarnMoney) return "income";
    if (augDecision.shouldBuyAugment) return "faction";
    if (bn4.ready) return "reset-prep";
    if (bn4.readyCount >= 3) return "faction";

    if (mode === "exp") return "leveling";
    if (hacking < CONFIG.expUntilHackingLevel) return "leveling";
    if (money < CONFIG.moneyUntilAmount) return "income";
    if (!hasAllPortOpeners(ns)) return "upgrades";
    if (money > 250_000_000_000) return "faction";

    return "income";
}

export function chooseSpendingPolicy(ns, mode, capabilities = {}, overrides = {}) {
    const money = ns.getPlayer().money;
    const priority =
        overrides?.priority ||
        choosePriority(ns, mode);
    const augDecision = getAugmentationDecision(ns);
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
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (mode === "exp") {
        return {
            priority: "leveling",
            reserveMoney: CONFIG.minReserveMoney,

            allowServerPurchases: true,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: true,
            allowExePurchases: true,
            allowAugmentPurchases: false,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "income") {
        return {
            priority,
            reserveMoney: money > 25_000_000_000
                ? CONFIG.midReserveMoney
                : CONFIG.minReserveMoney,

            allowServerPurchases: true,
            allowStockTrading: true,
            allowHacknet: true,
            allowHomeRam: true,
            allowExePurchases: true,
            allowAugmentPurchases: false,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "upgrades") {
        return {
            priority,
            reserveMoney: CONFIG.midReserveMoney,

            allowServerPurchases: true,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: true,
            allowExePurchases: true,
            allowAugmentPurchases: false,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "faction" || mode === "faction") {
        return {
            priority: "faction",
            reserveMoney: CONFIG.highReserveMoney,

            allowServerPurchases: false,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: false,
            allowExePurchases: false,
            allowAugmentPurchases:
                augDecision.shouldBuyAugment === true,
            allowFactionWork:
                augDecision.shouldWorkFaction === true,
            allowReset: false,
            allowIntTravel: capabilities.singularity === true,
        };
    }

    if (priority === "reset-prep" || mode === "reset-prep") {
        return {
            priority: "reset-prep",
            reserveMoney: Number.MAX_SAFE_INTEGER,

            allowServerPurchases: false,
            allowStockTrading: false,
            allowHacknet: false,
            allowHomeRam: false,
            allowExePurchases: false,
            allowAugmentPurchases:
                augDecision.shouldBuyAugment === true,
            allowReset: capabilities.singularity === true,
            allowIntTravel: capabilities.singularity === true,
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
        allowReset: false,
        allowIntTravel: false,
    };
}

export function chooseTargetOverride(ns, mode) {
    return null;
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

export function hasSleevesAccess(ns) {
    return false;
}

export function hasCorporationAccess(ns) {
    return false;
}

export function hasGangAccess(ns) {
    return false;
}

export function hasBladeburnerAccess(ns) {
    return false;
}