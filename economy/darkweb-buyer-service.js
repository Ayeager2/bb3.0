// /economy/darkweb-buyer-service.js
import { logPurchase } from "/lib/daemon/purchase-log.js";

const STATE_FILE = "/data/darkweb-purchase-state.txt";
const COMPLETE_FILE = "/data/darkweb-buyer-complete.txt";
const RESERVE_DEFAULT = 200_000;

const PURCHASE_QUEUE = [
    { name: "TOR router", key: "tor", action: "tor", cost: 200_000 },
    { name: "BruteSSH.exe", key: "BruteSSH.exe", action: "program" },
    { name: "FTPCrack.exe", key: "FTPCrack.exe", action: "program" },
    { name: "relaySMTP.exe", key: "relaySMTP.exe", action: "program" },
    { name: "HTTPWorm.exe", key: "HTTPWorm.exe", action: "program" },
    { name: "ServerProfiler.exe", key: "ServerProfiler.exe", action: "program" },
    { name: "DeepscanV1.exe", key: "DeepscanV1.exe", action: "program" },
    { name: "AutoLink.exe", key: "AutoLink.exe", action: "program" },
    { name: "DeepscanV2.exe", key: "DeepscanV2.exe", action: "program" },
    { name: "DarkscapeNavigator.exe", key: "DarkscapeNavigator.exe", action: "program" },
    { name: "SQLInject.exe", key: "SQLInject.exe", action: "program" },
    { name: "Formulas.exe", key: "Formulas.exe", action: "program" },
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["reserve", RESERVE_DEFAULT],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const reserve = Number(flags.reserve) || RESERVE_DEFAULT;

    // If a stale completion marker exists, live validation decides whether it survives.
    refreshCompletionMarker(ns);

    while (true) {
        const state = buildLiveState(ns);
        writeJson(ns, STATE_FILE, state);

        if (state.completed) {
            shutdownCompletedService(ns, state);
            return;
        }

        const next = getNextPurchase(ns, state, reserve);

        if (!next) {
            // Safety fallback: should usually be covered by state.completed.
            const finalState = buildLiveState(ns);
            if (finalState.completed) {
                shutdownCompletedService(ns, finalState);
                return;
            }

            await ns.sleep(refreshMs);
            continue;
        }

        if (!next.affordable) {
            await ns.sleep(refreshMs);
            continue;
        }

        const moneyBefore = ns.getPlayer().money;
        const bought = buyItem(ns, next);
        const moneyAfter = ns.getPlayer().money;

        // Re-check live ownership after purchase attempt.
        const ownedAfterAttempt = isActuallyOwned(ns, next);

        if (bought || ownedAfterAttempt) {
            const actualCost =
                next.action === "tor"
                    ? Math.max(0, moneyBefore - moneyAfter) || 200_000
                    : Math.max(0, moneyBefore - moneyAfter);

            const message =
                `[DARKWEB BUYER] Purchased ${next.name} for ${ns.format.number(actualCost)}.`;

            ns.toast(`Purchased ${next.name}`, "success", 8000);
            ns.tprint(message);

            logPurchase(ns, {
                source: "darkweb-buyer",
                type: next.action,
                item: next.name,
                cost: actualCost,
                moneyBefore,
                moneyAfter,
                message,
            });

            const updatedState = buildLiveState(ns);
            updatedState.lastPurchase = {
                item: next.name,
                cost: actualCost,
                at: Date.now(),
            };
            writeJson(ns, STATE_FILE, updatedState);

            if (updatedState.completed) {
                shutdownCompletedService(ns, updatedState);
                return;
            }
        } else {
            ns.tprint(`[DARKWEB BUYER] Purchase attempt failed: ${next.name}`);
        }

        await ns.sleep(refreshMs);
    }
}

function buildLiveState(ns) {
    const purchased = {};

    for (const item of PURCHASE_QUEUE) {
        purchased[item.key] = isActuallyOwned(ns, item);
    }

    const missing = PURCHASE_QUEUE
        .filter(item => purchased[item.key] !== true)
        .map(item => item.name);

    return {
        updatedAt: Date.now(),
        purchased,
        missing,
        completed: missing.length === 0,
    };
}

function refreshCompletionMarker(ns) {
    const state = buildLiveState(ns);

    if (state.completed) {
        writeJson(ns, COMPLETE_FILE, {
            completed: true,
            completedAt: Date.now(),
            reason: "verified all darkweb items owned",
            purchased: state.purchased,
        });
        return;
    }

    if (ns.fileExists(COMPLETE_FILE, "home")) {
        ns.rm(COMPLETE_FILE, "home");
        ns.tprint("[DARKWEB BUYER] Removed stale completion marker.");
    }
}

function shutdownCompletedService(ns, state) {
    const completedAt = Date.now();

    writeJson(ns, COMPLETE_FILE, {
        completed: true,
        completedAt,
        reason: "verified all darkweb items owned",
        purchased: state.purchased,
    });

    if (ns.fileExists(STATE_FILE, "home")) {
        ns.rm(STATE_FILE, "home");
    }

    ns.tprint("[DARKWEB BUYER] All darkweb items purchased. Closing service.");
}

function getNextPurchase(ns, state, reserve) {
    const spendable = Math.max(0, ns.getPlayer().money - reserve);

    for (const item of PURCHASE_QUEUE) {
        if (state.purchased[item.key] === true) continue;

        const cost = getCost(ns, item);

        return {
            ...item,
            cost,
            affordable: Number.isFinite(cost) && spendable >= cost,
        };
    }

    return null;
}

function isActuallyOwned(ns, item) {
    if (item.action === "tor") return hasTor(ns);
    return ns.fileExists(item.name, "home");
}

function hasTor(ns) {
    try {
        return ns.hasTorRouter();
    } catch {
        // fallback below
    }

    try {
        return ns.scan("home").includes("darkweb");
    } catch {
        return false;
    }
}

function getCost(ns, item) {
    if (item.action === "tor") return item.cost;

    try {
        return ns.singularity.getDarkwebProgramCost(item.name);
    } catch {
        // fallback below
    }

    try {
        return ns.getDarkwebProgramCost(item.name);
    } catch {
        return Infinity;
    }
}

function buyItem(ns, item) {
    if (item.action === "tor") {
        try {
            return ns.singularity.purchaseTor();
        } catch {
            // fallback below
        }

        try {
            return ns.purchaseTor();
        } catch {
            return false;
        }
    }

    try {
        return ns.singularity.purchaseProgram(item.name);
    } catch {
        // fallback below
    }

    try {
        return ns.purchaseProgram(item.name);
    } catch {
        return false;
    }
}

function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}