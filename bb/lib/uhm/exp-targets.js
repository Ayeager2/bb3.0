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

export function getBestExpTarget(ns, rootedServers, options = {}) {
    const preferredTarget =
        typeof options === "string"
            ? options
            : options.preferredTarget ?? null;

    const purpose =
        typeof options === "object"
            ? options.purpose ?? "background"
            : "background";

    const candidates = [...new Set([
        ...FALLBACK_TARGETS,
        ...Array.from(rootedServers ?? []),
        preferredTarget,
    ])];

    const scored = candidates
        .filter(server => isExpCandidate(ns, server))
        .map(server => ({
            server,
            score: scoreExpTarget(ns, server, { purpose }),
            hackTime: safeHackTime(ns, server),
        }));

    const fastLevelingCandidates =
        purpose === "leveling"
            ? scored.filter(x => x.hackTime <= 60_000)
            : scored;

    return (fastLevelingCandidates.length > 0 ? fastLevelingCandidates : scored)
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

function scoreExpTarget(ns, server, options = {}) {
    const purpose = options.purpose ?? "background";
    const hacking = Math.max(1, ns.getHackingLevel());
    const requiredHack = Math.max(1, ns.getServerRequiredHackingLevel(server));
    const levelRatio = requiredHack / hacking;

    const maxMoney = Math.max(1, safeGetServerMaxMoney(ns, server));
    const growth = Math.max(1, safeGetServerGrowth(ns, server));
    const sec = safeGetServerSecurityLevel(ns, server);
    const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
    const secPenalty = Math.max(1, sec - minSec + 1);
    const chance = Math.max(0.01, safeHackAnalyzeChance(ns, server));
    const hackTime = Math.max(1, ns.getHackTime(server));
    const timeSeconds = Math.max(1, hackTime / 1000);

    if (purpose === "leveling") {
        const levelBand =
            levelRatio >= 0.35 && levelRatio <= 1.00 ? 3.0 :
                levelRatio >= 0.15 && levelRatio < 0.35 ? 1.5 :
                    0.5;
        const fastCycleBonus =
            timeSeconds <= 10 ? 5.0 :
                timeSeconds <= 30 ? 3.0 :
                    timeSeconds <= 60 ? 1.0 :
                        0.15;

        return (
            levelBand *
            fastCycleBonus *
            Math.sqrt(growth) *
            Math.log10(maxMoney + 1) *
            chance
        ) / (Math.pow(timeSeconds, 1.25) * Math.sqrt(secPenalty));
    }

    const quickCycleBonus =
        timeSeconds <= 30 ? 3.0 :
            timeSeconds <= 90 ? 1.5 :
                timeSeconds <= 180 ? 0.75 :
                    0.25;

    return (
        quickCycleBonus *
        Math.sqrt(growth) *
        chance *
        Math.log10(maxMoney + 1)
    ) / (secPenalty * Math.sqrt(timeSeconds));
}

function safeHackTime(ns, server) {
    try {
        return ns.getHackTime(server);
    } catch {
        return Infinity;
    }
}
