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
import { getCloudFleetStatus } from "/lib/daemon/cloud-fleet.js";
import { getBitNodeCapabilities } from "/lib/daemon/bitnode-capabilities.js";

const EARLY_MONEY_UNTIL_HACKING = 1000;
const EARLY_HOME_RAM_TARGET = 256;
const EARLY_MONEY_TARGET = 25_000_000;

function shouldBuildEconomyBeforeProgression(ns) {
    const money = ns.getPlayer().money;
    const homeRam = ns.getServerMaxRam("home");
    const hacking = ns.getHackingLevel();
    const cloudFleet = getCloudFleetStatus(ns);

    if (hacking < EARLY_MONEY_UNTIL_HACKING) return true;
    if (homeRam < EARLY_HOME_RAM_TARGET) return true;
    if (money < EARLY_MONEY_TARGET) return true;
    if (cloudFleet.available && !cloudFleet.maxed) {
        if (!cloudFleet.countMaxed) return true;
        if (cloudFleet.nextActionAffordable) return true;
    }

    return false;
}

function isBasicEconomyReadyForFactionWork(ns) {
    const cloudFleet = getCloudFleetStatus(ns);

    if (!cloudFleet.available) return true;

    return cloudFleet.maxed === true;
}

function shouldSwitchFullyToFaction(ns, augDecision) {
    if (augDecision?.augmentationTiming?.shouldFullFaction === true) {
        return true;
    }

    return (
        augDecision?.shouldWorkFaction === true &&
        isBasicEconomyReadyForFactionWork(ns)
    );
}

function shouldFinishAugmentationNow(augDecision) {
    const recommendation =
        augDecision?.augmentationTiming?.recommendation ?? "";

    if (isBitRunnersNeuroFluxLoop(augDecision)) {
        return false;
    }

    return (
        augDecision?.shouldBuyAugment === true ||
        augDecision?.shouldDonateFaction === true ||
        recommendation === "buy-now" ||
        recommendation === "donate-now"
    );
}

export function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? 1;
    } catch {
        return 1;
    }
}

