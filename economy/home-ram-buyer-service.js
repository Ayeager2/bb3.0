import { STATE_FILE } from "/lib/daemon/config.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
        ["min-money", 1_000_000],
        ["reserve", 1_000_000],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;
    const minMoney = Number(flags["min-money"]) || 1_000_000;
    const fallbackReserve = Number(flags.reserve) || 1_000_000;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const reserve = policy.reserveMoney ?? fallbackReserve;
        const money = ns.getPlayer().money;
        const spendable = Math.max(0, money - reserve);

        if (policy.allowHomeRam !== true) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (money < minMoney || spendable <= 0) {
            await ns.sleep(refreshMs);
            continue;
        }

        const cost = getHomeRamUpgradeCost(ns);

        if (cost > 0 && spendable >= cost) {
            const upgraded = upgradeHomeRam(ns);

            if (upgraded) {
                ns.toast(`Upgraded home RAM to ${ns.format.ram(ns.getServerMaxRam("home"))}`, "success", 8000);
                ns.tprint(`[HOME RAM] Upgraded home RAM to ${ns.format.ram(ns.getServerMaxRam("home"))}`);
            }
        }

        await ns.sleep(refreshMs);
    }
}

function getHomeRamUpgradeCost(ns) {
    try {
        return ns.singularity.getUpgradeHomeRamCost();
    } catch { }

    try {
        return ns.getUpgradeHomeRamCost();
    } catch { }

    return Infinity;
}

function upgradeHomeRam(ns) {
    try {
        return ns.singularity.upgradeHomeRam();
    } catch { }

    try {
        return ns.upgradeHomeRam();
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