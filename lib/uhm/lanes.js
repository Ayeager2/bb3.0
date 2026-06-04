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

    const formulasUnlocked =
        daemonState?.formulasUnlocked === true &&
        !!ns.formulas?.hacking;

    const moneyTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        laneTargets.primary ?? daemonState?.target,
        "money",
        groups.high
    );

    const secondaryMoneyTarget =
        getValidTargetOrFallback(
            ns,
            cleanServers,
            laneTargets.secondary,
            "money",
            groups.mid
        );

    const expTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        laneTargets.exp,
        "exp",
        groups.low
    );

    const prepTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        laneTargets.prep ?? moneyTarget,
        "prep",
        hosts
    );

    if (mode === "exp") {
        const expPrimaryTarget = getValidTargetOrFallback(
            ns,
            cleanServers,
            laneTargets.primary ?? daemonState?.target,
            "exp",
            groups.high
        );

        const expSecondaryTarget = getValidTargetOrFallback(
            ns,
            cleanServers,
            laneTargets.secondary,
            "exp",
            groups.mid
        );

        const expLowTarget = getValidTargetOrFallback(
            ns,
            cleanServers,
            laneTargets.exp,
            "exp",
            groups.low
        );

        return [
            {
                name: "HIGH / EXP",
                mode: "exp",
                target: expPrimaryTarget ?? "",
                hosts: groups.high,
                formulasUnlocked,
            },
            {
                name: "MID / EXP",
                mode: "exp",
                target: expSecondaryTarget ?? "",
                hosts: groups.mid,
                formulasUnlocked,
            },
            {
                name: "LOW / EXP",
                mode: "exp",
                target: expLowTarget ?? "",
                hosts: groups.low,
                formulasUnlocked,
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
            hosts: groups.high,
            formulasUnlocked,
        },
        {
            name: "MID / SECONDARY",
            mode: "money",
            target: secondaryMoneyTarget ?? "",
            hosts: groups.mid,
            formulasUnlocked,
        },
        {
            name: "LOW / EXP",
            mode: "exp",
            target: expTarget ?? "",
            hosts: groups.low,
            formulasUnlocked,
        },
    ];
}