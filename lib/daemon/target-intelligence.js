///lib/daemon/target-intelligence.js
const BEGINNER_TARGETS = new Set([
    "n00dles",
    "foodnstuff",
    "sigma-cosmetics",
    "joesguns",
]);

export function chooseStrategicMoneyTarget(ns, rootedServers, currentTarget = null) {
    const hacking = ns.getHackingLevel();

    const candidates = [...rootedServers]
        .filter(server => isMoneyCandidate(ns, server))
        .map(server => ({
            server,
            score: scoreStrategicMoneyTarget(ns, server),
            maxMoney: ns.getServerMaxMoney(server),
            weakenTime: ns.getWeakenTime(server),
            chance: ns.hackAnalyzeChance(server),
            requiredHacking: ns.getServerRequiredHackingLevel(server),
        }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);

    const best = candidates[0]?.server ?? currentTarget ?? "n00dles";

    if (!currentTarget || !isMoneyCandidate(ns, currentTarget)) {
        return best;
    }

    const currentScore = scoreStrategicMoneyTarget(ns, currentTarget);
    const bestScore = scoreStrategicMoneyTarget(ns, best);

    const currentIsBeginnerTrap =
        BEGINNER_TARGETS.has(currentTarget) &&
        hacking >= 150;

    const bestIsMuchBetter =
        bestScore > currentScore * 1.35;

    if (currentIsBeginnerTrap || bestIsMuchBetter) {
        return best;
    }

    return currentTarget;
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

        const prepPenalty = 1 + Math.max(0, sec - minSec) * 0.25;
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