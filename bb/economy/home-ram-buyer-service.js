import { STATE_FILE } from "/lib/daemon/config.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
        ["min-money", 1_000_000],
        ["force", false],
        ["debug", true],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;
    const minMoney = Number(flags["min-money"]) || 1_000_000;
    const force = flags.force === true;
    const debug = flags.debug === true;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const money = ns.getPlayer().money;
        const cost = getHomeRamUpgradeCost(ns);

        if (debug) {
            ns.print(
                `Home RAM check | ` +
                `allow=${force || policy.allowHomeRam === true} | ` +
                `money=${ns.format.number(money)} | ` +
                `cost=${Number.isFinite(cost) ? ns.format.number(cost) : "N/A"} | ` +
                `home=${ns.format.ram(ns.getServerMaxRam("home"))}`
            );
        }

        if (!force && policy.allowHomeRam !== true) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (money < minMoney) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (!Number.isFinite(cost) || cost <= 0) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (money >= cost) {
            const beforeRam = ns.getServerMaxRam("home");
            const moneyBefore = ns.getPlayer().money;

            const upgraded = upgradeHomeRam(ns);

            const afterRam = ns.getServerMaxRam("home");
            const moneyAfter = ns.getPlayer().money;

            if (upgraded || afterRam > beforeRam) {
                const actualCost = Math.max(0, moneyBefore - moneyAfter);

                const message =
                    `[HOME RAM] Upgraded home RAM from ${ns.format.ram(beforeRam)} ` +
                    `to ${ns.format.ram(afterRam)} for ${ns.format.number(actualCost)}.`;

                ns.toast(`Upgraded home RAM to ${ns.format.ram(afterRam)}`, "success", 8000);
                ns.tprint(message);

                logPurchase(ns, {
                    source: "home-ram-buyer",
                    type: "home-ram",
                    item: `home RAM ${ns.format.ram(beforeRam)} -> ${ns.format.ram(afterRam)}`,
                    cost: actualCost,
                    moneyBefore,
                    moneyAfter,
                    message,
                });
            }
        }

        await ns.sleep(refreshMs);
    }
}

function getHomeRamUpgradeCost(ns) {
    try {
        const cost = ns.singularity?.getUpgradeHomeRamCost?.();
        if (Number.isFinite(cost)) return cost;
    } catch { }

    try {
        if (typeof ns.getUpgradeHomeRamCost === "function") {
            const cost = ns.getUpgradeHomeRamCost();
            if (Number.isFinite(cost)) return cost;
        }
    } catch { }

    return Infinity;
}

function upgradeHomeRam(ns) {
    try {
        if (ns.singularity?.upgradeHomeRam?.()) return true;
    } catch { }

    try {
        return typeof ns.upgradeHomeRam === "function" && ns.upgradeHomeRam();
    } catch { }

    return false;
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
