import { STATE_FILE } from "/lib/daemon/config.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

const PROGRAMS = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    "ServerProfiler.exe",
    "DeepscanV1.exe",
    "DeepscanV2.exe",
    "AutoLink.exe",
    "Formulas.exe",
];

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

        if (!hasTor(ns)) {
            await ns.sleep(refreshMs);
            continue;
        }

        const reserve = policy.reserveMoney ?? fallbackReserve;
        const moneyBeforeLoop = ns.getPlayer().money;
        const spendable = Math.max(0, moneyBeforeLoop - reserve);

        for (const program of PROGRAMS) {
            if (ns.fileExists(program, "home")) continue;

            const cost = getProgramCost(ns, program);

            if (!Number.isFinite(cost) || cost <= 0) continue;
            if (spendable < cost) continue;

            const moneyBefore = ns.getPlayer().money;

            if (purchaseProgram(ns, program)) {
                const moneyAfter = ns.getPlayer().money;
                const actualCost = Math.max(0, moneyBefore - moneyAfter);

                const message =
                    `[EXE BUYER] Purchased ${program} for ${ns.format.number(actualCost)}.`;

                ns.toast(`Purchased ${program}`, "success", 8000);
                ns.tprint(message);

                logPurchase(ns, {
                    source: "exe-buyer",
                    type: "program",
                    item: program,
                    cost: actualCost,
                    moneyBefore,
                    moneyAfter,
                    message,
                });

                break;
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

function getProgramCost(ns, program) {
    try {
        return ns.singularity.getDarkwebProgramCost(program);
    } catch { }

    try {
        return ns.getDarkwebProgramCost(program);
    } catch { }

    return Infinity;
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