export function getBitNodeRoadmap(ns) {
    const bitNode = getCurrentBitNode(ns);
    const bitNodeCapabilities =
        getBitNodeCapabilities(ns);

    return {
        bitNode,
        roadmap: bitNodeCapabilities.roadmap,
        capabilities: bitNodeCapabilities,
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
            shouldBuildEconomyBeforeProgression(ns) &&
            !shouldFinishAugmentationNow(augDecision)
        ) {
            return "money";
        }

        if (shouldFinishAugmentationNow(augDecision)) {
            return "progression";
        }

        if (
            factionProgression.currentBlocker !== "none" &&
            factionProgression.recommendedMode
        ) {
            if (
                factionProgression.recommendedMode === "progression" &&
                factionProgression.progressionAction?.type === "reputation" &&
                !shouldSwitchFullyToFaction(ns, augDecision)
            ) {
                return "money";
            }

            return factionProgression.recommendedMode;
        }

        if (
            shouldStartAugmentationPush(ns, augDecision) &&
            (
                augDecision.shouldWorkFaction !== true ||
                shouldSwitchFullyToFaction(ns, augDecision)
            )
        ) {
            return getProgressionModeHint(augDecision);
        }

        if (factionProgression.expPolicy?.shouldLevelNow === true) {
            return "exp";
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
    if (roadmap === "hacknet") {
        return chooseHacknetRoadmapMode(ns, rootedServers);
    }
    if (roadmap === "bladeburner") return "exp";
    if (roadmap === "crime-gang") {
        const resetPlan = buildResetPlan(ns);
        const factionProgression = buildFactionProgressionState(ns);
        const redPillOwned = hasRedPill(ns);
        const world = getWorldDaemonStatus(ns);

        if (redPillOwned) {
            if (!world.exists) return "progression";
            if (!world.hackReady) return "exp";
            if (!world.rooted) return "progression";

            return "destroy-node";
        }

        if (resetPlan.ready) return "reset-prep";

        if (shouldBn2BuildMoneyBeforeDaedalus(factionProgression)) {
            return "money";
        }

        if (
            factionProgression.currentBlocker !== "none" &&
            factionProgression.recommendedMode
        ) {
            return factionProgression.recommendedMode;
        }

        return "money";
    }

    return chooseMode(ns, rootedServers);
}

export function chooseMode(ns, rootedServers) {
    const money = ns.getPlayer().money;
    const hacking = ns.getHackingLevel();
    const augDecision = getAugmentationDecision(ns);
    const factionProgression = buildFactionProgressionState(ns);

    if (
        shouldBuildEconomyBeforeProgression(ns) &&
        !shouldFinishAugmentationNow(augDecision)
    ) {
        return "money";
    }

    if (shouldFinishAugmentationNow(augDecision)) {
        return "progression";
    }

    if (factionProgression.expPolicy?.shouldLevelNow === true) {
        return "exp";
    }

    if (
        shouldStartAugmentationPush(ns, augDecision) &&
        (
            augDecision.shouldWorkFaction !== true ||
            shouldSwitchFullyToFaction(ns, augDecision)
        )
    ) {
        return getProgressionModeHint(augDecision);
    }

    if (hacking < EARLY_MONEY_UNTIL_HACKING) return "money";

    if (
        (
            augDecision.shouldWorkFaction &&
            shouldSwitchFullyToFaction(ns, augDecision)
        ) ||
        augDecision.shouldDonateFaction ||
        augDecision.shouldBuyAugment
    ) {
        return "progression";
    }

    if (augDecision.shouldEarnMoney) {
        return "money";
    }

    if (
        factionProgression.hasRedPill === true &&
        hacking < CONFIG.expUntilHackingLevel
    ) {
        return "exp";
    }
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
    const factionProgression = buildFactionProgressionState(ns);
    const bitNodeCapabilities =
        getBitNodeCapabilities(ns);

    if (mode === "destroy-node") return "destroy-node";
    if (mode === "reset-prep") return "reset-prep";
    if (resetPlan.ready) return "reset-prep";

    if (bitNodeCapabilities.roadmap === "hacknet") {
        return chooseHacknetRoadmapPriority(ns, mode, augDecision, factionProgression);
    }

    if (
        shouldBuildEconomyBeforeProgression(ns) &&
        !shouldFinishAugmentationNow(augDecision)
    ) {
        return "income";
    }

    if (shouldFinishAugmentationNow(augDecision)) {
        return "progression";
    }

    if (factionProgression.expPolicy?.shouldLevelNow === true) {
        return "leveling";
    }

    if (mode === "exp") return "leveling";

    if (mode === "progression") return "progression";

    if (
        factionProgression.currentBlocker !== "none" &&
        factionProgression.recommendedMode === "progression" &&
        (
            factionProgression.progressionAction?.type !== "reputation" ||
            shouldSwitchFullyToFaction(ns, augDecision)
        )
    ) {
        return "progression";
    }

    if (
        shouldStartAugmentationPush(ns, augDecision) &&
        (
            augDecision.shouldWorkFaction !== true ||
            shouldSwitchFullyToFaction(ns, augDecision)
        )
    ) {
        return augDecision.shouldEarnMoney ? "income" : "progression";
    }

    if (hacking < EARLY_MONEY_UNTIL_HACKING) return "income";

    if (
        augDecision.shouldWorkFaction &&
        shouldSwitchFullyToFaction(ns, augDecision)
    ) {
        return "progression";
    }
    if (augDecision.shouldDonateFaction) return "progression";
    if (augDecision.shouldBuyAugment) return "progression";
    if (augDecision.shouldEarnMoney) return "income";

    if (bn4.ready) return "progression";
    if (bn4.readyCount >= 3) return "progression";

    if (
        factionProgression.hasRedPill === true &&
        hacking < CONFIG.expUntilHackingLevel
    ) {
        return "leveling";
    }
    if (money < CONFIG.moneyUntilAmount) return "income";

    if (!hasAllPortOpeners(ns)) return "income";

    if (money > 250_000_000_000) return "progression";

    return "income";
}

export function chooseSpendingPolicy(ns, mode, capabilities = {}, overrides = {}) {
    capabilities = {
        ...capabilities,
        singularity: true,
    };

    const augDecision = getAugmentationDecision(ns);
    const bitNodeCapabilities =
        getBitNodeCapabilities(ns);
    const roadmap =
        bitNodeCapabilities.roadmap;
    const manualModeOrPriority =
        !!overrides?.mode ||
        !!overrides?.priority;

    let priority =
        overrides?.priority ||
        choosePriority(ns, mode);

    if (
        !manualModeOrPriority &&
        roadmap !== "hacknet" &&
        shouldBuildEconomyBeforeProgression(ns) &&
        !shouldFinishAugmentationNow(augDecision) &&
        mode !== "destroy-node" &&
        mode !== "reset-prep"
    ) {
        mode = "money";
        priority = "income";
    }

    const factionProgression = buildFactionProgressionState(ns);
    const joiningDaedalus =
        factionProgression.currentFactionStage === "daedalus" &&
        factionProgression.currentBlocker === "daedalus-join";
    const allowBackgroundFactionWork =
        augDecision.augmentationTiming?.allowBackgroundFaction === true;
    const factionWorkUpgradeGateReady =
        isBasicEconomyReadyForFactionWork(ns);
    const augmentationTiming =
        augDecision.augmentationTiming ?? null;
    const allowMoneyModeAugmentPurchase =
        isMoneyModeAugmentPurchaseAllowed(ns, augDecision);

    if (roadmap === "hacknet") {
        const hacknetPriority =
            mode === "exp" || priority === "leveling"
                ? "leveling"
                : mode === "progression" || mode === "faction" || priority === "progression" || priority === "faction"
                    ? "progression"
                    : "income";
        const progressionActive =
            hacknetPriority === "progression";
        const levelingActive =
            hacknetPriority === "leveling";
        const factionPlanActive =
            augDecision.shouldWorkFaction === true ||
            factionProgression.progressionAction?.type === "reputation";
        const factionWorkActive =
            progressionActive ||
            factionPlanActive;
        const allowHacknetExecution =
            levelingActive;

        return {
            priority: hacknetPriority,
            reserveMoney: 0,

            allowServerPurchases: bitNodeCapabilities.cloud.allowed === true,
            allowStockTrading:
                hacknetPriority === "income" ||
                shouldBn9AllowSideStockTrading(ns),
            allowHacknet: true,
            allowHacknetExecution,
            allowHomeRam: true,
            allowExePurchases: true,

            allowAugmentPurchases: true,
            allowFactionWork: factionWorkActive,
            allowFactionDonation: false,
            allowFactionJoin: true,
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,

            hacknetPrimary: true,
            hacknetReason: bitNodeCapabilities.hacknet.reason,
            factionWorkReason:
                progressionActive
                    ? "BN9 progression is active: faction work leads while Hacknet keeps compounding in the background."
                    : factionPlanActive
                        ? "BN9 faction work plan is active: contracts can build rep while UHM levels and Hacknet compounds."
                    : levelingActive
                        ? "BN9 leveling is active: script EXP leads while Hacknet keeps compounding in the background."
                        : "BN9 income is active: Hacknet and hashes lead the economy.",
            hacknetExecutionReason:
                allowHacknetExecution
                    ? "BN9 hacking-level gate is active: Hacknet server RAM may be borrowed for UHM XP farming."
                    : "BN9 preserves Hacknet server RAM for hash production outside level gates.",
            bitNodeCapabilities,
        };
    }

    if (roadmap === "crime-gang") {
        const resetPlan = buildResetPlan(ns);
        const factionProgression = buildFactionProgressionState(ns);

        if (resetPlan.ready) {
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
                allowReset: true,
                allowIntTravel: false,

                gangPrimary: true,
                gangReason: "BN2 queued enough augmentations; reset executor can install and restart startup.js.",
                resetReason: resetPlan.reason,
                bitNodeCapabilities,
            };
        }

        const redPillOwned = hasRedPill(ns);
        const world = getWorldDaemonStatus(ns);
        const finalDestroy =
            mode === "destroy-node" ||
            (
                redPillOwned &&
                world.readyToDestroy === true
            );

        if (finalDestroy) {
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

                gangPrimary: true,
                gangReason: "BN2 final state: Red Pill is installed and w0r1d_d43m0n is ready.",
                bitNodeCapabilities,
            };
        }

        const shouldProgress =
            mode === "progression" ||
            mode === "faction" ||
            priority === "progression" ||
            priority === "faction" ||
            factionProgression.recommendedMode === "progression";

        return {
            priority: shouldProgress ? "progression" : "income",
            reserveMoney: 0,

            allowServerPurchases: bitNodeCapabilities.cloud.allowed === true,
            allowStockTrading: false,
            allowHacknet: true,
            allowHomeRam: true,
            allowExePurchases: true,

            allowAugmentPurchases: true,
            allowFactionWork: shouldProgress,
            allowFactionDonation: false,
            allowFactionJoin: shouldProgress,
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,

            gangPrimary: true,
            gangReason:
                shouldProgress
                    ? "BN2 is entering personal augmentation progression: factions/backdoors can advance while gang and money engines continue in the background."
                    : "BN2 is gang-led: gang owns early augmentation progress while UHM and cloud servers stay focused on money.",
            bitNodeCapabilities,
        };
    }

    if (
        shouldFinishAugmentationNow(augDecision) &&
        mode !== "destroy-node" &&
        mode !== "reset-prep"
    ) {
        mode = "progression";
        priority = "progression";
    }

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

            allowReset: true,
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
            allowFactionJoin: true,
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,
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

            allowAugmentPurchases: allowMoneyModeAugmentPurchase,
            allowFactionWork: allowBackgroundFactionWork,
            backgroundFactionWork: allowBackgroundFactionWork,
            backgroundFactionReason:
                allowBackgroundFactionWork
                    ? (
                        augmentationTiming?.shouldFullFaction === true
                            ? augmentationTiming.reason
                            : factionWorkUpgradeGateReady
                            ? "Money mode can work faction reputation; cloud servers are maxed."
                            : "Money mode can work faction reputation in the background while server buildout remains the main priority."
                    )
                    : "No useful faction reputation work is currently planned.",
            allowFactionDonation: false,
            allowFactionJoin: true,
            allowBackdoors: true,
            allowReset: false,
            allowIntTravel: false,
        };
    }

    if (
        priority === "progression" ||
        priority === "faction" ||
        mode === "progression" ||
        mode === "faction"
    ) {
        return {
            priority:
                priority === "faction" || mode === "faction"
                    ? "faction"
                    : "progression",

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

            allowFactionJoin: true,

            allowBackdoors: true,

            allowReset:
                augDecision.shouldBuyAugment !== true &&
                augDecision.shouldWorkFaction !== true &&
                augDecision.shouldDonateFaction !== true,

            allowIntTravel: true,
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
        allowFactionJoin: true,
        allowBackdoors: true,
        allowReset: false,
        allowIntTravel: false,
    };
}

