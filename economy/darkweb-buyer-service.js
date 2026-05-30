import { STATE_FILE } from "/lib/daemon/config.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["reserve", 1_000_000],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const fallbackReserve = Number(flags.reserve) || 1_000_000;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        if (policy.allowExePurchases !== true) {
            await ns.sleep(refreshMs);
            continue;
        }

        const reserve = policy.reserveMoney ?? fallbackReserve;
        const spendable = Math.max(0, ns.getPlayer().money - reserve);

        if (!hasTor(ns) && spendable >= 200_000) {
            if (purchaseTor(ns)) {
                ns.toast("Purchased TOR router", "success", 8000);
                ns.tprint("[DARKWEB] Purchased TOR router.");
            }
        }

        await ns.sleep(refreshMs);
    }
}

function hasTor(ns) {
    try {
        return ns.scan("home").includes("darkweb");
    } catch {
        return false;
    }
}

function purchaseTor(ns) {
    try {
        return ns.singularity.purchaseTor();
    } catch { }

    try {
        return ns.purchaseTor();
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