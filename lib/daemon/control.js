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
    const host = "home";

    if (!state.sharePolicy?.enabled) {
        ns.scriptKill(script, host);
        return;
    }

    if (!ns.fileExists(script, host)) {
        return;
    }

    const maxRam = ns.getServerMaxRam(host);
    const usedRam = ns.getServerUsedRam(host);
    const freeRam = Math.max(0, maxRam - usedRam);

    const reservePercent = state.sharePolicy.reserveRamPercent ?? 0;
    const reserveRam = maxRam * reservePercent;
    const usableRam = Math.max(0, freeRam - reserveRam);

    const ramPerThread = ns.getScriptRam(script, host);
    if (ramPerThread <= 0) return;

    const desiredThreads = Math.floor(usableRam / ramPerThread);
    const current = ns.getRunningScript(script, host);

    if (desiredThreads <= 0) {
        ns.scriptKill(script, host);
        return;
    }

    if (current?.threads === desiredThreads) {
        return;
    }

    ns.scriptKill(script, host);
    ns.exec(script, host, desiredThreads);
}