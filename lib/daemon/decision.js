//decision.js
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
        const plan = getBn4VictoryPlan(ns);
        const augDecision = getAugmentationDecision(ns);
        const hacking = ns.getHackingLevel();

        if (plan.stage === "level-hacking") {
            return hacking < EARLY_MONEY_UNTIL_HACKING
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
        if (plan.stage === "prep-world-daemon") return "prep";
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

    // Early BN4 rule:
    // Money first so cheap aug sets, servers, RAM, and EXEs can snowball.
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

    // Early BN4: cash comes first. EXP can wait until the money engine is healthier.
    if (hacking < EARLY_MONEY_UNTIL_HACKING) return "income";

    if (augDecision.shouldWorkFaction) return "progression";
    if (augDecision.shouldDonateFaction) return "progression";
    if (augDecision.shouldBuyAugment) return "progression";
    if (augDecision.shouldEarnMoney) return "income";

    if (bn4.ready) return "progression";
    if (bn4.readyCount >= 3) return "progression";

    if (mode === "progression") return "progression";
    if (mode === "exp") return "leveling";

    if (hacking < CONFIG.expUntilHackingLevel) return "leveling";
    if (money < CONFIG.moneyUntilAmount) return "income";

    if (!hasAllPortOpeners(ns)) return "income";

    if (money > 250_000_000_000) return "progression";

    return "income";
}

export function chooseSpendingPolicy(ns, mode, capabilities = {}, overrides = {}) {
    const money = ns.getPlayer().money;
    const augDecision = getAugmentationDecision(ns);

    const priority =
        overrides?.priority ||
        choosePriority(ns, mode);

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
            allowBackdoors: false,
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
            allowFactionWork: false,
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "income" || mode === "money") {
        return {
            priority: "income",
            reserveMoney: money > 25_000_000_000
                ? CONFIG.midReserveMoney
                : CONFIG.minReserveMoney,

            allowServerPurchases: true,
            allowStockTrading: true,
            allowHacknet: true,
            allowHomeRam: true,
            allowExePurchases: true,

            allowAugmentPurchases: false,
            allowFactionWork: false,
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "leveling") {
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
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (priority === "progression" || mode === "progression") {
        return {
            priority: "progression",
            reserveMoney: CONFIG.highReserveMoney,

            // Only keep building income systems when money is the bottleneck.
            allowServerPurchases: augDecision.shouldEarnMoney === true,
            allowStockTrading: augDecision.shouldEarnMoney === true,
            allowHacknet: false,
            allowHomeRam: augDecision.shouldEarnMoney === true,
            allowExePurchases: true,

            // Progression actions are separate on purpose.
            allowAugmentPurchases: augDecision.shouldBuyAugment === true,
            allowFactionWork: augDecision.shouldWorkFaction === true,
            allowFactionDonation: augDecision.shouldDonateFaction === true,
            allowFactionJoin: capabilities.singularity === true,
            allowBackdoors: capabilities.singularity === true,

            // Do not reset while still buying/work/donating.
            allowReset:
                capabilities.singularity === true &&
                augDecision.shouldBuyAugment !== true &&
                augDecision.shouldWorkFaction !== true &&
                augDecision.shouldDonateFaction !== true,

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
        allowFactionWork: false,
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