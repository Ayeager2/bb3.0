import { CONFIG } from "/lib/daemon/config.js";

export function getBn4VictoryPlan(ns) {
    const hacking = ns.getHackingLevel();
    const player = ns.getPlayer();
    const factions = player.factions ?? [];

    const hasDaedalus = factions.includes("Daedalus");
    const ownedAugs = getOwnedAugmentationsSafe(ns);
    const hasRedPill = ownedAugs.includes("The Red Pill");

    const world = getWorldDaemonStatus(ns);

    const plan = buildBn4StagePlan({
        hacking,
        hasDaedalus,
        hasRedPill,
        world,
    });

    return {
        stage: plan.stage,
        nextAction: plan.nextAction,
        hacking,
        hackingTarget: world.requiredHack,
        hasDaedalus,
        hasRedPill,
        worldDaemon: world.server,
        world,
        canUseWorldDaemon: world.readyToDestroy,
    };
}

function buildBn4StagePlan({
    hacking,
    hasDaedalus,
    hasRedPill,
    world,
}) {
    if (hacking < 2500) {
        return {
            stage: "level-hacking",
            nextAction: "Prioritize EXP only until faction progression requirements are met.",
        };
    }

    if (!hasDaedalus) {
        return {
            stage: "join-daedalus",
            nextAction: "Meet Daedalus requirements and accept invitation.",
        };
    }

    if (!hasRedPill) {
        return {
            stage: "get-red-pill",
            nextAction: "Grind Daedalus reputation and buy The Red Pill.",
        };
    }

    if (!world.exists) {
        return {
            stage: "find-world-daemon",
            nextAction: "Discover path to w0r1d_d43m0n.",
        };
    }

    if (!world.hackReady) {
        return {
            stage: "final-leveling",
            nextAction: `Push hacking to ${world.requiredHack} for w0r1d_d43m0n.`,
        };
    }

    if (!world.rooted) {
        return {
            stage: "root-world-daemon",
            nextAction: "Root w0r1d_d43m0n.",
        };
    }

    return {
        stage: "destroy-bitnode",
        nextAction: "Hack w0r1d_d43m0n and destroy the BitNode.",
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

export function getWorldDaemonStatus(ns) {
    const server = "w0r1d_d43m0n";

    const exists = ns.serverExists(server);
    const hacking = ns.getHackingLevel();

    const requiredHack = exists
        ? ns.getServerRequiredHackingLevel(server)
        : Number.MAX_SAFE_INTEGER;

    const rooted = exists && ns.hasRootAccess(server);
    const backdoored = exists && ns.getServer(server).backdoorInstalled === true;
    const hackReady = exists && hacking >= requiredHack;

    return {
        server,
        exists,
        hacking,
        requiredHack,
        hackReady,
        rooted,
        backdoored,
        readyToDestroy: exists && hackReady && rooted,
    };
}