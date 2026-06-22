//lib/uhm/network.js
import {
    STATE_FILE,
    scriptsToCopy,
} from "/lib/uhm/config.js";

import {
    safeServerExists,
} from "/lib/uhm/safe.js";

export function sanitizeServerSet(ns, servers) {
    const clean = new Set();

    for (const server of servers) {
        if (server === "home" || safeServerExists(ns, server)) {
            clean.add(server);
        }
    }

    return clean;
}

export function getAllExecutionServers(ns) {
    const rootedServers = scanAndHack(ns);

    try {
        for (const server of ns.cloud.getServerNames()) {
            if (safeServerExists(ns, server)) {
                rootedServers.add(server);
            }
        }
    } catch (error) {
        console.error(error);
    }

    return sanitizeServerSet(ns, rootedServers);
}

export function filterExecutionServers(ns, servers, daemonState = {}) {
    const clean = new Set();

    for (const server of servers) {
        if (isExecutionHostBlocked(ns, server, daemonState)) continue;
        clean.add(server);
    }

    return clean;
}

export function cleanupBlockedExecutionHosts(ns, servers, daemonState = {}) {
    let killed = 0;

    for (const server of servers) {
        if (!isExecutionHostBlocked(ns, server, daemonState)) continue;
        if (!safeServerExists(ns, server)) continue;

        try {
            for (const proc of ns.ps(server)) {
                if (!isUhmWorkerScript(proc.filename)) continue;
                if (ns.kill(proc.pid)) killed++;
            }
        } catch {
            // Host may disappear while UHM is rescanning.
        }
    }

    return killed;
}

function isExecutionHostBlocked(ns, server, daemonState = {}) {
    if (server === "home") return false;
    if (!isHacknetServer(ns, server)) return false;

    const allowedByPolicy =
        daemonState?.spendingPolicy?.allowHacknetExecution === true ||
        daemonState?.bitNodeCapabilities?.hacknet?.useAsExecutionHosts === true;

    return !allowedByPolicy;
}

function isHacknetServer(ns, server) {
    if (String(server).startsWith("hacknet-server-")) return true;

    try {
        const count = ns.hacknet?.numNodes?.() ?? 0;
        for (let i = 0; i < count; i++) {
            const name = ns.hacknet.getNodeStats(i)?.name;
            if (name === server) return true;
        }
    } catch {
        return false;
    }

    return false;
}

function isUhmWorkerScript(filename) {
    const script = String(filename ?? "");
    return script.startsWith("/workers/") || script.startsWith("workers/");
}

export async function copyScriptsToServers(ns, servers, copiedServers, runtimeStats) {
    for (const server of servers) {
        if (server === "home") continue;
        if (!safeServerExists(ns, server)) {
            copiedServers.delete(server);
            continue;
        }

        let missingScripts = false;

        try {
            missingScripts = scriptsToCopy.some(script => !ns.fileExists(script, server));
        } catch {
            copiedServers.delete(server);
            continue;
        }

        if (!missingScripts) continue;

        try {
            const copied = await ns.scp(scriptsToCopy, server, "home");

            if (copied) {
                copiedServers.add(server);
                runtimeStats.copiedServers++;
            }
        } catch {
            copiedServers.delete(server);
        }
    }
}

export
    function scanAndHack(ns) {
    const servers = new Set(["home"]);
    scanAll(ns, "home", servers);

    const rooted = new Set();

    for (const server of servers) {
        if (!safeServerExists(ns, server)) continue;

        try {
            if (ns.hasRootAccess(server)) {
                rooted.add(server);
                continue;
            }

            let ports = 0;

            if (ns.fileExists("BruteSSH.exe", "home")) {
                ns.brutessh(server);
                ports++;
            }

            if (ns.fileExists("FTPCrack.exe", "home")) {
                ns.ftpcrack(server);
                ports++;
            }

            if (ns.fileExists("relaySMTP.exe", "home")) {
                ns.relaysmtp(server);
                ports++;
            }

            if (ns.fileExists("HTTPWorm.exe", "home")) {
                ns.httpworm(server);
                ports++;
            }

            if (ns.fileExists("SQLInject.exe", "home")) {
                ns.sqlinject(server);
                ports++;
            }

            if (ports >= ns.getServerNumPortsRequired(server)) {
                ns.nuke(server);
                rooted.add(server);
            }
        } catch {
            // Server may have disappeared during scan.
        }
    }

    return sanitizeServerSet(ns, rooted);
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

export function readDaemonState(ns) {
    try {
        if (!ns.fileExists(STATE_FILE, "home")) return {};
        const raw = ns.read(STATE_FILE);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}
