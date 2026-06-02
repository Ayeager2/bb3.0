// /lib/uhm/targets.js
import {
    safeServerExists,
    isUsableTarget,
    safeGetServerMaxMoney,
    safeGetServerGrowth,
} from "/lib/uhm/safe.js";

import {
    getBatchPlan,
} from "/lib/uhm/batch.js";

import {
    scoreMoneyTarget,
    getBestMoneyTarget,
} from "/lib/daemon/targets.js";

export function getValidTargetOrFallback(
    ns,
    rootedServers,
    target,
    mode,
    hosts = []
) {
    if (mode === "exp") {
        return target && isUsableTarget(ns, target)
            ? target
            : "joesguns";
    }

    if (!target || !isUsableTarget(ns, target)) {
        return (
            getBestAffordableMoneyTarget(ns, rootedServers, hosts) ??
            getBestMoneyTarget(ns, rootedServers)
        );
    }

    const targetIsBeginnerTrash =
        ["n00dles", "foodnstuff", "sigma-cosmetics", "joesguns"]
            .includes(target) &&
        ns.getHackingLevel() >= 150;

    if (targetIsBeginnerTrash) {
        return (
            getBestAffordableMoneyTarget(ns, rootedServers, hosts) ??
            getBestMoneyTarget(ns, rootedServers) ??
            target
        );
    }

    // Important:
    // Do NOT replace daemon-selected targets just because full batches
    // are too large for this lane. Runner will use partial/proto fallback.
    return target;
}

export function getBestAffordableMoneyTarget(
    ns,
    servers,
    hosts = []
) {
    const availableRam = getTotalFreeRam(hosts);

    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => isUsableTarget(ns, server))
        .filter(server => safeGetServerMaxMoney(ns, server) > 0)
        .filter(server => safeGetServerGrowth(ns, server) > 0)
        .map(server => {
            const plan = getBatchPlan(
                ns,
                server,
                "money",
                { availableRam }
            );

            if (!plan) return null;

            const affordability =
                availableRam > 0
                    ? availableRam / Math.max(1, plan.totalRam)
                    : 0;

            return {
                server,
                plan,
                affordability,
                score:
                    scoreMoneyTarget(ns, server) *
                    Math.min(1, affordability),
            };
        })
        .filter(x => x && x.affordability >= 0.35)
        .sort((a, b) => b.score - a.score)[0]?.server;
}

function getTotalFreeRam(hosts = []) {
    return hosts.reduce(
        (sum, host) => sum + Math.max(0, host.freeRam ?? 0),
        0
    );
}