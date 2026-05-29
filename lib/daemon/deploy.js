import { sanitizeServerSet } from "/lib/daemon/network.js";
import { logEvent, logError } from "/lib/daemon/telemetry.js";

export function syncWorkerScripts(ns, rootedServers, workerScripts) {
    rootedServers = sanitizeServerSet(ns, rootedServers);

    const results = {
        scanned: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
    };

    for (const server of rootedServers) {
        if (server === "home") continue;

        results.scanned++;

        try {
            const missing = workerScripts.some(script =>
                !ns.fileExists(script, server)
            );

            if (!missing) {
                results.skipped++;
                continue;
            }

            const copied = ns.scp(workerScripts, server, "home");

            if (copied) {
                results.updated++;

                logEvent(
                    ns,
                    "WORKER_SYNC",
                    `Updated workers on ${server}`,
                    {
                        server,
                        workerScripts,
                    }
                );
            } else {
                results.failed++;

                logError(
                    ns,
                    "worker sync failed",
                    `scp returned false for ${server}`
                );
            }
        } catch (error) {
            results.failed++;
            logError(ns, `worker sync ${server}`, error);
        }
    }

    return results;
}

export function tryRootServer(ns, server) {
    try {
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

            logEvent(ns, "ROOT_GAINED", `Rooted ${server}`, {
                server,
                ports,
            });

            return true;
        }
    } catch (error) {
        logError(ns, `rooting ${server}`, error);
    }

    return false;
}

export function autoRootServers(ns, servers) {
    const results = {
        attempted: 0,
        rooted: 0,
    };

    for (const server of servers) {
        if (server === "home") continue;
        if (ns.hasRootAccess(server)) continue;

        results.attempted++;

        const success = tryRootServer(ns, server);

        if (success) {
            results.rooted++;
        }
    }

    return results;
}