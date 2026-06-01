// /lib/daemon/target-intelligence.js

const BEGINNER_TARGETS = new Set([
    "n00dles",
    "foodnstuff",
    "sigma-cosmetics",
    "joesguns",
]);

const DEFAULT_TARGET_HOLD_MS = 5 * 60 * 1000;

export function chooseStrategicMoneyTarget(
    ns,
    rootedServers,
    currentTarget = null,
    options = {},
) {
    return buildStrategicMoneyTargetPlan(
        ns,
        rootedServers,
        currentTarget,
        options,
    ).target;
}

export function buildStrategicMoneyTargetPlan(
    ns,
    rootedServers,
    currentTarget = null,
    options = {},
) {
    const hacking = ns.getHackingLevel();
    const minHoldMs = options.minHoldMs ?? DEFAULT_TARGET_HOLD_MS;
    const targetAgeMs = options.targetAgeMs ?? Number.MAX_SAFE_INTEGER;
    const forceTarget = options.forceTarget ?? null;

    const candidateServers = new Set(rootedServers ?? []);

    if (currentTarget) {
        candidateServers.add(currentTarget);
    }

    const candidates = [...candidateServers]
        .filter((server) => isMoneyCandidate(ns, server))
        .map((server) => buildCandidate(ns, server))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);

    const best = candidates[0] ?? null;

    const current =
        candidates.find((x) => x.server === currentTarget) ??
        (currentTarget && isMoneyCandidate(ns, currentTarget)
            ? buildCandidate(ns, currentTarget)
            : null);

    if (forceTarget && isMoneyCandidate(ns, forceTarget)) {
        return {
            target: forceTarget,
            previousTarget: currentTarget,
            changed: forceTarget !== currentTarget,
            blockedSwap: false,
            reason: "manual force-target override",
            targetStability: buildTargetStability(currentTarget, forceTarget, targetAgeMs, minHoldMs, false),
            bestCandidate: best,
            currentCandidate: current,
            candidates: candidates.slice(0, 10),
        };
    }

    const fallbackTarget = best?.server ?? currentTarget ?? "n00dles";

    if (!current) {
        return {
            target: fallbackTarget,
            previousTarget: currentTarget,
            changed: fallbackTarget !== currentTarget,
            blockedSwap: false,
            reason: "current target invalid or missing",
            targetStability: buildTargetStability(currentTarget, fallbackTarget, targetAgeMs, minHoldMs, false),
            bestCandidate: best,
            currentCandidate: current,
            candidates: candidates.slice(0, 10),
        };
    }

    if (!best) {
        return {
            target: currentTarget,
            previousTarget: currentTarget,
            changed: false,
            blockedSwap: false,
            reason: "no better candidate found",
            targetStability: buildTargetStability(currentTarget, currentTarget, targetAgeMs, minHoldMs, false),
            bestCandidate: null,
            currentCandidate: current,
            candidates: [],
        };
    }

    const currentIsBeginnerTrap =
        BEGINNER_TARGETS.has(currentTarget) &&
        hacking >= 150;

    const bestIsMuchBetter =
        best.score > current.score * 1.35;

    const wantsSwap =
        best.server !== currentTarget &&
        (currentIsBeginnerTrap || bestIsMuchBetter);

    const blockedByHoldTimer =
        wantsSwap &&
        !currentIsBeginnerTrap &&
        targetAgeMs < minHoldMs;

    if (blockedByHoldTimer) {
        return {
            target: currentTarget,
            previousTarget: currentTarget,
            changed: false,
            blockedSwap: true,
            blockedTarget: best.server,
            reason: `blocked target swap by hold timer: ${currentTarget} -> ${best.server}`,
            targetStability: buildTargetStability(currentTarget, best.server, targetAgeMs, minHoldMs, true),
            bestCandidate: best,
            currentCandidate: current,
            candidates: candidates.slice(0, 10),
        };
    }

    if (wantsSwap) {
        return {
            target: best.server,
            previousTarget: currentTarget,
            changed: true,
            blockedSwap: false,
            reason: currentIsBeginnerTrap
                ? `leaving beginner target after hacking ${hacking}`
                : `better target found: ${best.server}`,
            targetStability: buildTargetStability(currentTarget, best.server, targetAgeMs, minHoldMs, false),
            bestCandidate: best,
            currentCandidate: current,
            candidates: candidates.slice(0, 10),
        };
    }

    return {
        target: currentTarget,
        previousTarget: currentTarget,
        changed: false,
        blockedSwap: false,
        reason: "current target remains strategically acceptable",
        targetStability: buildTargetStability(currentTarget, currentTarget, targetAgeMs, minHoldMs, false),
        bestCandidate: best,
        currentCandidate: current,
        candidates: candidates.slice(0, 10),
    };
}

