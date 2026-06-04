//lib/uhm/modes/exp-targets.js
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
    if (preferredTarget && isUsableTarget(ns, preferredTarget)) {
        return preferredTarget;
    }

    const candidates = [...new Set([
        ...FALLBACK_TARGETS,
        ...Array.from(rootedServers ?? []),
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
    const weakenTime = Math.max(1, ns.getWeakenTime(server));

    // EXP target scoring:
    // - wants hackable/rooted targets
    // - likes decent money/growth
    // - dislikes high security drift
    // - lightly prefers faster weaken cycles
    return (
        Math.log10(maxMoney + 1) *
        growth *
        chance
    ) / (secPenalty * Math.sqrt(weakenTime / 1000));
}