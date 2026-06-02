//lib/daemon/server-purchaser-service.js
import { STATE_FILE } from "/lib/daemon/config.js";
import { runServerPurchaser } from "/lib/daemon/server-purchases.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

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

        const moneyBefore = ns.getPlayer().money;

        const result = await runServerPurchaser(ns, policy);

        const moneyAfter = ns.getPlayer().money;

        if (debug) {
            ns.print(result?.message ?? "No result.");
        }

        if (result?.acted) {
            const actualCost =
                Math.max(0, moneyBefore - moneyAfter);

            const message =
                `[SERVER PURCHASER] ${result.message}`;

            ns.toast(result.message, "success", 8000);
            ns.tprint(message);

            logPurchase(ns, {
                source: "server-purchaser",
                type: result.type ?? "server",
                item:
                    result.serverName ??
                    result.item ??
                    result.name ??
                    "pserv",
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