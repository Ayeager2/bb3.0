import { buildHacknetState } from "/lib/daemon/hacknet.js";

const HACKNET_STATE_FILE = "/data/hacknet-state.txt";
const HASH_SPENDER_STATE_FILE = "/data/hacknet-hash-spender-state.txt";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const serviceState =
        readJson(ns, HACKNET_STATE_FILE);
    const hashSpender =
        readJson(ns, HASH_SPENDER_STATE_FILE);
    const live =
        buildHacknetState(ns, {
            targetNodes: serviceState.targetNodes ?? 23,
            targetLevel: serviceState.targetLevel ?? 200,
            targetRam: serviceState.targetRam ?? 64,
            targetCores: serviceState.targetCores ?? 16,
            reserveMoney: serviceState.reserveMoney ?? 0,
        });

    ns.tprint("Hacknet Status");
    ns.tprint("=".repeat(70));
    ns.tprint(`Service: ${serviceState.status ?? "unknown"} | Allowed: ${yesNo(serviceState.allowed)}`);
    ns.tprint(`Message: ${serviceState.message ?? "none"}`);
    ns.tprint(`Hash Spender: ${hashSpender.status ?? "unknown"} | ${hashSpender.message ?? "none"}`);
    ns.tprint(`Nodes: ${live.nodeCount}/${live.targetNodes} | Max Nodes: ${live.maxNodes}`);
    ns.tprint(`Targets: level ${live.targetLevel} | RAM ${live.targetRam}GB | cores ${live.targetCores}`);
    ns.tprint(`Production: ${formatMoney(ns, live.totalProduction)} / sec`);
    ns.tprint(`Produced: ${formatMoney(ns, live.totalProduced)}`);
    ns.tprint(`Money: ${formatMoney(ns, live.money)} | Reserve: ${formatMoney(ns, live.reserveMoney)} | Spendable: ${formatMoney(ns, live.spendable)}`);

    if (live.hashes.available) {
        ns.tprint(`Hashes: ${formatNumber(ns, live.hashes.hashes)} / ${formatNumber(ns, live.hashes.capacity)}`);

    ns.tprint("-".repeat(70));

    if (live.nextAction) {
        ns.tprint(`Next: ${live.nextAction.label}`);
        ns.tprint(`Cost: ${formatMoney(ns, live.nextAction.cost)} | Affordable: ${yesNo(live.canAffordNext)}`);
    } else {
        ns.tprint("Next: complete");
    }

    ns.tprint("-".repeat(70));

    for (const node of live.nodes) {
        ns.tprint(
            `${node.index}: ${node.name} | ` +
            `L${node.level} ${node.ram}GB C${node.cores} | ` +
            `${formatMoney(ns, node.production)}/s | ` +
            `total ${formatMoney(ns, node.totalProduction)}`
        );
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

function yesNo(value) {
    return value === true ? "YES" : "NO";
}

function formatMoney(ns, value) {
    return ns.format?.number
        ? `$${ns.format.number(value)}`
        : `$${Number(value).toFixed(0)}`;
}

function formatNumber(ns, value) {
    return ns.format?.number
        ? ns.format.number(value)
        : String(Number(value).toFixed(0));
}
