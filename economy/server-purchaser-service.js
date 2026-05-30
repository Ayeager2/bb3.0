import { STATE_FILE } from "/lib/daemon/config.js";
import { runServerPurchaser } from "/lib/daemon/server-purchases.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
        ["debug", true],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;
    const debug = flags.debug === true;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const result = await runServerPurchaser(ns, policy);

        if (debug) {
            ns.print(result?.message ?? "No result.");
        }

        if (result?.acted) {
            ns.toast(result.message, "success", 8000);
            ns.tprint(`[SERVER PURCHASER] ${result.message}`);
        }

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