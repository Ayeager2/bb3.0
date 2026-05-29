import {
    safeServerExists,
    isUsableTarget,
    safeGetServerMaxMoney,
    safeGetServerMoneyAvailable,
    safeGetServerSecurityLevel,
    safeGetServerMinSecurityLevel,
    safeGetServerGrowth,
    safeGetWeakenTime,
    safeHackAnalyzeChance,
} from "/lib/uhm/safe.js";

import {
    sanitizeServerSet,
} from "/lib/uhm/network.js";

export function getValidTargetOrFallback(ns, rootedServers, target, mode) {
    if (target && isUsableTarget(ns, target)) return target;

    if (mode === "exp") return getBestExpTarget(ns, rootedServers);

    return getBestTarget(ns, rootedServers);
}

export function getSecondaryMoneyTarget(ns, servers, primaryTarget) {
    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => server !== primaryTarget)
        .filter(server => isUsableTarget(ns, server))
        .filter(server => {
            try {
                return ns.getServerMaxMoney(server) > 0 && ns.getServerGrowth(server) > 0;
            } catch {
                return false;
            }
        })
        .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];
}

export function getBestTarget(ns, servers) {
    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0 && safeGetServerGrowth(ns, server) > 0)
        .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];
}

export function scoreTarget(ns, server) {
    if (!isUsableTarget(ns, server)) return 0;

    const money = safeGetServerMaxMoney(ns, server);
    const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
    const chance = safeHackAnalyzeChance(ns, server);
    const growth = safeGetServerGrowth(ns, server);
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));

    return (money * chance * growth) / (weakenTime * minSec);
}

export function getBestExpTarget(ns, servers) {
    const cleanServers = sanitizeServerSet(ns, servers);

    const candidates = [...cleanServers]
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetWeakenTime(ns, server) <= 10 * 60 * 1000);

    const pool = candidates.length > 0
        ? candidates
        : [...cleanServers].filter(server => isUsableTarget(ns, server));

    return pool.sort((a, b) => scoreExpTarget(ns, b) - scoreExpTarget(ns, a))[0] ?? "joesguns";
}

export function scoreExpTarget(ns, server) {
    if (!isUsableTarget(ns, server)) return 0;

    const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    const sec = Math.max(minSec, safeGetServerSecurityLevel(ns, server));
    const growth = Math.max(1, safeGetServerGrowth(ns, server));
    const money = Math.max(1, safeGetServerMaxMoney(ns, server));
    const chance = Math.max(0.01, safeHackAnalyzeChance(ns, server));

    const secPenalty = 1 + Math.max(0, sec - minSec) * 0.15;
    const timeSeconds = weakenTime / 1000;

    return (Math.log10(money + 1) * Math.sqrt(growth) * chance) / (timeSeconds * secPenalty);
}

export function getBestPrepTarget(ns, servers) {
    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .sort((a, b) => prepNeed(ns, b) - prepNeed(ns, a))[0] ?? getBestTarget(ns, servers);
}

export function prepNeed(ns, server) {
    if (!isUsableTarget(ns, server)) return 0;

    const maxMoney = safeGetServerMaxMoney(ns, server);
    const money = safeGetServerMoneyAvailable(ns, server);
    const minSec = safeGetServerMinSecurityLevel(ns, server);
    const sec = safeGetServerSecurityLevel(ns, server);

    const moneyNeed = maxMoney > 0 ? 1 - money / maxMoney : 0;
    const secNeed = Math.max(0, sec - minSec);

    return moneyNeed + secNeed;
}