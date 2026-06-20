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
        ["reserve", 0],
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
    const fallbackReserve =
        Number(flags.reserve) || 0;
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
                reserveMoney,
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
        };

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

            if (state.nextAction) {
                ns.print(`Next: ${state.nextAction.label}`);
                ns.print(`Cost: ${ns.format.number(state.nextAction.cost)}`);
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
