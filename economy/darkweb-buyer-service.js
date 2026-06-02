import { logPurchase } from "/lib/daemon/purchase-log.js";

const DARKWEB_STATE_FILE = "/data/darkweb-purchase-state.txt";

const PURCHASE_QUEUE = [
    { name: "TOR router", price: 200000, type: "darkweb", action: "tor", priority: 1 },

    { name: "BruteSSH.exe", price: 500000, type: "port-opener", action: "program", priority: 10 },
    { name: "FTPCrack.exe", price: 1500000, type: "port-opener", action: "program", priority: 20 },
    { name: "relaySMTP.exe", price: 5000000, type: "port-opener", action: "program", priority: 30 },
    { name: "HTTPWorm.exe", price: 30000000, type: "port-opener", action: "program", priority: 40 },
    { name: "SQLInject.exe", price: 250000000, type: "port-opener", action: "program", priority: 50 },

    { name: "ServerProfiler.exe", price: 500000, type: "utility", action: "program", priority: 60 },
    { name: "DeepscanV1.exe", price: 500000, type: "utility", action: "program", priority: 70 },
    { name: "AutoLink.exe", price: 1000000, type: "utility", action: "program", priority: 80 },
    { name: "DeepscanV2.exe", price: 25000000, type: "utility", action: "program", priority: 90 },
    { name: "DarkscapeNavigator.exe", price: 50000000, type: "utility", action: "program", priority: 100 },

    { name: "Formulas.exe", price: 5000000000, type: "api", action: "program", priority: 1000 },
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["reserve", 0],
        ["include-formulas", true],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const reserve = Number(flags.reserve ?? 0);
    const includeFormulas = flags["include-formulas"] === true;

    while (true) {
        const state = buildDarkwebState(ns, reserve, includeFormulas);
        writeState(ns, state);

        if (state.completed) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (!state.nextPurchase) {
            await ns.sleep(refreshMs);
            continue;
        }

        const result = tryPurchase(ns, state.nextPurchase);
        const updated = buildDarkwebState(ns, reserve, includeFormulas, result);

        writeState(ns, updated);

        if (result.bought) {
            logPurchase(ns, {
                source: "darkweb-buyer",
                type: state.nextPurchase.type,
                item: state.nextPurchase.name,
                cost: result.cost,
                moneyBefore: result.moneyBefore,
                moneyAfter: result.moneyAfter,
                message: result.message,
            });

            ns.toast(`Purchased ${state.nextPurchase.name}`, "success", 8000);
            ns.tprint(result.message);
        }

        await ns.sleep(refreshMs);
    }
}

function buildDarkwebState(ns, reserve, includeFormulas, lastResult = null) {
    const money = ns.getPlayer().money;
    const spendable = Math.max(0, money - reserve);

    const items = PURCHASE_QUEUE
        .filter(item => includeFormulas || item.name !== "Formulas.exe")
        .sort((a, b) => a.priority - b.priority)
        .map(item => {
            const owned = isOwned(ns, item);
            const affordable = spendable >= item.price;

            return {
                ...item,
                owned,
                affordable,
                bought: owned,
                remaining: !owned,
                lastResult:
                    lastResult?.item === item.name
                        ? lastResult
                        : null,
            };
        });

    const nextPurchase =
        items.find(item => !item.owned && item.affordable) ?? null;

    const nextBlocked =
        items.find(item => !item.owned && !item.affordable) ?? null;

    return {
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),
        money,
        reserve,
        spendable,
        includeFormulas,
        completed: items.every(item => item.owned),
        nextPurchase,
        nextBlocked,
        lastResult,
        items,
    };
}

function tryPurchase(ns, item) {
    const moneyBefore = ns.getPlayer().money;

    let bought = false;

    if (item.action === "tor") {
        bought = purchaseTor(ns);
    } else {
        bought = purchaseProgram(ns, item.name);
    }

    const moneyAfter = ns.getPlayer().money;
    const cost = Math.max(0, moneyBefore - moneyAfter);

    const ownedAfter = isOwned(ns, item);

    const success = bought || ownedAfter;

    return {
        item: item.name,
        action: item.action,
        bought: success,
        apiReturned: bought,
        ownedAfter,
        cost,
        moneyBefore,
        moneyAfter,
        message: success
            ? `[DARKWEB] Purchased ${item.name} for ${ns.format.number(cost)}.`
            : `[DARKWEB] Failed to purchase ${item.name}.`,
    };
}

function isOwned(ns, item) {
    if (item.action === "tor") {
        return hasTor(ns);
    }

    try {
        return ns.fileExists(item.name, "home");
    } catch {
        return false;
    }
}

function hasTor(ns) {
    try {
        if (ns.scan("home").includes("darkweb")) return true;
    } catch { }

    try {
        const programs = ns.singularity.getDarkwebPrograms();
        if (Array.isArray(programs)) return true;
    } catch { }

    try {
        return (
            ns.fileExists("BruteSSH.exe", "home") ||
            ns.fileExists("FTPCrack.exe", "home") ||
            ns.fileExists("relaySMTP.exe", "home") ||
            ns.fileExists("HTTPWorm.exe", "home") ||
            ns.fileExists("SQLInject.exe", "home") ||
            ns.fileExists("ServerProfiler.exe", "home") ||
            ns.fileExists("DeepscanV1.exe", "home") ||
            ns.fileExists("DeepscanV2.exe", "home") ||
            ns.fileExists("AutoLink.exe", "home") ||
            ns.fileExists("DarkscapeNavigator.exe", "home") ||
            ns.fileExists("Formulas.exe", "home")
        );
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

    return false; KW
}

function writeState(ns, state) {
    try {
        ns.write(DARKWEB_STATE_FILE, JSON.stringify(state, null, 2), "w");
    } catch { }
}