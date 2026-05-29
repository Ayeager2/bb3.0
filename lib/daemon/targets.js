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

    if (targetOverride && canUseTarget(ns, targetOverride)) return targetOverride;
    if (mode === "exp") return getBestExpTarget(ns, rootedServers);
    if (mode === "prep") return getBestPrepTarget(ns, rootedServers);

    return getBestMoneyTarget(ns, rootedServers);
}

export function getBestMoneyTarget(ns, servers) {
    const cleanServers = [...sanitizeServerSet(ns, servers)];

    const candidates = cleanServers.filter(server => {
        try {
            return (
                ns.getServerMaxMoney(server) > 0 &&
                ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() &&
                ns.getServerGrowth(server) > 0 &&
                ns.hasRootAccess(server)
            );
        } catch {
            return false;
        }
    });

    const reasonable = candidates.filter(server => {
        try {
            return isTargetReasonableForMoney(ns, server);
        } catch {
            return false;
        }
    });

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

export function getBestPrepTarget(ns, servers) {
    const cleanServers = [...sanitizeServerSet(ns, servers)];

    const candidates = cleanServers.filter(server => {
        try {
            return (
                ns.getServerMaxMoney(server) > 0 &&
                ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() &&
                ns.hasRootAccess(server) &&
                ns.getWeakenTime(server) <= CONFIG.prepTargetMaxWeakenTimeMs
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
                    ns.getServerMaxMoney(server) > 0 &&
                    ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() &&
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

export function getBestExpTarget(ns, servers) {
    const preferred = ["joesguns", "n00dles", "foodnstuff", "sigma-cosmetics"];
    const availablePreferred = preferred.find(server => canUseTarget(ns, server));

    if (availablePreferred) return availablePreferred;

    const cleanServers = [...sanitizeServerSet(ns, servers)];

    return cleanServers
        .filter(server => canUseTarget(ns, server))
        .sort((a, b) => scoreExpTarget(ns, b) - scoreExpTarget(ns, a))[0] ?? "n00dles";
}

export function scoreExpTarget(ns, server) {
    if (!canUseTarget(ns, server)) return 0;

    const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    const growth = Math.max(1, safeGetServerGrowth(ns, server));

    return growth / (weakenTime * minSec);
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
            ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()
        );
    } catch {
        return false;
    }
}