import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

const BOOTSTRAP_DAEMON = "bootstrap-daemon.js";
const FULL_DAEMON = "daemon.js";
const BN2_GANG_MANAGER = "/tools/gang-manager-service.js";
const BN2_CRIME_BOOTSTRAP = "/tools/crime-bootstrap.js";
const TINY_HACKNET_BUYER = "/economy/tiny-hacknet-buyer.js";
const HOME_RAM_BUYER = "/economy/home-ram-buyer-service.js";
const FINAL_LEVEL_STUDY = "/tools/final-level-study-service.js";
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

    startBn2CoreServices(ns);
    startFinalLevelStudy(ns);

    if (shouldUseBootstrap(ns)) {
        if (!ns.scriptRunning(BOOTSTRAP_DAEMON, "home")) {
            stopFullDaemonIfRunning(ns);
            startScript(ns, BOOTSTRAP_DAEMON, [], {
                label: "bootstrap-daemon.js",
                priority: false,
            });
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

    startBn2GangManager(ns);
    startFinalLevelStudy(ns);
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

function startBn2GangManager(ns) {
    if (getCurrentBitNode(ns) !== 2) return;

    startScript(ns, BN2_GANG_MANAGER, [
        "--refresh", 2500,
        "--reserve", 0,
        "--create", true,
        "--faction", "Slum Snakes",
        "--buy-equipment", true,
        "--ascend", true,
        "--asc-mult", 10,
        "--fast-asc-mult", 100,
        "--debug", true,
    ], {
        label: "BN2 gang manager",
        priority: true,
    });
}

function startBn2CoreServices(ns) {
    if (getCurrentBitNode(ns) !== 2) return;

    startBn2GangManager(ns);
    startScript(ns, TINY_HACKNET_BUYER, [
        "--refresh", 3000,
        "--nodes", 5,
        "--level", 200,
        "--ram", 64,
        "--cores", 12,
        "--reserve", 0,
        "--max-purchases", 1000,
        "--force", true,
        "--debug", true,
        "--toast", false,
        "--terminal", false,
    ], {
        label: "BN2 tiny Hacknet buyer",
        priority: true,
    });
    startScript(ns, HOME_RAM_BUYER, [
        "--refresh", 5000,
        "--min-money", 1_000_000,
        "--force", true,
        "--debug", true,
    ], {
        label: "BN2 home RAM buyer",
        priority: true,
    });
    startScript(ns, BN2_CRIME_BOOTSTRAP, [
        "--crime", "auto",
        "--stop-money", 10_000_000,
        "--stop-home-ram", MIN_HOME_RAM_FOR_FULL_DAEMON,
        "--focus", false,
    ], {
        label: "BN2 auto crime bootstrap",
        priority: true,
    });
}

function startFinalLevelStudy(ns) {
    startScript(ns, FINAL_LEVEL_STUDY, [
        "--refresh", 5000,
        "--focus", false,
    ], {
        label: "final level study",
        priority: false,
    });
}

function startScript(ns, script, args = [], options = {}) {
    if (!ns.fileExists(script, "home")) return false;
    if (isScriptRunning(ns, script)) return true;

    const scriptRam = ns.getScriptRam(script, "home");
    if (!Number.isFinite(scriptRam) || scriptRam <= 0) return false;

    if (options.priority === true) {
        freeHomeRamFor(ns, scriptRam);
    }

    const pid = ns.run(script, 1, ...args);
    const label = options.label ?? script;

    if (pid > 0) {
        ns.tprint(`[STARTUP] ${label} started.`);
        return true;
    }

    ns.tprint(`[STARTUP] ${label} could not start yet.`);
    return false;
}

function freeHomeRamFor(ns, neededRam) {
    if (getFreeHomeRam(ns) >= neededRam) return;

    const killOrder = [
        "/workers/tiny-worker.js",
        BOOTSTRAP_DAEMON,
    ];

    for (const script of killOrder) {
        for (const proc of ns.ps("home")) {
            if (normalizePath(proc.filename) !== normalizePath(script)) continue;
            try {
                ns.kill(proc.pid);
            } catch {
                // Best effort. Startup will report if the service still cannot launch.
            }
            if (getFreeHomeRam(ns) >= neededRam) return;
        }
    }
}

function getFreeHomeRam(ns) {
    return Math.max(0, ns.getServerMaxRam("home") - ns.getServerUsedRam("home"));
}

function isScriptRunning(ns, script) {
    const normalized = normalizePath(script);

    try {
        return ns.ps("home")
            .some(proc => normalizePath(proc.filename) === normalized);
    } catch {
        return false;
    }
}

function normalizePath(path) {
    return String(path ?? "").replace(/^\/+/, "");
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
    } catch {
        return 1;
    }
}
