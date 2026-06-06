import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["clean", true],
        ["sessions", true],
        ["completions", true],
        ["volatile", true],
    ]);

    if (flags.clean) {
        refreshDaemonState(ns, {
            volatile: flags.volatile,
            completions: flags.completions,
            sessions: flags.sessions,
            verbose: true,
        });
    }

    await ns.sleep(1000);

    if (!ns.scriptRunning("daemon.js", "home")) {
        ns.run("daemon.js", 1);
        ns.tprint("[STARTUP] daemon.js started.");
    } else {
        ns.tprint("[STARTUP] daemon.js already running.");
    }
}