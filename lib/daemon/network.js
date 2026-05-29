import {
    safeGetPurchasedServers,
    safeGetCloudServers,
    safeServerExists,
} from "/lib/daemon/safe.js";

export function getAllServers(ns) {
    const servers = new Set(["home"]);
    scanAll(ns, "home", servers);
    return sanitizeServerSet(ns, servers);
}

export function scanAll(ns, host, servers) {
    if (!safeServerExists(ns, host)) return;

    let neighbors = [];
    try {
        neighbors = ns.scan(host);
    } catch {
        return;
    }

    for (const next of neighbors) {
        if (!servers.has(next)) {
            servers.add(next);
            scanAll(ns, next, servers);
        }
    }
}

export function getRootedServers(ns, servers) {
    const rooted = new Set();

    for (const server of sanitizeServerSet(ns, servers)) {
        try {
            if (ns.hasRootAccess(server)) rooted.add(server);
        } catch { }
    }

    for (const server of safeGetPurchasedServers(ns)) {
        if (safeServerExists(ns, server)) rooted.add(server);
    }

    for (const server of safeGetCloudServers(ns)) {
        if (safeServerExists(ns, server)) rooted.add(server);
    }

    return sanitizeServerSet(ns, rooted);
}

export function sanitizeServerSet(ns, servers) {
    const clean = new Set();

    for (const server of servers) {
        if (server === "home" || safeServerExists(ns, server)) {
            clean.add(server);
        }
    }

    return clean;
}