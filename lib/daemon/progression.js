import { CONFIG } from "/lib/daemon/config.js";
import { canUseTarget } from "/lib/daemon/targets.js";

export function getBn4VictoryPlan(ns) {
    const hacking = ns.getHackingLevel();
    const player = ns.getPlayer();
    const factions = player.factions ?? [];

    const hasDaedalus = factions.includes("Daedalus");
    const ownedAugs = getOwnedAugmentationsSafe(ns);

    const hasRedPill =
        ownedAugs.includes("The Red Pill");

    const worldDaemon = "w0r1d_d43m0n";
    const canUseWorldDaemon = canUseTarget(ns, worldDaemon);

    let stage = "grow-economy";
    let nextAction = "Build money, hacking level, RAM, and augment count.";

    if (hacking < 2500) {
        stage = "level-hacking";
        nextAction = "Prioritize EXP until hacking is high enough for late-game faction progression.";
    } else if (!hasDaedalus) {
        stage = "join-daedalus";
        nextAction = "Meet Daedalus requirements and accept invitation when available.";
    } else if (!hasRedPill) {
        stage = "get-red-pill";
        nextAction = "Grind Daedalus reputation and buy The Red Pill.";
    } else if (hacking < 3000) {
        stage = "final-leveling";
        nextAction = "Push hacking to 3000 for w0r1d_d43m0n.";
    } else if (!canUseWorldDaemon) {
        stage = "prep-world-daemon";
        nextAction = "Find/root/backdoor path toward w0r1d_d43m0n.";
    } else {
        stage = "destroy-bitnode";
        nextAction = "Hack w0r1d_d43m0n and destroy the BitNode.";
    }

    return {
        stage,
        nextAction,
        hacking,
        hackingTarget: 3000,
        hasDaedalus,
        hasRedPill,
        worldDaemon,
        canUseWorldDaemon,
    };
}

export function getBn4Readiness(ns) {
    const player = ns.getPlayer();
    const hacking = ns.getHackingLevel();
    const money = player.money;
    const homeRam = ns.getServerMaxRam("home");
    const ownedAugs = getOwnedAugmentationsSafe(ns);

    const hackingReady = hacking >= CONFIG.bn4Plan.minHackingLevel;
    const moneyReady = money >= CONFIG.bn4Plan.minMoney;
    const homeRamReady = homeRam >= CONFIG.bn4Plan.desiredHomeRamGb;
    const augReady = ownedAugs.length >= CONFIG.bn4Plan.desiredAugmentCount;

    const readyCount = [hackingReady, moneyReady, homeRamReady, augReady].filter(Boolean).length;

    return {
        targetBitNode: CONFIG.bn4Plan.targetBitNode,
        goal: CONFIG.bn4Plan.goal,
        hacking,
        hackingTarget: CONFIG.bn4Plan.minHackingLevel,
        hackingReady,
        money,
        moneyTarget: CONFIG.bn4Plan.minMoney,
        moneyReady,
        homeRam,
        homeRamTarget: CONFIG.bn4Plan.desiredHomeRamGb,
        homeRamReady,
        augmentCount: ownedAugs.length,
        augmentTarget: CONFIG.bn4Plan.desiredAugmentCount,
        augReady,
        readyCount,
        totalChecks: 4,
        ready: hackingReady && moneyReady && homeRamReady && augReady,
    };
}

export function getOwnedAugmentationsSafe(ns) {
    try {
        const resetInfo = ns.getResetInfo();
        if (Array.isArray(resetInfo?.ownedAugs)) {
            return resetInfo.ownedAugs;
        }
    } catch (error) {
    console.error(error);
}

    try {
        return ns.singularity.getOwnedAugmentations(false);
    } catch (error) {
    console.error(error);
}

    return [];
}