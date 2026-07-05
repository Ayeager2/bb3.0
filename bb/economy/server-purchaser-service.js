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
        ["max-purchases", 25],
        ["force", false],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;
    const debug = flags.debug === true;
    const toast = flags.toast === true;
    const terminal = flags.terminal === true;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const hasDaemonPolicy =
            !!state?.spendingPolicy;
        const policy = state?.spendingPolicy ?? {};

        const hasFormulas =
            ns.fileExists("Formulas.exe", "home");

        const serverPurchasePolicy = {
            ...policy,
            allowServerPurchases:
                flags.force === true ||
                hasDaemonPolicy !== true ||
                policy.allowServerPurchases === true,
            maxServerUpgradeCost:
                hasFormulas
                    ? Number.POSITIVE_INFINITY
                    : PRE_FORMULAS_MAX_UPGRADE_COST,
            serverUpgradeCapReason:
                hasFormulas
                    ? "Formulas.exe owned; cloud upgrade cap removed."
                    : "Formulas.exe missing; cloud upgrade cost capped at 1b.",
            maxServerPurchasesPerCycle:
                Math.max(1, Math.floor(Number(flags["max-purchases"]) || 25)),
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

            // if (toast) {
            //     ns.toast(result.message, "success", 8000);
            // }

            // if (terminal) {
            //     ns.tprint(message);
            // }

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
                details: result.purchases ?? null,
                purchases: result.purchases ?? [],
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
                purchases: result.purchases ?? [],
                purchaseCount: Array.isArray(result.purchases)
                    ? result.purchases.length
                    : acted
                        ? 1
                        : 0,
                stoppedReason: result.stoppedReason ?? null,
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
        const servers =
            names
                .map(name => ({
                    name,
                    ram: ns.getServerMaxRam(name),
                    usedRam: ns.getServerUsedRam(name),
                }))
                .sort((a, b) => a.ram - b.ram || a.name.localeCompare(b.name));
        const weakest =
            servers[0] ?? null;
        const strongest =
            servers[servers.length - 1] ?? null;
        const maxRamLimit =
            ns.cloud.getRamLimit();
        const nextUpgradeRam =
            weakest
                ? getNextRamTier(weakest.ram, maxRamLimit)
                : 0;
        const nextUpgradeCost =
            weakest && nextUpgradeRam > weakest.ram
                ? safeGetServerUpgradeCost(ns, weakest.name, nextUpgradeRam)
                : 0;
        const nextPurchaseRam =
            weakest?.ram ?? 8;
        const nextPurchaseCost =
            names.length < ns.cloud.getServerLimit()
                ? safeGetServerCost(ns, nextPurchaseRam)
                : 0;
        const money =
            ns.getPlayer().money;

        return {
            available: true,
            count: names.length,
            limit: ns.cloud.getServerLimit(),
            maxRamLimit,
            minRam: ramValues.length ? Math.min(...ramValues) : 0,
            maxRam: ramValues.length ? Math.max(...ramValues) : 0,
            totalRam: ramValues.reduce((sum, ram) => sum + ram, 0),
            names,
            serverRam,
            servers,
            weakest,
            strongest,
            nextAction:
                names.length < ns.cloud.getServerLimit()
                    ? {
                        type: "purchase",
                        server: null,
                        ram: nextPurchaseRam,
                        cost: nextPurchaseCost,
                        affordable: money >= nextPurchaseCost,
                    }
                    : {
                        type: nextUpgradeRam > (weakest?.ram ?? 0) ? "upgrade" : "none",
                        server: weakest?.name ?? null,
                        fromRam: weakest?.ram ?? 0,
                        ram: nextUpgradeRam,
                        cost: nextUpgradeCost,
                        affordable: money >= nextUpgradeCost,
                    },
        };
    } catch (error) {
        return {
            available: false,
            reason: String(error),
        };
    }
}

function getNextRamTier(currentRam, maxRam) {
    const current = Math.max(0, Number(currentRam) || 0);
    const max = Math.max(0, Number(maxRam) || 0);

    if (max <= 0 || current >= max) return 0;
    if (current <= 0) return Math.min(8, max);

    return Math.min(current * 2, max);
}

function safeGetServerCost(ns, ram) {
    try {
        return ns.cloud.getServerCost(ram);
    } catch {
        return 0;
    }
}

function safeGetServerUpgradeCost(ns, server, ram) {
    try {
        return ns.cloud.getServerUpgradeCost(server, ram);
    } catch {
        return 0;
    }
}
