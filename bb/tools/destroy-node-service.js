//bb\tools\destroy-node-service.js
import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

const DESTROY_STATE_FILE = "/data/destroy-node-state.txt";
const WORLD_DAEMON = "w0r1d_d43m0n";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["next", 4],
        ["script", "daemon.js"],
        ["clean", true],
        ["volatile", true],
        ["completions", true],
        ["sessions", true],
        ["root", true],
        ["connect", true],
        ["backdoor", false],
        ["hack", false],
    ]);

    const target = WORLD_DAEMON;
    const nextBitNode = Number(flags.next ?? ns.args[0] ?? 4);
    const nextScript = String(flags.script ?? ns.args[1] ?? "daemon.js");
    const path = findPath(ns, "home", target);

    if (!path?.length) {
        return block(ns, {
            blockedReason: "No network path found to w0r1d_d43m0n.",
            target,
            path,
        });
    }

    if (!safeServerExists(ns, target)) {
        return block(ns, {
            blockedReason: "w0r1d_d43m0n not discovered.",
            target,
            path,
        });
    }

    const rooted =
        ns.hasRootAccess(target) ||
        (
            isTruthy(flags.root) &&
            tryRoot(ns, target)
        );

    if (!rooted) {
        return block(ns, {
            blockedReason: "Missing root access on w0r1d_d43m0n.",
            target,
            path,
            rootReport: getRootReport(ns, target),
        });
    }

    if (isTruthy(flags.connect) && !connectPath(ns, path)) {
        return block(ns, {
            blockedReason: "Failed to connect to w0r1d_d43m0n path.",
            target,
            path,
        });
    }

    if (isTruthy(flags.backdoor)) {
        const backdoorInstalled = await tryBackdoor(ns, target);
        if (!backdoorInstalled) {
            ns.tprint("[DESTROY] Backdoor attempt failed; continuing to final destroy check.");
        }
    }

    if (isTruthy(flags.hack)) {
        await tryHack(ns, target);
    }

    if (!hasSingularityDestroy(ns)) {
        return block(ns, {
            blockedReason: "Singularity destroyW0r1dD43m0n API is unavailable.",
            target,
            path,
        });
    }

    const hasRedPill = safeHasRedPill(ns);
    if (!hasRedPill) {
        return block(ns, {
            blockedReason: "Missing The Red Pill.",
            target,
            path,
            hasRedPill,
        });
    }

    const required = ns.getServerRequiredHackingLevel(target);
    const hacking = ns.getHackingLevel();

    if (hacking < required) {
        return block(ns, {
            blockedReason: `Need hacking ${required}; current ${hacking}.`,
            target,
            path,
            hacking,
            required,
            hasRedPill,
            rooted,
        });
    }

    if (flags.clean === true || flags.clean === "true") {
        ns.tprint("[DESTROY] Refreshing daemon state before BitNode destruction...");

        refreshDaemonState(ns, {
            volatile: flags.volatile === true || flags.volatile === "true",
            completions: flags.completions === true || flags.completions === "true",
            sessions: flags.sessions === true || flags.sessions === "true",
            verbose: true,
        });
    }

    writeState(ns, {
        updatedAt: Date.now(),
        status: "destroying",
        target,
        path,
        hacking,
        required,
        hasRedPill,
        rooted,
        nextBitNode,
        nextScript,
    });

    ns.tprint(`[DESTROY] Path: ${path.join(" -> ")}`);
    ns.tprint(`[DESTROY] Destroying BitNode. Next BN=${nextBitNode}, script=${nextScript}`);

    try {
        await ns.singularity.destroyW0r1dD43m0n(
            nextBitNode,
            nextScript
        );
    } catch (error) {
        writeState(ns, {
            updatedAt: Date.now(),
            status: "failed",
            blockedReason: `destroyW0r1dD43m0n failed: ${String(error)}`,
            target,
            path,
            hacking,
            required,
            hasRedPill,
            rooted,
            nextBitNode,
            nextScript,
        });
        ns.tprint(`[DESTROY] destroyW0r1dD43m0n failed: ${String(error)}`);
    }
}

