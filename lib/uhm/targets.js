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

    const formulasUnlocked =
        ns.fileExists("Formulas.exe", "home") &&
        !!ns.formulas?.hacking;

    const availableRam = getTotalFreeRam(hosts);

    const affordable = getBestAffordableMoneyTarget(
        ns,
        rootedServers,
        hosts
    );

    if (!target || !isUsableTarget(ns, target)) {
        return affordable ?? getBestMoneyTarget(ns, rootedServers);
    }

    const targetIsBeginnerTrash =
        ["n00dles", "foodnstuff", "sigma-cosmetics", "joesguns"]
            .includes(target) &&
        ns.getHackingLevel() >= 150;

    if (targetIsBeginnerTrash) {
        return affordable ?? getBestMoneyTarget(ns, rootedServers) ?? target;
    }

    // BEFORE FORMULAS:
    // Preserve old early-game behavior. Pick something affordable
    // so tiny RAM can still work and bootstrap does not stall.
    if (!formulasUnlocked) {
        const targetPlan = getBatchPlan(
            ns,
            target,
            "money",
            { availableRam }
        );

        const targetAffordable =
            targetPlan &&
            availableRam >= targetPlan.totalRam * 1.25;

        if (!targetAffordable && affordable) {
            return affordable;
        }
    }

    // AFTER FORMULAS:
    // Respect daemon target authority.
    // If full batch is too large, runner/prep/micro fallback handles it.
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