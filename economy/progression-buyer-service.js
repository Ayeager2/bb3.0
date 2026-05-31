import { STATE_FILE } from "/lib/daemon/config.js";
import { runProgressionBuyer } from "/lib/daemon/progression-buyer.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

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

        const moneyBefore = ns.getPlayer().money;
        const result = runProgressionBuyer(ns, policy);
        const moneyAfter = ns.getPlayer().money;

        if (result?.bought) {
            const actualCost = Math.max(0, moneyBefore - moneyAfter);

            const message =
                `[PROGRESSION BUYER] ${result.message}`;

            ns.toast(result.message, "success", 8000);
            ns.tprint(message);

            logPurchase(ns, {
                source: "progression-buyer",
                type: result.type ?? "progression",
                item: result.item ?? result.name ?? result.message ?? "unknown",
                cost: result.cost ?? actualCost,
                moneyBefore,
                moneyAfter,
                message,
            });
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