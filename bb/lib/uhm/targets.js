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

import {
    getBestExpTarget,
} from "/lib/uhm/exp-targets.js";

export function getValidTargetOrFallback(
    ns,
    rootedServers,
    target,
    mode,
    hosts = [],
    options = {}
) {
    if (mode === "exp") {
        return target && isUsableTarget(ns, target)
            ? target
            : getBestExpTarget(ns, rootedServers, {
                preferredTarget: options.preferredTarget,
                purpose: options.expPurpose ?? "background",
            });
    }

    const formulasUnlocked =
        ns.fileExists("Formulas.exe", "home") &&
        !!ns.formulas?.hacking;

    const availableRam = getTotalFreeRam(hosts);

    const affordable =
        getBestAffordableMoneyTarget(ns, rootedServers, hosts, {
            minAffordability: options.minAffordability,
            laneName: options.laneName,
        });

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
    // Prefer daemon target authority, but do not assign a lane a target
    // that cannot fit even one usable batch/proto plan.
    const targetPlan = getBatchPlan(
        ns,
        target,
        mode,
        { availableRam }
    );

    const targetAffordable =
        targetPlan &&
        targetPlan.tooLargeForLane !== true;

    if (!targetAffordable && affordable) {
        return affordable;
    }

    return target;
}

export function getBestAffordableMoneyTarget(
    ns,
    servers,
    hosts = [],
    options = {}
) {
    const availableRam = getTotalFreeRam(hosts);
    const minAffordability =
        Number.isFinite(Number(options.minAffordability))
            ? Number(options.minAffordability)
            : 0.85;

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
            const fitsLane =
                plan.tooLargeForLane !== true &&
                affordability >= minAffordability;

            return {
                server,
                plan,
                affordability,
                fitsLane,
                score:
                    scoreMoneyTarget(ns, server) *
                    Math.min(1, affordability) *
                    (fitsLane ? 1 : 0.10),
            };
        })
        .filter(x => x && x.fitsLane)
        .sort((a, b) => b.score - a.score)[0]?.server;
}

function getTotalFreeRam(hosts = []) {
    return hosts.reduce(
        (sum, host) => sum + Math.max(0, host.freeRam ?? 0),
        0
    );
}

