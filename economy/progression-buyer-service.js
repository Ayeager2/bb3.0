import { STATE_FILE } from "/lib/daemon/config.js";
import { runProgressionBuyer } from "/lib/daemon/progression-buyer.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 5000],
    ]);

    const refreshMs = Number(flags.refresh) || 5000;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const result = runProgressionBuyer(ns, policy);

        if (result?.bought) {
            ns.toast(result.message, "success", 8000);
            ns.tprint(`[PROGRESSION BUYER] ${result.message}`);
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