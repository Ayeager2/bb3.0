// /economy/server-purchaser-service.js
import { STATE_FILE } from "/lib/daemon/config.js";
import { runServerPurchaser } from "/lib/daemon/server-purchases.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

const PRE_FORMULAS_MAX_UPGRADE_COST = 1_000_000_000;
const SERVER_TICKER_FILE = "/data/ui/server-ticker.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
        ["debug", true],
        ["toast", true],
        ["terminal", false],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;
    const debug = flags.debug === true;
    const toast = flags.toast === true;
    const terminal = flags.terminal === true;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const hasFormulas =
            ns.fileExists("Formulas.exe", "home");

        const serverPurchasePolicy = {
            ...policy,
            maxServerUpgradeCost:
                hasFormulas
                    ? Number.POSITIVE_INFINITY
                    : PRE_FORMULAS_MAX_UPGRADE_COST,
            serverUpgradeCapReason:
                hasFormulas
                    ? "Formulas.exe owned; cloud upgrade cap removed."
                    : "Formulas.exe missing; cloud upgrade cost capped at 1b.",
        };

        const moneyBefore = ns.getPlayer().money;

        const result = await runServerPurchaser(
            ns,
            serverPurchasePolicy
        );

        const moneyAfter = ns.getPlayer().money;

        if (debug) {
            ns.print(result?.message ?? "No result.");
        }

        if (result?.acted) {
            const actualCost =
                Math.max(0, moneyBefore - moneyAfter);

            const message =
                `[SERVER PURCHASER] ${result.message}`;

            if (toast) {
                ns.toast(result.message, "success", 8000);
            }

            if (terminal) {
                ns.tprint(message);
            }

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

        writeServerTicker(ns, {
            result,
            moneyBefore,
            moneyAfter,
            policy: serverPurchasePolicy,
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

function writeServerTicker(ns, data) {
    try {
        const result = data.result ?? {};
        const fleet = getFleetSummary(ns);
        const acted = result.acted === true;
        const server =
            result.server ??
            result.serverName ??
            result.item ??
            null;
        const cost =
            Number.isFinite(result.cost)
                ? result.cost
                : Math.max(0, data.moneyBefore - data.moneyAfter);

        ns.write(
            SERVER_TICKER_FILE,
            JSON.stringify({
                updatedAt: Date.now(),
                source: "server-purchaser",
                acted,
                status: acted ? "acted" : "idle",
                type: result.type ?? "none",
                server,
                ram:
                    result.ram ??
                    fleet?.serverRam?.[server] ??
                    null,
                cost,
                message: result.message ?? "No server purchase action.",
                moneyBefore: data.moneyBefore,
                moneyAfter: data.moneyAfter,
                policy: {
                    maxServerUpgradeCost:
                        Number.isFinite(data.policy?.maxServerUpgradeCost)
                            ? data.policy.maxServerUpgradeCost
                            : null,
                    serverUpgradeCapReason:
                        data.policy?.serverUpgradeCapReason ?? null,
                },
                fleet,
            }, null, 2),
            "w"
        );
    } catch {
        // Telemetry should never break the purchaser.
    }
}

function getFleetSummary(ns) {
    try {
        if (!ns.cloud) {
            return {
                available: false,
                reason: "Cloud API unavailable.",
            };
        }

        const names = ns.cloud.getServerNames();
        const ramValues =
            names.map(name => ns.getServerMaxRam(name));
        const serverRam =
            Object.fromEntries(
                names.map(name => [name, ns.getServerMaxRam(name)])
            );

        return {
            available: true,
            count: names.length,
            limit: ns.cloud.getServerLimit(),
            maxRamLimit: ns.cloud.getRamLimit(),
            minRam: ramValues.length ? Math.min(...ramValues) : 0,
            maxRam: ramValues.length ? Math.max(...ramValues) : 0,
            names,
            serverRam,
        };
    } catch (error) {
        return {
            available: false,
            reason: String(error),
        };
    }
}