function isMoneyModeAugmentPurchaseAllowed(ns, augDecision) {
    if (augDecision?.shouldBuyAugment !== true) {
        return false;
    }

    if (isBitRunnersNeuroFluxLoop(augDecision)) {
        return true;
    }

    const stage =
        augDecision?.stagePolicy?.stage ?? "";

    if (
        [
            "side",
            "sector-12",
            "cybersec",
            "nitesec",
            "black-hand",
        ].includes(stage)
    ) {
        return true;
    }

    const price =
        Number(augDecision.price ?? 0);
    const money =
        ns.getPlayer().money;

    return (
        Number.isFinite(price) &&
        price > 0 &&
        price <= Math.max(25_000_000, money * 0.25)
    );
}

function isBitRunnersNeuroFluxLoop(augDecision) {
    return (
        augDecision?.stagePolicy?.stage === "bitrunners-neuroflux" &&
        augDecision?.targetFaction === "BitRunners" &&
        augDecision?.targetAugmentation === "NeuroFlux Governor"
    );
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

function chooseHacknetRoadmapMode(ns, rootedServers) {
    const augDecision = getAugmentationDecision(ns);
    const factionProgression = buildFactionProgressionState(ns);

    if (factionProgression.expPolicy?.shouldLevelNow === true) {
        return "exp";
    }

    if (shouldFinishAugmentationNow(augDecision)) {
        return "progression";
    }

    if (shouldBn9PushProgression(ns, augDecision, factionProgression)) {
        return "progression";
    }

    const moneyTarget = getBestMoneyTarget(ns, rootedServers);
    if (moneyTarget && isTargetReasonableForMoney(ns, moneyTarget)) {
        return "money";
    }

    return "money";
}

function chooseHacknetRoadmapPriority(ns, mode, augDecision, factionProgression) {
    if (mode === "exp" || factionProgression.expPolicy?.shouldLevelNow === true) {
        return "leveling";
    }

    if (
        mode === "progression" ||
        shouldFinishAugmentationNow(augDecision) ||
        shouldBn9PushProgression(ns, augDecision, factionProgression)
    ) {
        return "progression";
    }

    return "income";
}

function shouldBn9PushProgression(ns, augDecision, factionProgression) {
    if (!augDecision) return false;

    if (
        augDecision.shouldWorkFaction === true ||
        augDecision.shouldDonateFaction === true ||
        augDecision.shouldBuyAugment === true
    ) {
        return true;
    }

    return (
        factionProgression.currentBlocker !== "none" &&
        factionProgression.recommendedMode === "progression"
    );
}

function shouldBn9AllowSideStockTrading(ns) {
    const money =
        Number(ns.getPlayer()?.money) || 0;

    if (money < 200_000_000) return false;

    try {
        return typeof ns.stock !== "undefined";
    } catch {
        return false;
    }
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

    if (
        mode === "money" ||
        mode === "progression" ||
        mode === "faction"
    ) {
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
                    purpose: "background",
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
            getBestExpTarget(ns, rootedServers, {
                phase: "exp",
                lane: "exp",
                purpose: "leveling",
            }) ||
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
                purpose: "leveling",
            },
            laneTargets: {
                primary: null,
                secondary: null,
                exp: expTarget,
                prep: null,
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
    const bitNodeCapabilities =
        getBitNodeCapabilities(ns);

    return {
        singularity: true,
        sleeves: hasSleevesAccess(ns),
        corporations: hasCorporationAccess(ns),
        gangs: hasGangAccess(ns),
        bladeburner: hasBladeburnerAccess(ns),
        sourceFiles: getOwnedSourceFiles(ns),
        bitNode: bitNodeCapabilities,
        cloudServers: bitNodeCapabilities.cloud.allowed === true,
        hacknet: bitNodeCapabilities.hacknet.allowed === true,
        hacknetHashes: bitNodeCapabilities.hacknet.hashes === true,
    };
}

function getOwnedSourceFiles(ns) {
    const candidates = [];

    try {
        candidates.push(ns.getOwnedSourceFiles?.());
    } catch {
        // Some APIs can be unavailable before the right Source-File is active.
    }

    try {
        candidates.push(ns.singularity?.getOwnedSourceFiles?.());
    } catch {
        // Singularity may not be available in every BitNode/startup phase.
    }

    try {
        const resetInfo = ns.getResetInfo?.();
        candidates.push(
            resetInfo?.ownedSF,
            resetInfo?.ownedSourceFiles,
            resetInfo?.sourceFiles
        );
    } catch {
        // Reset info shape differs across Bitburner versions.
    }

    for (const candidate of candidates) {
        const sourceFiles = normalizeOwnedSourceFiles(candidate);
        if (sourceFiles.length > 0) return sourceFiles;
    }

    return [];
}

function normalizeOwnedSourceFiles(rawSourceFiles) {
    if (!rawSourceFiles) return [];

    const entries = Array.isArray(rawSourceFiles)
        ? rawSourceFiles
        : Object.entries(rawSourceFiles).map(([key, value]) => {
            if (value && typeof value === "object") return { n: key, ...value };
            return { n: key, lvl: value };
        });

    return entries
        .map(normalizeSourceFileEntry)
        .filter(isValidSourceFile)
        .sort((a, b) => a.n - b.n);
}

function normalizeSourceFileEntry(sourceFile) {
    if (Array.isArray(sourceFile)) {
        return {
            n: Number(sourceFile[0]),
            lvl: Number(sourceFile[1]),
        };
    }

    return {
        n: Number(
            sourceFile?.n ??
            sourceFile?.number ??
            sourceFile?.bitNode ??
            sourceFile?.bitnode ??
            sourceFile?.sourceFile ??
            sourceFile?.sourceFileNumber ??
            sourceFile?.id ??
            0
        ),
        lvl: Number(
            sourceFile?.lvl ??
            sourceFile?.level ??
            sourceFile?.levelOwned ??
            sourceFile?.sfLevel ??
            sourceFile?.sourceFileLevel ??
            sourceFile?.value ??
            0
        ),
    };
}

function isValidSourceFile(sourceFile) {
    return (
        Number.isFinite(sourceFile.n) &&
        sourceFile.n > 0 &&
        Number.isFinite(sourceFile.lvl) &&
        sourceFile.lvl > 0
    );
}

function getOwnedSourceFileLevel(ns, sourceFileNumber) {
    return getOwnedSourceFiles(ns).reduce((best, sourceFile) => {
        if (sourceFile.n !== sourceFileNumber) return best;
        return Math.max(best, sourceFile.lvl);
    }, 0);
}

export function hasSingularityAccess() {
    return true;
}

export function hasSleevesAccess() {
    return false;
}

export function hasCorporationAccess() {
    return false;
}

export function hasGangAccess(ns) {
    if (!ns?.gang) return false;

    try {
        if (ns.gang.inGang?.() === true) return true;
    } catch {
        // Fall through to Source-File / BitNode checks.
    }

    try {
        if (ns.getResetInfo?.()?.currentNode === 2) return true;
    } catch {
        // Fall through to Source-File checks.
    }

    return getOwnedSourceFileLevel(ns, 2) > 0;
}

export function hasBladeburnerAccess() {
    return false;
}

function hasRedPill(ns) {
    try {
        return ns.singularity
            .getOwnedAugmentations(false)
            .includes("The Red Pill");
    } catch {
        return false;
    }
}

function shouldBn2BuildMoneyBeforeDaedalus(factionProgression) {
    if (factionProgression?.currentFactionStage !== "daedalus") {
        return false;
    }

    const req =
        factionProgression.daedalusRequirements ?? {};

    return req.moneyReady === false;
}
