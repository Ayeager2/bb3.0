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

    const currentBandCandidates =
        purpose === "leveling"
            ? scored.filter(x => isInCurrentLevelingBand(ns, x.server))
            : scored;

    return (currentBandCandidates.length > 0 ? currentBandCandidates : scored)
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
            levelRatio >= 0.65 && levelRatio <= 1.00 ? 5.0 :
                levelRatio >= 0.40 && levelRatio < 0.65 ? 3.0 :
                    levelRatio >= 0.20 && levelRatio < 0.40 ? 1.0 :
                        0.05;
        const churnPenalty = getFastTargetChurnPenalty(timeSeconds, levelRatio);

        return (
            levelBand *
            churnPenalty *
            Math.sqrt(growth) *
            Math.log10(maxMoney + 1) *
            chance
        ) / (Math.pow(timeSeconds, 0.45) * Math.sqrt(secPenalty));
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

function isInCurrentLevelingBand(ns, server) {
    const hacking = Math.max(1, ns.getHackingLevel());
    const requiredHack = Math.max(1, ns.getServerRequiredHackingLevel(server));
    return requiredHack >= getMinimumLevelingTargetHack(hacking);
}

function getMinimumLevelingTargetHack(hacking) {
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

function safeHackTime(ns, server) {
    try {
        return ns.getHackTime(server);
    } catch {
        return Infinity;
    }
}
