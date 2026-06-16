///lib/daemon/targets.js
import { filterTargetsByStrategy } from "./target-tiers.js";
import { CONFIG } from "/lib/daemon/config.js";
import { sanitizeServerSet } from "/lib/daemon/network.js";

import {
    safeServerExists,
    safeGetServerMaxMoney,
    safeGetServerMoneyAvailable,
    safeGetServerSecurityLevel,
    safeGetServerMinSecurityLevel,
    safeGetServerGrowth,
    safeGetWeakenTime,
    safeHackAnalyzeChance,
} from "/lib/daemon/safe.js";

export function getDaemonTarget(ns, rootedServers, mode, targetOverride) {
    rootedServers = sanitizeServerSet(ns, rootedServers);

    if (mode === "exp") {
        if (
            targetOverride &&
            canUseTarget(ns, targetOverride) &&
            isExpTargetInCurrentBand(ns, targetOverride, { purpose: "leveling" })
        ) {
            return targetOverride;
        }

        return getBestExpTarget(ns, rootedServers, {
            purpose: "leveling",
        });
    }

    if (targetOverride && canUseTarget(ns, targetOverride)) return targetOverride;
    if (mode === "prep") return getBestPrepTarget(ns, rootedServers);

    return getBestMoneyTarget(ns, rootedServers);
}

export function getBestMoneyTarget(
    ns,
    servers,
    options = {}
) {
    const cleanServers = filterTargetsByStrategy(
        ns,
        sanitizeServerSet(ns, servers),
        {
            phase: options.phase ?? "scaling",
            lane: options.lane ?? "money",
        }
    );
    const candidates = cleanServers.filter(server => {
        try {
            return (
                safeGetServerMaxMoney(ns, server) > 0 &&
                safeGetRequiredHackingLevel(ns, server) <= ns.getHackingLevel() &&
                safeGetServerGrowth(ns, server) > 0 &&
                ns.hasRootAccess(server)
            );
        } catch {
            return false;
        }
    });

    const reasonable = candidates.filter(server => isTargetReasonableForMoney(ns, server));
    const pool = reasonable.length > 0 ? reasonable : candidates;

    return pool.sort((a, b) => scoreMoneyTarget(ns, b) - scoreMoneyTarget(ns, a))[0] ?? "n00dles";
}

export function isTargetReasonableForMoney(ns, server) {
    const stats = getTargetStats(ns, server);

    return (
        stats.prepNeed <= CONFIG.maxPrepNeedForMoneyTarget &&
        stats.securityDiff <= CONFIG.maxSecurityDiffForMoneyTarget &&
        stats.weakenTime <= CONFIG.maxWeakenTimeForMoneyTargetMs
    );
}

export function scoreMoneyTarget(ns, server) {
    const stats = getTargetStats(ns, server);

    if (!canUseTarget(ns, server)) return 0;

    const moneyValue = Math.max(1, stats.maxMoney);
    const chance = Math.max(0.01, safeHackAnalyzeChance(ns, server));
    const growth = Math.max(1, safeGetServerGrowth(ns, server));
    const weakenTime = Math.max(1, stats.weakenTime);
    const minSec = Math.max(1, stats.minSecurity);

    const prepPenalty =
        1 +
        stats.prepNeed * 4 +
        Math.max(0, stats.securityDiff) * 0.35 +
        (1 - stats.moneyPercent) * 3;

    return (moneyValue * chance * growth) / (weakenTime * minSec * prepPenalty);
}

export function getBestPrepTarget(
    ns,
    servers,
    options = {}
) {
    const cleanServers = filterTargetsByStrategy(
        ns,
        sanitizeServerSet(ns, servers),
        {
            phase: options.phase ?? "scaling",
            lane: options.lane ?? "prep",
        }
    );
    const candidates = cleanServers.filter(server => {
        try {
            return (
                safeGetServerMaxMoney(ns, server) > 0 &&
                safeGetRequiredHackingLevel(ns, server) <= ns.getHackingLevel() &&
                ns.hasRootAccess(server) &&
                safeGetWeakenTime(ns, server) <= CONFIG.prepTargetMaxWeakenTimeMs
            );
        } catch {
            return false;
        }
    });

    const pool = candidates.length > 0
        ? candidates
        : cleanServers.filter(server => {
            try {
                return (
                    safeGetServerMaxMoney(ns, server) > 0 &&
                    safeGetRequiredHackingLevel(ns, server) <= ns.getHackingLevel() &&
                    ns.hasRootAccess(server)
                );
            } catch {
                return false;
            }
        });

    return pool.sort((a, b) => scorePrepTarget(ns, b) - scorePrepTarget(ns, a))[0] ?? "n00dles";
}