function buildCandidate(ns, server) {
    const maxMoney = ns.getServerMaxMoney(server);
    const money = ns.getServerMoneyAvailable(server);
    const weakenTime = ns.getWeakenTime(server);
    const chance = ns.hackAnalyzeChance(server);
    const requiredHacking = ns.getServerRequiredHackingLevel(server);
    const minSecurity = ns.getServerMinSecurityLevel(server);
    const security = ns.getServerSecurityLevel(server);
    const growth = ns.getServerGrowth(server);
    const score = scoreStrategicMoneyTarget(ns, server);

    return {
        server,
        score,
        maxMoney,
        money,
        moneyRatio: maxMoney > 0 ? money / maxMoney : 0,
        weakenTime,
        chance,
        requiredHacking,
        minSecurity,
        security,
        securityDelta: security - minSecurity,
        growth,
        reason: buildCandidateReason(ns, {
            server,
            score,
            maxMoney,
            weakenTime,
            chance,
            requiredHacking,
            securityDelta: security - minSecurity,
            growth,
        }),
    };
}

function buildCandidateReason(ns, candidate) {
    return [
        `score=${formatScore(candidate.score)}`,
        `money=${formatMoney(candidate.maxMoney)}`,
        `chance=${formatPercent(candidate.chance)}`,
        `weak=${formatDuration(candidate.weakenTime)}`,
        `sec+${candidate.securityDelta.toFixed(1)}`,
        `growth=${candidate.growth}`,
    ].join(" ");
}

function buildTargetStability(
    currentTarget,
    proposedTarget,
    targetAgeMs,
    minHoldMs,
    blockedSwap,
) {
    return {
        currentTarget,
        proposedTarget,
        targetAgeMs,
        minHoldMs,
        holdSatisfied: targetAgeMs >= minHoldMs,
        blockedSwap,
        remainingHoldMs: Math.max(0, minHoldMs - targetAgeMs),
    };
}

function isMoneyCandidate(ns, server) {
    try {
        if (!ns.serverExists(server)) return false;
        if (!ns.hasRootAccess(server)) return false;
        if (server === "home") return false;
        if (server.startsWith("pserv-")) return false;

        const required = ns.getServerRequiredHackingLevel(server);
        const hacking = ns.getHackingLevel();

        if (required > hacking) return false;
        if (ns.getServerMaxMoney(server) <= 0) return false;
        if (ns.getServerGrowth(server) <= 0) return false;

        return true;
    } catch {
        return false;
    }
}

function scoreStrategicMoneyTarget(ns, server) {
    try {
        const maxMoney = Math.max(1, ns.getServerMaxMoney(server));
        const growth = Math.max(1, ns.getServerGrowth(server));
        const chance = Math.max(0.01, ns.hackAnalyzeChance(server));
        const weakenTime = Math.max(1, ns.getWeakenTime(server));
        const minSec = Math.max(1, ns.getServerMinSecurityLevel(server));
        const sec = Math.max(minSec, ns.getServerSecurityLevel(server));
        const required = Math.max(1, ns.getServerRequiredHackingLevel(server));
        const hacking = Math.max(1, ns.getHackingLevel());
        const money = Math.max(0, ns.getServerMoneyAvailable(server));

        const moneyRatio = maxMoney > 0 ? money / maxMoney : 0;

        const prepPenalty =
            1 +
            Math.max(0, sec - minSec) * 0.25 +
            Math.max(0, 0.75 - moneyRatio) * 2;

        const timePenalty = weakenTime / 1000;
        const levelPenalty = Math.max(1, required / hacking);

        const moneyWeight = Math.log10(maxMoney + 1);
        const growthWeight = Math.log2(growth + 1);

        return (
            maxMoney *
            moneyWeight *
            growthWeight *
            chance
        ) / (
            timePenalty *
            prepPenalty *
            levelPenalty
        );
    } catch {
        return 0;
    }
}

function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value) {
    if (!Number.isFinite(value)) return "0";
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}k`;
    return value.toFixed(2);
}

function formatMoney(value) {
    if (!Number.isFinite(value)) return "$0";
    if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}t`;
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}b`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}k`;
    return `$${value.toFixed(0)}`;
}

function formatDuration(ms) {
    if (!Number.isFinite(ms)) return "0s";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes <= 0) {
        return `${remainingSeconds}s`;
    }

    return `${minutes}m${remainingSeconds}s`;
}