import { STATE_FILE } from "/lib/daemon/config.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

const DARKWEB_ITEMS = [
    { name: "BruteSSH.exe", price: 500_000, type: "port-opener", priority: 10 },
    { name: "FTPCrack.exe", price: 1_500_000, type: "port-opener", priority: 20 },
    { name: "relaySMTP.exe", price: 5_000_000, type: "port-opener", priority: 30 },
    { name: "HTTPWorm.exe", price: 30_000_000, type: "port-opener", priority: 40 },
    { name: "SQLInject.exe", price: 250_000_000, type: "port-opener", priority: 50 },

    { name: "ServerProfiler.exe", price: 500_000, type: "utility", priority: 60 },
    { name: "DeepscanV1.exe", price: 500_000, type: "utility", priority: 70 },
    { name: "AutoLink.exe", price: 1_000_000, type: "utility", priority: 80 },
    { name: "DeepscanV2.exe", price: 25_000_000, type: "utility", priority: 90 },
    { name: "DarkscapeNavigator.exe", price: 50_000_000, type: "utility", priority: 100 },

    { name: "Formulas.exe", price: 5_000_000_000, type: "api", priority: 1000 },
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["reserve", 1_000_000],
        ["include-formulas", true],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const fallbackReserve = Number(flags.reserve) || 1_000_000;
    const includeFormulas = flags["include-formulas"] === true;

    while (true) {
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        if (policy.allowExePurchases !== true) {
            await ns.sleep(refreshMs);
            continue;
        }

        const reserve = policy.reserveMoney ?? fallbackReserve;

        if (!hasTor(ns)) {
            await maybeBuyTor(ns, reserve);
            await ns.sleep(refreshMs);
            continue;
        }

        await buyAffordableDarkwebItems(ns, reserve, includeFormulas);

        await ns.sleep(refreshMs);
    }
}

async function maybeBuyTor(ns, reserve) {
    const moneyBefore = ns.getPlayer().money;
    const spendable = Math.max(0, moneyBefore - reserve);

    if (spendable < 200_000) return;

    const bought = purchaseTor(ns);

    if (!bought || !hasTor(ns)) return;

    const moneyAfter = ns.getPlayer().money;
    const cost = Math.max(0, moneyBefore - moneyAfter);
    const message = `[DARKWEB] Purchased TOR router for ${ns.format.number(cost)}.`;

    ns.toast("Purchased TOR router", "success", 8000);
    ns.tprint(message);

    logPurchase(ns, {
        source: "darkweb-buyer",
        type: "darkweb",
        item: "TOR router",
        cost,
        moneyBefore,
        moneyAfter,
        message,
    });
}

async function buyAffordableDarkwebItems(ns, reserve, includeFormulas) {
    const items = DARKWEB_ITEMS
        .filter(item => includeFormulas || item.name !== "Formulas.exe")
        .filter(item => !ns.fileExists(item.name, "home"))
        .sort((a, b) => a.priority - b.priority);

    for (const item of items) {
        const moneyBefore = ns.getPlayer().money;
        const spendable = Math.max(0, moneyBefore - reserve);

        if (spendable < item.price) continue;

        const bought = purchaseProgram(ns, item.name);

        if (!bought || !ns.fileExists(item.name, "home")) continue;

        const moneyAfter = ns.getPlayer().money;
        const cost = Math.max(0, moneyBefore - moneyAfter);
        const message =
            `[DARKWEB] Purchased ${item.name} for ${ns.format.number(cost)}.`;

        ns.toast(`Purchased ${item.name}`, "success", 8000);
        ns.tprint(message);

        logPurchase(ns, {
            source: "darkweb-buyer",
            type: item.type,
            item: item.name,
            cost,
            moneyBefore,
            moneyAfter,
            message,
        });

        await ns.sleep(50);
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
            ns.fileExists("SQLInject.exe", "home") ||
            ns.fileExists("ServerProfiler.exe", "home") ||
            ns.fileExists("DeepscanV1.exe", "home") ||
            ns.fileExists("DeepscanV2.exe", "home") ||
            ns.fileExists("AutoLink.exe", "home") ||
            ns.fileExists("DarkscapeNavigator.exe", "home") ||
            ns.fileExists("Formulas.exe", "home");
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

function purchaseProgram(ns, program) {
    try {
        return ns.singularity.purchaseProgram(program);
    } catch { }

    try {
        return ns.purchaseProgram(program);
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