function block(ns, state) {
    writeState(ns, {
        updatedAt: Date.now(),
        status: "blocked",
        ...state,
    });

    ns.tprint(`[DESTROY] ${state.blockedReason}`);
}

function findPath(ns, start, target) {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current === target) return path;

        for (const next of safeScan(ns, current)) {
            if (visited.has(next)) continue;

            visited.add(next);
            queue.push([...path, next]);
        }
    }

    return null;
}

function safeScan(ns, host) {
    try {
        return ns.scan(host);
    } catch {
        return [];
    }
}

function connectPath(ns, path) {
    try {
        ns.singularity.connect("home");

        for (const host of path.slice(1)) {
            if (!ns.singularity.connect(host)) return false;
        }

        return true;
    } catch {
        return false;
    }
}

function tryRoot(ns, target) {
    const report = getRootReport(ns, target);

    if (!report.exists) return false;
    if (report.rooted) return true;
    if (report.openedPorts < report.requiredPorts) return false;

    try {
        ns.nuke(target);
        return ns.hasRootAccess(target);
    } catch {
        return false;
    }
}

function getRootReport(ns, target) {
    const exists = safeServerExists(ns, target);
    const rooted = exists && ns.hasRootAccess(target);
    const requiredPorts = exists ? ns.getServerNumPortsRequired(target) : null;
    const openedPorts = exists ? openPorts(ns, target) : 0;

    return {
        exists,
        rooted,
        requiredPorts,
        openedPorts,
        programs: {
            brutessh: ns.fileExists("BruteSSH.exe", "home"),
            ftpcrack: ns.fileExists("FTPCrack.exe", "home"),
            relaysmtp: ns.fileExists("relaySMTP.exe", "home"),
            httpworm: ns.fileExists("HTTPWorm.exe", "home"),
            sqlinject: ns.fileExists("SQLInject.exe", "home"),
        },
    };
}

function openPorts(ns, target) {
    let opened = 0;

    if (tryProgram(ns, "BruteSSH.exe", () => ns.brutessh(target))) opened++;
    if (tryProgram(ns, "FTPCrack.exe", () => ns.ftpcrack(target))) opened++;
    if (tryProgram(ns, "relaySMTP.exe", () => ns.relaysmtp(target))) opened++;
    if (tryProgram(ns, "HTTPWorm.exe", () => ns.httpworm(target))) opened++;
    if (tryProgram(ns, "SQLInject.exe", () => ns.sqlinject(target))) opened++;

    return opened;
}

function tryProgram(ns, file, fn) {
    if (!ns.fileExists(file, "home")) return false;

    try {
        fn();
        return true;
    } catch {
        return false;
    }
}

async function tryBackdoor(ns, target) {
    try {
        if (ns.getServer(target).backdoorInstalled === true) return true;
        await ns.singularity.installBackdoor();
        return ns.getServer(target).backdoorInstalled === true;
    } catch {
        return false;
    }
}

async function tryHack(ns, target) {
    try {
        await ns.hack(target);
        return true;
    } catch {
        return false;
    }
}

function safeServerExists(ns, target) {
    try {
        return ns.serverExists(target);
    } catch {
        return false;
    }
}

function hasSingularityDestroy(ns) {
    try {
        return typeof ns.singularity?.destroyW0r1dD43m0n === "function";
    } catch {
        return false;
    }
}

function writeState(ns, state) {
    ns.write(DESTROY_STATE_FILE, JSON.stringify(state, null, 2), "w");
}

function isTruthy(value) {
    return value === true || value === "true";
}

function safeHasRedPill(ns) {
    try {
        return ns.singularity
            .getOwnedAugmentations(true)
            .includes("The Red Pill");
    } catch {
        return false;
    }
}
