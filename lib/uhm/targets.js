///lib/uhm/targets.js
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

import {
    getBatchPlan,
} from "/lib/uhm/batch.js";

export function getValidTargetOrFallback(ns, rootedServers, target, mode, hosts = []) {
    if (mode === "exp") return getBestExpTarget(ns, rootedServers);

    const affordable = getBestAffordableMoneyTarget(ns, rootedServers, hosts);

    if (!target || !isUsableTarget(ns, target)) {
        return affordable ?? getBestTarget(ns, rootedServers);
    }

    if (!affordable) {
        return target;
    }

    const availableRam = getTotalFreeRam(hosts);
    const targetPlan = getBatchPlan(ns, target, "money", { availableRam });

    const targetAffordable =
        targetPlan && availableRam >= targetPlan.totalRam * 1.25;

    const targetScore = scoreTarget(ns, target);
    const affordableScore = scoreTarget(ns, affordable);

    const targetIsTooWeak =
        affordableScore > targetScore * 1.35;

    const targetIsBeginnerTrash =
        ["n00dles", "foodnstuff", "sigma-cosmetics", "joesguns"].includes(target) &&
        ns.getHackingLevel() >= 150;

    if (!targetAffordable || targetIsTooWeak || targetIsBeginnerTrash) {
        return affordable;
    }

    return target;
}

export function getSecondaryMoneyTarget(ns, servers, primaryTarget) {
    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => server !== primaryTarget)
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetServerGrowth(ns, server) > 0)
        .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];
}

export function getBestAffordableMoneyTarget(ns, servers, hosts = []) {
    const availableRam = getTotalFreeRam(hosts);

    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetServerGrowth(ns, server) > 0)
        .map(server => {
            const plan = getBatchPlan(ns, server, "money", { availableRam });
            if (!plan) return null;

            const affordability = availableRam > 0
                ? availableRam / Math.max(1, plan.totalRam)
                : 0;

            return {
                server,
                plan,
                affordability,
                score: scoreTarget(ns, server) * Math.min(1, affordability),
            };
        })
        .filter(x => x && x.affordability >= 0.35)
        .sort((a, b) => b.score - a.score)[0]?.server;
}

export function getBestTarget(ns, servers) {
    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetServerGrowth(ns, server) > 0)
        .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];
}

export function scoreTarget(ns, server) {
    if (!isUsableTarget(ns, server)) return 0;

    const money = safeGetServerMaxMoney(ns, server);
    const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
    const chance = safeHackAnalyzeChance(ns, server);
    const growth = safeGetServerGrowth(ns, server);
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    const sec = safeGetServerSecurityLevel(ns, server);

    const prepPenalty =
        1 + Math.max(0, sec - minSec) * 0.25;

    const growthWeight = Math.log2(growth + 1);
    const moneyWeight = Math.log10(money + 1);

    return (
        (moneyWeight * growthWeight * chance * money) /
        (weakenTime * prepPenalty)
    );
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

function getTotalFreeRam(hosts = []) {
    return hosts.reduce((sum, host) => sum + Math.max(0, host.freeRam ?? 0), 0);
}