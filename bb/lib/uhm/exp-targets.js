// /lib/uhm/exp-targets.js

import {
    isUsableTarget,
    safeGetServerMaxMoney,
    safeGetServerSecurityLevel,
    safeGetServerMinSecurityLevel,
    safeGetServerGrowth,
    safeHackAnalyzeChance,
} from "/lib/uhm/safe.js";

const FALLBACK_TARGETS = [
    "joesguns",
    "nectar-net",
    "hong-fang-tea",
    "harakiri-sushi",
    "phantasy",
    "silver-helix",
    "omega-net",
    "zer0",
    "max-hardware",
    "iron-gym",
];

export function getBestExpTarget(ns, rootedServers, preferredTarget = null) {
    const candidates = [...new Set([
        ...FALLBACK_TARGETS,
        ...Array.from(rootedServers ?? []),
        preferredTarget,
    ])];

    return candidates
        .filter(server => isExpCandidate(ns, server))
        .map(server => ({
            server,
            score: scoreExpTarget(ns, server),
        }))
        .sort((a, b) => b.score - a.score)[0]?.server ?? "joesguns";
}

function isExpCandidate(ns, server) {
    if (!server) return false;
    if (server === "home") return false;
    if (!isUsableTarget(ns, server)) return false;

    try {
        if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) return false;
        if (safeGetServerMaxMoney(ns, server) <= 0) return false;
        if (safeHackAnalyzeChance(ns, server) <= 0) return false;

        return true;
    } catch {
        return false;
    }
}

function scoreExpTarget(ns, server) {
    const maxMoney = Math.max(1, safeGetServerMaxMoney(ns, server));
    const growth = Math.max(1, safeGetServerGrowth(ns, server));
    const sec = safeGetServerSecurityLevel(ns, server);
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    const secPenalty = Math.max(1, sec - minSec + 1);
    const chance = Math.max(0.01, safeHackAnalyzeChance(ns, server));
    const hackTime = Math.max(1, ns.getHackTime(server));

    return (
        Math.log10(maxMoney + 1) *
        growth *
        chance
    ) / (secPenalty * Math.sqrt(hackTime / 1000));
}