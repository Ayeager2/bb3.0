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

        drawDashboard(ns, {
            ...state,
            resetPlan,
        }, {
            mode: null,
            priority: null,
            target: null,
        });

        printResetPlan(ns, resetPlan);

        await ns.sleep(refreshMs);
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