export function scorePrepTarget(ns, server) {
    const stats = getTargetStats(ns, server);

    const value = Math.max(1, stats.maxMoney);
    const timePenalty = Math.max(1, stats.weakenTime);
    const prepPenalty = 1 + stats.prepNeed * 2 + stats.securityDiff * 0.2;

    return value / (timePenalty * prepPenalty);
}

export function getBestExpTarget(ns, servers, options = {}) {
    const purpose = options.purpose ?? "background";
    const cleanServers = filterTargetsByStrategy(
        ns,
        sanitizeServerSet(ns, servers),
        {
            phase: options.phase ?? "scaling",
            lane: options.lane ?? "exp",
        }
    );
    const hacking = ns.getHackingLevel();

    const candidates = cleanServers
        .filter(server => canUseTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetServerGrowth(ns, server) > 0)
        .filter(server => safeGetWeakenTime(ns, server) <= getMaxExpWeakenTime(hacking));

    const currentBandCandidates =
        purpose === "leveling"
            ? candidates.filter(server => isExpTargetInCurrentBand(ns, server, { purpose }))
            : candidates;

    const pool = currentBandCandidates.length > 0
        ? currentBandCandidates
        : candidates.length > 0
            ? candidates
            : cleanServers.filter(server => canUseTarget(ns, server));

    return pool
        .sort((a, b) =>
            scoreExpTarget(ns, b, { purpose }) -
            scoreExpTarget(ns, a, { purpose })
        )[0] ?? "joesguns";
}

export function scoreExpTarget(ns, server, options = {}) {
    if (!canUseTarget(ns, server)) return 0;

    const purpose = options.purpose ?? "background";
    const hacking = Math.max(1, ns.getHackingLevel());
    const requiredHack = Math.max(1, safeGetRequiredHackingLevel(ns, server));

    const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
    const hackTime = Math.max(1, safeGetHackTime(ns, server));
    const growTime = Math.max(1, safeGetGrowTime(ns, server));
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    const sec = Math.max(minSec, safeGetServerSecurityLevel(ns, server));
    const growth = Math.max(1, safeGetServerGrowth(ns, server));
    const maxMoney = Math.max(1, safeGetServerMaxMoney(ns, server));
    const chance = Math.max(0.01, safeHackAnalyzeChance(ns, server));
    const expPerAction = estimateHackExp(ns, server);

    const timeSeconds = weakenTime / 1000;
    const securityGap = Math.max(0, sec - minSec);
    const securityPenalty = 1 + securityGap * 0.35;
    const liveExpPerSecond = estimateLiveExpPerSecond({
        expPerAction,
        hackTime,
        growTime,
        weakenTime,
        chance,
        securityGap,
    });

    const levelRatio = requiredHack / hacking;
    const churnPenalty =
        purpose === "leveling"
            ? getFastTargetChurnPenalty(timeSeconds, levelRatio)
            : 1;

    const levelingBandBonus =
        levelRatio >= 0.65 && levelRatio <= 1.00 ? 5.0 :
            levelRatio >= 0.40 && levelRatio < 0.65 ? 3.0 :
                levelRatio >= 0.20 && levelRatio < 0.40 ? 1.0 :
                    0.05;

    const backgroundBandBonus =
        levelRatio >= 0.15 && levelRatio <= 0.65 ? 2.0 :
            levelRatio < 0.15 ? 0.35 :
                0.75;

    const levelBandBonus =
        purpose === "leveling"
            ? levelingBandBonus
            : backgroundBandBonus;

    const outgrownPenalty = getOutgrownPenalty(levelRatio);
    const timePenalty =
        purpose === "leveling"
            ? Math.pow(timeSeconds, 0.65)
            : Math.pow(timeSeconds, 0.90);

    const moneyScale = Math.log10(maxMoney + 1);
    const growthScale = Math.sqrt(growth);
    const legacyShape =
        moneyScale *
        growthScale *
        chance *
        levelBandBonus *
        churnPenalty *
        (
            purpose === "leveling"
                ? outgrownPenalty
                : Math.max(outgrownPenalty, 0.20)
        );

    return (
        liveExpPerSecond *
        legacyShape
    ) / (Math.max(1, timePenalty) * securityPenalty);
}

export function isExpTargetInCurrentBand(ns, server, options = {}) {
    const purpose = options.purpose ?? "background";
    if (purpose !== "leveling") return true;

    const hacking = Math.max(1, ns.getHackingLevel());
    const requiredHack = Math.max(1, safeGetRequiredHackingLevel(ns, server));
    return requiredHack >= getMinimumLevelingTargetHack(hacking);
}

export function getMinimumLevelingTargetHack(hacking) {
    if (hacking < 250) return 1;
    if (hacking < 750) return Math.floor(hacking * 0.10);
    if (hacking < 1500) return Math.floor(hacking * 0.18);
    if (hacking < 2500) return Math.floor(hacking * 0.24);
    return Math.floor(hacking * 0.30);
}

