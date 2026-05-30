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

        if (hasTor(ns)) {
            await ns.sleep(refreshMs);
            continue;
        }

        const reserve = policy.reserveMoney ?? fallbackReserve;
        const spendable = Math.max(0, ns.getPlayer().money - reserve);

        if (spendable >= 200_000) {
            const bought = purchaseTor(ns);

            if (bought && hasTor(ns)) {
                ns.toast("Purchased TOR router", "success", 8000);
                ns.tprint("[DARKWEB] Purchased TOR router.");
            }
        }

        await ns.sleep(refreshMs);
    }
}

function hasTor(ns) {
    try {
        if (ns.scan("home").includes("darkweb")) return true;
    } catch { }

    try {
        return ns.singularity.getDarkwebPrograms().length >= 0;
    } catch { }

    try {
        return ns.fileExists("BruteSSH.exe", "home") ||
            ns.fileExists("FTPCrack.exe", "home") ||
            ns.fileExists("relaySMTP.exe", "home") ||
            ns.fileExists("HTTPWorm.exe", "home") ||
            ns.fileExists("SQLInject.exe", "home");
    } catch { }

    return false;
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