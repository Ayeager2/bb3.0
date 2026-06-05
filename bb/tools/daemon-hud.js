// bb/tools/daemon-hud.js
import { STATE_FILE } from "/lib/daemon/config.js";
import { drawDashboard } from "/lib/daemon/dashboard.js";

const RESET_PLAN_FILE = "/data/reset-plan.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.ui.openTail();

    const flags = ns.flags([
        ["refresh", 10000],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const resetPlan = readJson(ns, RESET_PLAN_FILE);

        if (!state || !state.mode) {
            ns.clearLog();
            ns.print("Daemon HUD");
            ns.print("Waiting for daemon-state.txt...");
            await ns.sleep(refreshMs);
            continue;
        }

        const fixedState = {
            ...state,
            resetPlan,
            singularity: fixSingularityStage(ns, state.singularity ?? {}),
        };

        drawDashboard(ns, fixedState, {
            mode: null,
            priority: null,
            target: null,
        });

        printResetPlan(ns, resetPlan);

        await ns.sleep(refreshMs);
    }
}

function fixSingularityStage(ns, singularity = {}) {
    const redPillOwned = hasRedPill(ns);

    if (!redPillOwned) {
        return singularity;
    }

    const worldDaemon = "w0r1d_d43m0n";
    const hacking = ns.getHackingLevel();
    const requiredHack = safeRequiredHack(ns, worldDaemon);
    const worldRooted = safeRoot(ns, worldDaemon);
    const worldBackdoored = safeBackdoor(ns, worldDaemon);

    if (hacking < requiredHack) {
        return {
            ...singularity,
            stage: "world-daemon-leveling",
            redPillOwned: true,
            worldDaemonReady: false,
            message:
                `Red Pill owned. Level hacking ${hacking}/${requiredHack} for ${worldDaemon}.`,
        };
    }

    if (!worldRooted) {
        return {
            ...singularity,
            stage: "root-world-daemon",
            redPillOwned: true,
            worldDaemonReady: false,
            message:
                `Red Pill owned. Root ${worldDaemon}.`,
        };
    }

    if (!worldBackdoored) {
        return {
            ...singularity,
            stage: "backdoor-world-daemon",
            redPillOwned: true,
            worldDaemonReady: false,
            message:
                `Red Pill owned. Backdoor ${worldDaemon}.`,
        };
    }

    return {
        ...singularity,
        stage: "destroy-bitnode",
        redPillOwned: true,
        worldDaemonReady: true,
        message:
            `Red Pill owned and ${worldDaemon} is backdoored. Destroy BitNode.`,
    };
}

function hasRedPill(ns) {
    try {
        return ns.singularity
            .getOwnedAugmentations(true)
            .includes("The Red Pill");
    } catch {
        return false;
    }
}

function safeRequiredHack(ns, server) {
    try {
        return ns.getServerRequiredHackingLevel(server);
    } catch {
        return 9000;
    }
}

function safeRoot(ns, server) {
    try {
        return ns.serverExists(server) && ns.hasRootAccess(server);
    } catch {
        return false;
    }
}

function safeBackdoor(ns, server) {
    try {
        return ns.serverExists(server) &&
            ns.getServer(server).backdoorInstalled === true;
    } catch {
        return false;
    }
}

function printResetPlan(ns, plan) {
    if (!plan || !plan.updatedAt) {
        ns.print("RESET: no reset-plan.txt yet");
        return;
    }

    ns.print(
        `RESET: ${plan.ready ? "READY" : "WAIT"} | ` +
        `ARMED:${plan.armed ? "YES" : "NO"} | ` +
        `PENDING:${plan.pendingCount ?? 0} | ` +
        `INSTALLED:${plan.installedCount ?? 0}`
    );

    if (plan.reason) {
        ns.print(`RESET REASON: ${plan.reason}`);
    }
}

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};
        const raw = ns.read(file);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}