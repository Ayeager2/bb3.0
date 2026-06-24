import { STATE_FILE } from "/lib/daemon/config.js";
import { runHacknetBuyer } from "/lib/daemon/hacknet.js";
import { logPurchase } from "/lib/daemon/purchase-log.js";

const HACKNET_STATE_FILE = "/data/hacknet-state.txt";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 5000],
        ["nodes", 23],
        ["level", 200],
        ["ram", 64],
        ["cores", 16],
        ["cache", 8],
        ["reserve", 0],
        ["max-payback", 43200],
        ["hash-buffer-minutes", 120],
        ["sell-value", 2_000_000],
        ["use-policy-reserve", false],
        ["force", false],
        ["debug", true],
        ["toast", true],
        ["terminal", false],
    ]);

    const refreshMs =
        Number(flags.refresh) || 5000;
    const targetNodes =
        Number(flags.nodes) || 23;
    const targetLevel =
        Number(flags.level) || 200;
    const targetRam =
        Number(flags.ram) || 64;
    const targetCores =
        Number(flags.cores) || 16;
    const targetCache =
        Number(flags.cache) || 8;
    const fallbackReserve =
        Number(flags.reserve) || 0;
    const maxPaybackSeconds =
        getMaxPaybackSeconds(flags["max-payback"]);
    const hashBufferSeconds =
        (Number(flags["hash-buffer-minutes"]) || 120) * 60;
    const sellForMoneyValue =
        Number(flags["sell-value"]) || 2_000_000;
    const usePolicyReserve =
        flags["use-policy-reserve"] === true;
    const force =
        flags.force === true;
    const debug =
        flags.debug === true;
    const toast =
        flags.toast === true;
    const terminal =
        flags.terminal === true;
    const recentActions = [];

    while (true) {
        const daemonState =
            readJson(ns, STATE_FILE);
        const policy =
            daemonState?.spendingPolicy ?? {};
        const allowHacknet =
            policy.allowHacknet === true ||
            force === true ||
            isHacknetBitNode(ns);
        const reserveMoney =
            usePolicyReserve && Number.isFinite(policy.reserveMoney)
                ? policy.reserveMoney
                : fallbackReserve;

        if (!allowHacknet) {
            writeHacknetState(ns, {
                updatedAt: Date.now(),
                source: "hacknet-buyer",
                allowed: false,
                status: "blocked",
                message: "Daemon policy has Hacknet purchases disabled.",
                mode: daemonState?.mode ?? "unknown",
                priority: policy.priority ?? "unknown",
                reserveMoney,
            });

            await ns.sleep(refreshMs);
            continue;
        }

        const result =
            runHacknetBuyer(ns, {
                targetNodes,
                targetLevel,
                targetRam,
                targetCores,
                targetCache,
                reserveMoney,
                maxPaybackSeconds,
                hashBufferSeconds,
                sellForMoneyValue,
            });

        const state = {
            ...result.state,
            source: "hacknet-buyer",
            allowed: true,
            status: result.status,
            message: result.message,
            acted: result.acted === true,
            mode: daemonState?.mode ?? "unknown",
            priority: policy.priority ?? "unknown",
            recentActions,
        };

        if (result.acted === true) {
            addRecentAction(recentActions, result.message);
            state.recentActions = recentActions;
        }

        writeHacknetState(ns, state);

        if (debug) {
            ns.clearLog();
            ns.print("Hacknet Buyer");
            ns.print("=".repeat(60));
            ns.print(`Status: ${result.status}`);
            ns.print(`Message: ${result.message}`);
            ns.print(`Nodes: ${state.nodeCount}/${state.targetNodes}`);
            ns.print(`Production: ${ns.format.number(state.totalProduction)} / sec`);
            ns.print(`Spendable: ${ns.format.number(state.spendable)}`);
            ns.print(`ROI gate: ${ns.format.number(state.roi?.maxPaybackSeconds ?? maxPaybackSeconds)}s`);
            ns.print(`Hash sell value: $${ns.format.number(state.roi?.sellForMoneyValue ?? sellForMoneyValue)}`);
            ns.print(
                `Cache buffer: ${formatDuration(state.cachePolicy?.hashBufferSeconds ?? hashBufferSeconds)} | ` +
                `${ns.format.number(state.hashes?.capacity ?? 0)} cap`
            );

            if (state.nextAction) {
                ns.print(`Next: ${state.nextAction.label}`);
                ns.print(`Cost: ${ns.format.number(state.nextAction.cost)}`);
                if (state.nextAction.type === "cache") {
                    ns.print(`Reason: bank ${formatDuration(state.cachePolicy?.hashBufferSeconds ?? hashBufferSeconds)} of hashes`);
                } else {
                    ns.print(`Payback: ${formatDuration(state.nextAction.paybackSeconds)}`);
                }
            } else if (state.roi?.bestCandidate) {
                ns.print(`Best blocked: ${state.roi.bestCandidate.label}`);
                ns.print(`Cost: ${ns.format.number(state.roi.bestCandidate.cost)}`);
                ns.print(`Payback: ${formatDuration(state.roi.bestCandidate.paybackSeconds)}`);
                ns.print(`Gain: ${ns.format.number(state.roi.bestCandidate.productionGain ?? 0)} hashes/s`);
            }
        }

        if (result.acted === true) {
            const message =
                `[HACKNET] ${result.message}`;

            if (toast) {
                ns.toast(result.message, "success", 3000);
            }

            if (terminal) {
                ns.tprint(message);
            }

            logPurchase(ns, {
                source: "hacknet-buyer",
                type: result.type ?? "hacknet",
                item: result.item ?? "hacknet upgrade",
                cost: result.cost,
                moneyBefore: result.moneyBefore,
                moneyAfter: result.moneyAfter,
                message,
            });
        }

        await ns.sleep(refreshMs);
    }
}

function addRecentAction(recentActions, message) {
    recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
    recentActions.splice(20);
}

function formatDuration(seconds) {
    const n =
        Math.max(0, Number(seconds) || 0);

    if (!Number.isFinite(n)) return "unlimited";

    if (n >= 3600) return `${(n / 3600).toFixed(1)}h`;
    if (n >= 60) return `${(n / 60).toFixed(1)}m`;

    return `${n.toFixed(0)}s`;
}

function getMaxPaybackSeconds(value) {
    const n = Number(value);
    if (n === 0) return Number.POSITIVE_INFINITY;
    if (Number.isFinite(n) && n > 0) return n;
    return 43200;
}

function isHacknetBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode === 9;
    } catch {
        return false;
    }
}

function writeHacknetState(ns, state) {
    ns.write(HACKNET_STATE_FILE, JSON.stringify(state, null, 2), "w");
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
