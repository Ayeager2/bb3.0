import { STATE_FILE } from "/lib/daemon/config.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
        ["min-money", 1_000_000],
        ["reserve", 1_000_000],
        ["debug", true],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;
    const minMoney = Number(flags["min-money"]) || 1_000_000;
    const fallbackReserve = Number(flags.reserve) || 1_000_000;
    const debug = flags.debug === true;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const reserve = policy.reserveMoney ?? fallbackReserve;
        const money = ns.getPlayer().money;
        const spendable = Math.max(0, money - reserve);
        const cost = getHomeRamUpgradeCost(ns);

        if (debug) {
            ns.print(
                `Home RAM check | ` +
                `allow=${policy.allowHomeRam === true} | ` +
                `money=${ns.format.number(money)} | ` +
                `reserve=${ns.format.number(reserve)} | ` +
                `spendable=${ns.format.number(spendable)} | ` +
                `cost=${Number.isFinite(cost) ? ns.format.number(cost) : "N/A"} | ` +
                `home=${ns.format.ram(ns.getServerMaxRam("home"))}`
            );
        }

        if (policy.allowHomeRam !== true) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (money < minMoney || spendable <= 0) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (!Number.isFinite(cost) || cost <= 0) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (spendable >= cost) {
            const before = ns.getServerMaxRam("home");
            const upgraded = upgradeHomeRam(ns);
            const after = ns.getServerMaxRam("home");

            if (upgraded || after > before) {
                ns.toast(`Upgraded home RAM to ${ns.format.ram(after)}`, "success", 8000);
                ns.tprint(`[HOME RAM] Upgraded home RAM to ${ns.format.ram(after)}`);
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

    try {
        return ns.singularity.getUpgradeHomeRamCost?.() ?? Infinity;
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

    try {
        return ns.singularity.upgradeHomeRam?.() ?? false;
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