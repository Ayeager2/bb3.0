import { CONFIG } from "/lib/daemon/config.js";

import {
    getBestMoneyTarget,
    isTargetReasonableForMoney,
    getBestPrepTarget,
    prepNeed,
    canUseTarget,
} from "/lib/daemon/targets.js";

import { getBn4VictoryPlan, getBn4Readiness } from "/lib/daemon/progression.js";

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

        if (plan.stage === "level-hacking") return "exp";
        if (plan.stage === "join-daedalus") return "faction";
        if (plan.stage === "get-red-pill") return "faction";
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

    if (bn4.ready) return "reset-prep";
    if (bn4.readyCount >= 3) return "faction";

    if (mode === "exp") return "leveling";
    if (hacking < CONFIG.expUntilHackingLevel) return "leveling";
    if (money < CONFIG.moneyUntilAmount) return "income";
    if (!hasAllPortOpeners(ns)) return "upgrades";
    if (money > 250_000_000_000) return "faction";

    return "income";
}

export function chooseSpendingPolicy(ns, mode, capabilities, overrides) {
    const money = ns.getPlayer().money;
    const priority =
        overrides?.priority ||
        choosePriority(ns, mode);

    const policy = {
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

    if (mode === "exp") {
        policy.priority = "leveling";
        policy.reserveMoney = CONFIG.minReserveMoney;

        policy.allowServerPurchases = true;
        policy.allowStockTrading = false;
        policy.allowHacknet = false;
        policy.allowHomeRam = true;
        policy.allowExePurchases = true;
        policy.allowAugmentPurchases = false;
        policy.allowReset = false;
        policy.allowIntTravel = false;

        return policy;
    }

    if (priority === "income") {
        policy.reserveMoney = money > 25_000_000_000 ? CONFIG.midReserveMoney : CONFIG.minReserveMoney;
        return policy;
    }

    if (priority === "upgrades") {
        policy.reserveMoney = CONFIG.midReserveMoney;
        policy.allowStockTrading = false;
        policy.allowHacknet = false;
        return policy;
    }

    if (priority === "faction") {
        policy.reserveMoney = CONFIG.highReserveMoney;
        policy.allowServerPurchases = false;
        policy.allowStockTrading = false;
        policy.allowHacknet = false;
        policy.allowHomeRam = false;
        policy.allowExePurchases = false;
        policy.allowAugmentPurchases = true;
        return policy;
    }

    if (priority === "reset-prep") {
        policy.reserveMoney = Number.MAX_SAFE_INTEGER;

        policy.allowServerPurchases = false;
        policy.allowStockTrading = false;
        policy.allowHacknet = false;
        policy.allowHomeRam = false;
        policy.allowExePurchases = false;

        policy.allowAugmentPurchases = true;
        policy.allowReset = capabilities.singularity;
        policy.allowIntTravel = true;

        return policy;
    }

    return policy;
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