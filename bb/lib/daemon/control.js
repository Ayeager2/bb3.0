/**
 * /lib/daemon/control.js
 *
 * Small daemon control helpers only.
 *
 * IMPORTANT:
 * Old script startup/lifecycle helpers were removed.
 * Service lifecycle now belongs to:
 *
 *   /lib/daemon/services.js
 *   /lib/daemon/service-manager.js
 *
 * This file should NOT start normal daemon services anymore.
 */

/**
 * Prevent multiple daemon.js instances from fighting each other.
 */
export function killOtherDaemonInstances(ns) {
    const currentPid = ns.pid;
    const currentScript = ns.getScriptName();

    for (const proc of ns.ps("home")) {
        if (proc.filename !== currentScript) continue;
        if (proc.pid === currentPid) continue;

        ns.kill(proc.pid);
    }
}

/**
 * Manages faction share workers.
 *
 * This stays separate for now because share allocation is dynamic:
 * - thread count changes based on free RAM
 * - share gets reserved before money lanes
 * - daemon phase/policy controls whether sharing is enabled
 */
export function manageShareWorkers(ns, state) {
    const script = "/workers/share-worker.js";
    const hosts = getShareWorkerHosts(ns, state);

    if (!state.sharePolicy?.enabled) {
        killShareWorkers(ns, script, hosts);
        return;
    }

    if (!ns.fileExists(script, "home")) {
        return;
    }

    // For now, daemon only cleans stale distributed share workers.
    // UHM owns distributed share launching before lane allocation.
    // This prevents daemon/home-only share from fighting UHM.
    killHomeShareIfUhmOwnsDistributedShare(ns, script);
}

function killShareWorkers(ns, script, hosts) {
    for (const host of hosts) {
        try {
            ns.scriptKill(script, host);
        } catch {
            // ignore dead/stale hosts
        }
    }
}

function killHomeShareIfUhmOwnsDistributedShare(ns, script) {
    try {
        ns.scriptKill(script, "home");
    } catch {
        // ignore
    }
}

function getShareWorkerHosts(ns, state) {
    const hosts = new Set(["home"]);

    for (const server of state?.servers?.purchased ?? []) {
        hosts.add(server);
    }

    for (const server of state?.servers?.cloud ?? []) {
        hosts.add(server);
    }

    for (const server of state?.rootedServers ?? []) {
        hosts.add(server);
    }

    return [...hosts].filter(host => {
        try {
            return ns.serverExists(host);
        } catch {
            return false;
        }
    });
}