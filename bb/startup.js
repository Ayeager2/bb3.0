import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

const BOOTSTRAP_DAEMON = "bootstrap-daemon.js";
const FULL_DAEMON = "daemon.js";
const MIN_HOME_RAM_FOR_FULL_DAEMON = 64;

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

    if (shouldUseBootstrap(ns)) {
        if (!ns.scriptRunning(BOOTSTRAP_DAEMON, "home")) {
            stopFullDaemonIfRunning(ns);
            ns.run(BOOTSTRAP_DAEMON, 1);
            ns.tprint("[STARTUP] bootstrap-daemon.js started for sub-64GB home RAM.");
        } else {
            ns.tprint("[STARTUP] bootstrap-daemon.js already running.");
        }

        return;
    }

    if (!ns.scriptRunning(FULL_DAEMON, "home")) {
        ns.run(FULL_DAEMON, 1);
        ns.tprint("[STARTUP] daemon.js started.");
    } else {
        ns.tprint("[STARTUP] daemon.js already running.");
    }
}

function shouldUseBootstrap(ns) {
    return (
        ns.getServerMaxRam("home") < MIN_HOME_RAM_FOR_FULL_DAEMON &&
        ns.fileExists(BOOTSTRAP_DAEMON, "home")
    );
}

function stopFullDaemonIfRunning(ns) {
    try {
        if (ns.scriptRunning(FULL_DAEMON, "home")) {
            ns.kill(FULL_DAEMON, "home");
        }
    } catch {
        // If kill fails, let bootstrap try to work with remaining RAM.
    }
}
