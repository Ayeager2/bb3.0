import { CONFIG } from "/lib/daemon/config.js";
import { STATE_FILE } from "/lib/daemon/config.js";
import { chooseHacknetHashUpgrade } from "/lib/daemon/hacknet-hash-policy.js";

const HASH_SPENDER_STATE_FILE = "/data/hacknet-hash-spender-state.txt";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const defaults =
        CONFIG.sellHashes ?? {};
    const flags = ns.flags([
        ["refresh", 5000],
        ["upgrade", "auto"],
        ["target", ""],
        ["reserve", defaults.reserveHashes ?? 0],
        ["min", defaults.minHashesToSpend ?? 4],
        ["max-spends", defaults.maxSpendsPerCycle ?? 25],
        ["force", false],
        ["debug", true],
    ]);

    const refreshMs =
        Number(flags.refresh) || 5000;
    const upgradeName =
        String(flags.upgrade || "auto");
    const manualTarget =
        String(flags.target || "");
    const reserveHashes =
        Number(flags.reserve) || 0;
    const minHashesToSpend =
        Number(flags.min) || 1;
    const maxSpendsPerCycle =
        Number(flags["max-spends"]) || 25;
    const force =
        flags.force === true;
    const debug =
        flags.debug === true;

    while (true) {
        const daemonState =
            readJson(ns, STATE_FILE);
        const policy =
            daemonState?.spendingPolicy ?? {};
        const allow =
            policy.allowHacknet === true ||
            force === true ||
            isHacknetBitNode(ns);
        const hashPolicy =
            chooseHacknetHashUpgrade(ns, {
                daemonState,
                manualUpgrade: upgradeName,
                manualTarget,
            });
        const result =
            allow
                ? spendHashes(ns, {
                    upgradeName: hashPolicy.upgradeName,
                    target: hashPolicy.target,
                    reserveHashes,
                    minHashesToSpend,
                    maxSpendsPerCycle,
                })
                : {
                    acted: false,
                    spends: 0,
                    status: "blocked",
                    message: "Daemon policy has Hacknet disabled.",
                };

        const state = {
            updatedAt: Date.now(),
            source: "hacknet-hash-spender",
            allowed: allow,
            status: result.status,
            message: result.message,
            upgradeName: hashPolicy.upgradeName,
            target: hashPolicy.target,
            hashPolicy,
            reserveHashes,
            minHashesToSpend,
            maxSpendsPerCycle,
            hashes: safeNumHashes(ns),
            capacity: safeHashCapacity(ns),
            acted: result.acted,
            spends: result.spends,
        };

        ns.write(HASH_SPENDER_STATE_FILE, JSON.stringify(state, null, 2), "w");

        if (debug) {
            ns.clearLog();
            ns.print("Hacknet Hash Spender");
            ns.print("=".repeat(60));
            ns.print(`Status: ${state.status}`);
            ns.print(`Message: ${state.message}`);
            ns.print(`Hashes: ${ns.format.number(state.hashes)} / ${ns.format.number(state.capacity)}`);
        }

        await ns.sleep(refreshMs);
    }
}

function spendHashes(ns, options) {
    const available =
        Math.max(0, safeNumHashes(ns) - options.reserveHashes);
    const cost =
        safeHashCost(ns, options.upgradeName);

    if (!Number.isFinite(cost) || cost <= 0) {
        return {
            acted: false,
            spends: 0,
            status: "blocked",
            message: `${describeUpgrade(options)} hash cost is unavailable.`,
        };
    }

    if (available < Math.max(cost, options.minHashesToSpend)) {
        return {
            acted: false,
            spends: 0,
            status: "waiting-hashes",
            message: `Need ${ns.format.number(cost)} hashes for ${describeUpgrade(options)}.`,
        };
    }

    let spends = 0;

    while (spends < options.maxSpendsPerCycle) {
        const spendable =
            Math.max(0, safeNumHashes(ns) - options.reserveHashes);
        const nextCost =
            safeHashCost(ns, options.upgradeName);

        if (!Number.isFinite(nextCost) || spendable < nextCost) {
            break;
        }

        if (!safeSpendHashes(ns, options.upgradeName, options.target)) {
            break;
        }

        spends++;
    }

    return {
        acted: spends > 0,
        spends,
        status: spends > 0 ? "spent" : "failed",
        message:
            spends > 0
                ? `Spent hashes on ${describeUpgrade(options)} x${spends}.`
                : `Unable to spend hashes on ${describeUpgrade(options)}.`,
    };
}

function safeSpendHashes(ns, upgradeName, target = null) {
    try {
        if (target) {
            return ns.hacknet.spendHashes(upgradeName, target);
        }

        return ns.hacknet.spendHashes(upgradeName);
    } catch {
        try {
            return ns.hacknet.spendHashes(upgradeName, target ?? "", 1);
        } catch {
            return false;
        }
    }
}

function describeUpgrade(options) {
    return options.target
        ? `${options.upgradeName} on ${options.target}`
        : options.upgradeName;
}

function safeHashCost(ns, upgradeName) {
    try {
        return ns.hacknet.hashCost(upgradeName);
    } catch {
        return Infinity;
    }
}

function safeNumHashes(ns) {
    try {
        return ns.hacknet.numHashes();
    } catch {
        return 0;
    }
}

function safeHashCapacity(ns) {
    try {
        return ns.hacknet.hashCapacity();
    } catch {
        return 0;
    }
}

function isHacknetBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode === 9;
    } catch {
        return false;
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
