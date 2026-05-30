import { STATE_FILE } from "/lib/daemon/config.js";
import { drawDashboard } from "/lib/daemon/dashboard.js";

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

        if (!state || !state.mode) {
            ns.clearLog();
            ns.print("Daemon HUD");
            ns.print("Waiting for daemon-state.txt...");
            await ns.sleep(refreshMs);
            continue;
        }

        drawDashboard(ns, state, {
            mode: null,
            priority: null,
            target: null,
        });

        await ns.sleep(refreshMs);
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