import { STATE_FILE } from "/lib/daemon/config.js";
import {
    initializeSession,
    updateSessionTracking,
    buildSessionStats,
} from "/lib/daemon/session.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 5000],
    ]);

    const refreshMs = Number(flags.refresh) || 5000;

    let initialized = false;

    while (true) {
        const state = readJson(ns, STATE_FILE);

        if (!state || !state.mode) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (!initialized) {
            initializeSession(ns, state);
            initialized = true;
        }

        updateSessionTracking(state);

        ns.write(STATE_FILE, JSON.stringify(state, null, 2), "w");

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