function getFastTargetChurnPenalty(timeSeconds, levelRatio) {
    if (levelRatio >= 0.20) return 1;
    if (timeSeconds <= 15) return 0.05;
    if (timeSeconds <= 30) return 0.15;
    if (timeSeconds <= 60) return 0.40;
    return 0.75;
}

export function getOutgrownPenalty(levelRatio) {
    if (levelRatio >= 0.20) return 1;
    if (levelRatio >= 0.10) return 0.35;
    if (levelRatio >= 0.05) return 0.10;
    return 0.01;
}

export function prepNeed(ns, server) {
    return getTargetStats(ns, server).prepNeed;
}

export function getTargetStats(ns, server) {
    if (!server || !safeServerExists(ns, server)) {
        return {
            maxMoney: 0,
            money: 0,
            moneyPercent: 0,
            minSecurity: 1,
            security: 1,
            securityDiff: 0,
            weakenTime: 1,
            prepNeed: 999,
        };
    }

    const maxMoney = safeGetServerMaxMoney(ns, server);
    const money = safeGetServerMoneyAvailable(ns, server);
    const moneyPercent = maxMoney > 0 ? money / maxMoney : 0;

    const minSecurity = safeGetServerMinSecurityLevel(ns, server);
    const security = safeGetServerSecurityLevel(ns, server);
    const securityDiff = Math.max(0, security - minSecurity);
    const weakenTime = safeGetWeakenTime(ns, server);

    const moneyNeed = maxMoney > 0 ? 1 - moneyPercent : 0;
    const securityNeed = securityDiff / Math.max(1, minSecurity);

    return {
        maxMoney,
        money,
        moneyPercent,
        minSecurity,
        security,
        securityDiff,
        weakenTime,
        prepNeed: moneyNeed + securityNeed,
    };
}

export function canUseTarget(ns, server) {
    try {
        return (
            safeServerExists(ns, server) &&
            ns.hasRootAccess(server) &&
            safeGetRequiredHackingLevel(ns, server) <= ns.getHackingLevel()
        );
    } catch {
        return false;
    }
}

export function getMaxExpWeakenTime(hacking) {
    if (hacking < 250) return 60 * 1000;
    if (hacking < 750) return 2 * 60 * 1000;
    if (hacking < 1500) return 5 * 60 * 1000;
    if (hacking < 2500) return 10 * 60 * 1000;
    return 20 * 60 * 1000;
}

export function safeGetRequiredHackingLevel(ns, server) {
    try {
        return ns.getServerRequiredHackingLevel(server);
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

function safeGetHackTime(ns, server) {
    try {
        return ns.getHackTime(server);
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

function safeGetGrowTime(ns, server) {
    try {
        return ns.getGrowTime(server);
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

function estimateHackExp(ns, server) {
    try {
        if (ns.formulas?.hacking?.hackExp) {
            return Math.max(0, ns.formulas.hacking.hackExp(ns.getServer(server), ns.getPlayer()));
        }
    } catch {
        // Fall through to the approximation below.
    }

    const baseDifficulty = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    return 3 + baseDifficulty * 0.3;
}

function estimateLiveExpPerSecond({
    expPerAction,
    hackTime,
    growTime,
    weakenTime,
    chance,
    securityGap,
}) {
    const hackExp = expPerAction * Math.max(0.25, chance);
    const growExp = expPerAction;
    const weakenExp = expPerAction;
    const highSecurityPenalty = 1 + Math.max(0, securityGap - 10) * 0.10;

    return (
        hackExp / Math.max(1, hackTime / 1000) +
        growExp / Math.max(1, growTime / 1000) +
        weakenExp / Math.max(1, weakenTime / 1000)
    ) / highSecurityPenalty;
}

export function getSecondaryMoneyTarget(
    ns,
    servers,
    primaryTarget,
    options = {}
) {
    const cleanServers = filterTargetsByStrategy(
        ns,
        sanitizeServerSet(ns, servers),
        {
            phase: options.phase ?? "scaling",
            lane: options.lane ?? "secondary",
        }
    );

    const candidates = cleanServers
        .filter(server => server !== primaryTarget)
        .filter(server => canUseTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetServerGrowth(ns, server) > 0)
        .filter(server => isTargetReasonableForMoney(ns, server));

    const pool =
        candidates.length > 0
            ? candidates
            : cleanServers
                .filter(server => server !== primaryTarget)
                .filter(server => canUseTarget(ns, server));

    return pool.sort(
        (a, b) =>
            scoreMoneyTarget(ns, b) -
            scoreMoneyTarget(ns, a)
    )[0] ?? null;
}
