///lib/uhm/lanes.js
import {
    sanitizeServerSet,
} from "/lib/uhm/network.js";

import {
    splitHostsByRamBudget,
    cloneHostsForSingleLane,
} from "/lib/uhm/hosts.js";

import {
    getValidTargetOrFallback,
    getSecondaryMoneyTarget,
} from "/lib/uhm/targets.js";

export function buildTargetLanes(ns, rootedServers, hosts, daemonState) {
    const mode = daemonState?.mode ?? "money";

    const cleanServers = sanitizeServerSet(ns, rootedServers);
    const groups = splitHostsByRamBudget(hosts, daemonState);

    const moneyTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        daemonState?.target,
        "money",
        groups.high
    );

    const secondaryMoneyTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        getSecondaryMoneyTarget(ns, cleanServers, moneyTarget),
        "money",
        groups.mid
    );

    const expTarget = getValidTargetOrFallback(
        ns,
        cleanServers,
        daemonState?.target,
        "exp",
        groups.low
    );

    if (mode === "exp") {
        return [
            { name: "HIGH / MONEY", mode: "", target: "", hosts: [] },
            { name: "MID / SECONDARY", mode: "", target: "", hosts: [] },
            {
                name: "LOW / EXP",
                mode: "exp",
                target: expTarget ?? "",
                hosts: cloneHostsForSingleLane(hosts),
            },
        ];
    }

    if (mode === "prep") {
        return [
            { name: "HIGH / MONEY", mode: "", target: "", hosts: [] },
            { name: "MID / SECONDARY", mode: "", target: "", hosts: [] },
            { name: "LOW / EXP", mode: "", target: "", hosts: [] },
            {
                name: "ALL / PREP",
                mode: "prep",
                target: moneyTarget ?? "",
                hosts: cloneHostsForSingleLane(hosts),
            },
        ];
    }

    return [
        {
            name: "HIGH / MONEY",
            mode: "money",
            target: moneyTarget ?? "",
            hosts: groups.high,
        },
        {
            name: "MID / SECONDARY",
            mode: "money",
            target: secondaryMoneyTarget ?? "",
            hosts: groups.mid,
        },
        {
            name: "LOW / EXP",
            mode: "exp",
            target: expTarget ?? "",
            hosts: groups.low,
        },
    ];
}