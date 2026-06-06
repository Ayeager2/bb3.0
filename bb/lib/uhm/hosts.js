//hosts.js
import {
    homeReserveRam,
} from "/lib/uhm/config.js";

import {
    safeServerExists,
    safeGetServerMaxRam,
    safeGetServerUsedRam,
} from "/lib/uhm/safe.js";

export function getHosts(ns, servers) {
    return [...servers]
        .filter(server => safeServerExists(ns, server))
        .filter(server => safeGetServerMaxRam(ns, server) > 0)
        .map(server => {
            const maxRam = safeGetServerMaxRam(ns, server);
            const usedRam = safeGetServerUsedRam(ns, server);
            const reserve = server === "home" ? homeReserveRam : 0;
            const freeRam = Math.max(0, maxRam - usedRam - reserve);

            return {
                host: server,
                maxRam,
                usedRam,
                freeRam,
                reserve,
            };
        })
        .filter(x => x.freeRam > 1)
        .sort((a, b) => {
            if (a.host === "home") return -1;
            if (b.host === "home") return 1;
            return b.freeRam - a.freeRam;
        });
}

export function snapshotLanes(lanes, getLaneRamStats) {
    return lanes.map(lane => ({
        name: lane.name,
        mode: lane.mode,
        target: lane.target,
        requestedTarget: lane.requestedTarget ?? null,
        targetSource: lane.targetSource ?? null,
        expPurpose: lane.expPurpose ?? null,
        hosts: lane.hosts.map(host => ({ ...host })),
        ram: getLaneRamStats(lane.hosts),
    }));
}

export function splitHostsByRamBudget(hosts, daemonState = {}) {
    const policy = daemonState?.multiTargetPolicy ?? {};

    const primaryPercent = clampPercent(policy.primaryMoneyRamPercent ?? 0.60);
    const secondaryPercent = clampPercent(policy.secondaryMoneyRamPercent ?? 0.30);
    const expPercent = clampPercent(policy.expRamPercent ?? 0.10);

    const normalized = normalizePercents(primaryPercent, secondaryPercent, expPercent);

    const groups = {
        high: [],
        mid: [],
        low: [],
    };

    const sorted = [...hosts]
        .filter(x => x?.host)
        .filter(x => x.freeRam > 1)
        .sort((a, b) => {
            if (a.host === "home") return -1;
            if (b.host === "home") return 1;
            return b.freeRam - a.freeRam;
        });

    const totalFreeRam = sorted.reduce((sum, x) => sum + x.freeRam, 0);
    if (totalFreeRam <= 0) return groups;

    const budgets = {
        high: totalFreeRam * normalized.primary,
        mid: totalFreeRam * normalized.secondary,
        low: totalFreeRam * normalized.exp,
    };

    for (const host of sorted) {
        let remaining = host.freeRam;

        remaining = allocateHostSlice(host, groups.high, budgets, "high", remaining);
        remaining = allocateHostSlice(host, groups.mid, budgets, "mid", remaining);
        remaining = allocateHostSlice(host, groups.low, budgets, "low", remaining);

        if (remaining > 1) {
            groups.high.push(makeVirtualHost(host, remaining));
        }
    }

    return groups;
}

export function cloneHostsForSingleLane(hosts) {
    return hosts
        .filter(x => x?.host)
        .filter(x => x.freeRam > 1)
        .map(x => makeVirtualHost(x, x.freeRam));
}

function allocateHostSlice(host, group, budgets, key, remaining) {
    if (remaining <= 1) return remaining;
    if (budgets[key] <= 1) return remaining;

    const amount = Math.min(remaining, budgets[key]);

    if (amount > 1) {
        group.push(makeVirtualHost(host, amount));
        budgets[key] -= amount;
        remaining -= amount;
    }

    return remaining;
}

function makeVirtualHost(host, allocatedRam) {
    return {
        host: host.host,
        maxRam: allocatedRam,
        usedRam: 0,
        freeRam: allocatedRam,
        reserve: host.reserve ?? 0,
        virtual: true,
    };
}

function normalizePercents(primary, secondary, exp) {
    const total = primary + secondary + exp;

    if (total <= 0) {
        return {
            primary: 0.60,
            secondary: 0.30,
            exp: 0.10,
        };
    }

    return {
        primary: primary / total,
        secondary: secondary / total,
        exp: exp / total,
    };
}

function clampPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}
