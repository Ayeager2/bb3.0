// /lib/uhm/lanes.js
import {
    sanitizeServerSet,
} from "/lib/uhm/network.js";

import {
    splitHostsByRamBudget,
    cloneHostsForSingleLane,
} from "/lib/uhm/hosts.js";

import {
    getValidTargetOrFallback,
} from "/lib/uhm/targets.js";

export function buildTargetLanes(
    ns,
    rootedServers,
    hosts,
    daemonState
) {
    const mode = daemonState?.mode ?? "money";

    const cleanServers = sanitizeServerSet(
        ns,
        rootedServers
    );

    const groups = splitHostsByRamBudget(
        hosts,
        daemonState
    );

    const laneTargets =
        daemonState?.laneTargets ?? {};
    const requestedPrimaryTarget =
        laneTargets.primary ?? daemonState?.target ?? null;
    const requestedSecondaryTarget =
        laneTargets.secondary ?? null;
    const requestedExpTarget =
        laneTargets.exp ?? null;

    const formulasUnlocked =
        daemonState?.formulasUnlocked === true &&
        !!ns.formulas?.hacking;

    const moneyTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        requestedPrimaryTarget,
        "money",
        groups.high,
        {
            laneName: "primary",
            minAffordability: 0.85,
        }
    );

    const secondaryMoneyTarget =
        getValidTargetOrFallback(
            ns,
            cleanServers,
            requestedSecondaryTarget,
            "money",
            groups.mid,
            {
                laneName: "secondary",
                minAffordability: 0.70,
            }
        );

    const expTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        requestedExpTarget,
        "exp",
        groups.low,
        {
            expPurpose: "background",
        }
    );

    const prepTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        laneTargets.prep ?? moneyTarget,
        "prep",
        hosts
    );

    if (mode === "exp") {
        const expSprintTarget = getValidTargetOrFallback(
            ns,
            cleanServers,
            requestedExpTarget,
            "exp",
            hosts,
            {
                expPurpose: "leveling",
            }
        );

        return [
            {
                name: "ALL / EXP",
                mode: "exp",
                target: expSprintTarget ?? "",
                requestedTarget: requestedExpTarget ?? null,
                targetSource: getTargetSource(expSprintTarget, requestedExpTarget),
                hosts,
                formulasUnlocked,
                expPurpose: "leveling",
            },
        ];
    }

    if (mode === "prep") {
        return [
            {
                name: "HIGH / MONEY",
                mode: "",
                target: "",
                hosts: [],
                formulasUnlocked
            },
            {
                name: "MID / SECONDARY",
                mode: "",
                target: "",
                hosts: [],
                formulasUnlocked
            },
            {
                name: "LOW / EXP",
                mode: "",
                target: "",
                hosts: [],
                formulasUnlocked
            },
            {
                name: "ALL / PREP",
                mode: "prep",
                target: prepTarget ?? "",
                hosts: cloneHostsForSingleLane(hosts),
                formulasUnlocked
            },
        ];
    }

    return [
        {
            name: "HIGH / MONEY",
            mode: "money",
            target: moneyTarget ?? "",
            requestedTarget: requestedPrimaryTarget,
            targetSource: getTargetSource(moneyTarget, requestedPrimaryTarget),
            hosts: groups.high,
            formulasUnlocked,
        },
        {
            name: "MID / SECONDARY",
            mode: "money",
            target: secondaryMoneyTarget ?? "",
            requestedTarget: requestedSecondaryTarget,
            targetSource: getTargetSource(secondaryMoneyTarget, requestedSecondaryTarget),
            hosts: groups.mid,
            formulasUnlocked,
        },
        {
            name: "LOW / EXP",
            mode: "exp",
            target: expTarget ?? "",
            requestedTarget: requestedExpTarget,
            targetSource: getTargetSource(expTarget, requestedExpTarget),
            hosts: groups.low,
            formulasUnlocked,
            expPurpose: "background",
        },
    ];
}

function getTargetSource(actual, requested) {
    if (!requested) return "selected";
    if (!actual) return "none";
    return actual === requested ? "daemon" : "affordable-fallback";
}
