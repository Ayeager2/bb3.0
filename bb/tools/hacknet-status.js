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
    const serviceStrategy =
        serviceState.roi?.strategy ?? "";
    const serviceMaxPayback =
        serviceState.roi?.unlimitedPayback === true ||
        serviceStrategy.includes("aggressive")
            ? 0
            : serviceState.roi?.maxPaybackSeconds ?? 3600;
    const live =
        buildHacknetState(ns, {
            targetNodes: serviceState.targetNodes ?? 0,
            targetLevel: serviceState.targetLevel ?? 0,
            targetRam: serviceState.targetRam ?? 0,
            targetCores: serviceState.targetCores ?? 0,
            targetCache: serviceState.targetCache ?? 0,
            reserveMoney: serviceState.reserveMoney ?? 0,
            maxPaybackSeconds: serviceMaxPayback,
            hashBufferSeconds: serviceState.cachePolicy?.hashBufferSeconds ?? 7200,
            sellForMoneyValue: serviceState.roi?.sellForMoneyValue ?? 2_000_000,
        });

    ns.tprint("Hacknet Status");
    ns.tprint("=".repeat(70));
    ns.tprint(`Service: ${serviceState.status ?? "unknown"} | Allowed: ${yesNo(serviceState.allowed)}`);
    ns.tprint(`Message: ${serviceState.message ?? "none"}`);
    ns.tprint(`Hash Spender: ${hashSpender.status ?? "unknown"} | ${hashSpender.message ?? "none"}`);
    if (serviceState.purchaseCount) {
        ns.tprint(`Buyer Last Cycle: ${formatNumber(ns, serviceState.purchaseCount)} purchase(s)`);
    }
    if (hashSpender.hashPolicy) {
        ns.tprint(
            `Hash Policy: ${hashSpender.hashPolicy.upgradeName ?? "unknown"}` +
            `${hashSpender.hashPolicy.target ? ` -> ${hashSpender.hashPolicy.target}` : ""}`
        );
        ns.tprint(`Hash Source: ${hashSpender.hashPolicy.source ?? "unknown"} | Phase: ${hashSpender.hashPolicy.phase ?? "unknown"}`);
        ns.tprint(
            `Hash Mode: ${hashSpender.targetShaping ? "TARGET SHAPING" : hashSpender.liquidate ? "LIQUIDATE" : hashSpender.bankHashes ? "BANK" : "NORMAL"}` +
            `${hashSpender.fallbackOnlyAfterPrimary ? " | fallback after primary" : ""}`
        );
        if (hashSpender.hashPolicy.fallbackUpgradeName) {
            ns.tprint(`Hash Fallback: ${hashSpender.hashPolicy.fallbackUpgradeName}`);
        }
        ns.tprint(`Hash Reason: ${hashSpender.hashPolicy.reason ?? "none"}`);
        if (hashSpender.primarySpends || hashSpender.fallbackSpends) {
            ns.tprint(
                `Hash Last Cycle: primary ${formatNumber(ns, hashSpender.primarySpends ?? 0)} | ` +
                `fallback ${formatNumber(ns, hashSpender.fallbackSpends ?? 0)}`
            );
        }
    }
    ns.tprint(`Nodes: ${live.nodeCount}/${live.targetNodes} | Max Nodes: ${live.maxNodes}`);
    ns.tprint(`Targets: level ${live.targetLevel} | RAM ${live.targetRam}GB | cores ${live.targetCores} | cache ${live.targetCache}`);
    ns.tprint(`Production: ${formatMoney(ns, live.totalProduction)} / sec`);
    ns.tprint(`Produced: ${formatMoney(ns, live.totalProduced)}`);
    ns.tprint(`Money: ${formatMoney(ns, live.money)} | Reserve: ${formatMoney(ns, live.reserveMoney)} | Spendable: ${formatMoney(ns, live.spendable)}`);

    if (live.hashes.available) {
        ns.tprint(`Hashes: ${formatNumber(ns, live.hashes.hashes)} / ${formatNumber(ns, live.hashes.capacity)}`);
    }
    ns.tprint(
        `Hash Value: $${formatNumber(ns, live.roi?.sellForMoneyValue ?? 0)} per Sell for Money | ` +
        `$${formatNumber(ns, live.roi?.hashMoneyValue ?? 0)}/hash`
    );
    ns.tprint(
        `Buyer Strategy: ${live.roi?.strategy ?? "unknown"} | ` +
        `Gate: ${live.roi?.unlimitedPayback ? "unlimited" : formatDuration(live.roi?.maxPaybackSeconds ?? 0)}`
    );
    ns.tprint(
        `Cache Buffer: ${formatDuration(live.cachePolicy?.hashBufferSeconds ?? 0)} target | ` +
        `gap ${formatNumber(ns, live.cachePolicy?.capacityGap ?? 0)} hashes`
    );

    ns.tprint("-".repeat(70));

    if (live.nextAction) {
        ns.tprint(`Next: ${live.nextAction.label}`);
        ns.tprint(`Cost: ${formatMoney(ns, live.nextAction.cost)} | Affordable: ${yesNo(live.canAffordNext)}`);
        if (live.nextAction.type === "cache") {
            ns.tprint(`Capacity: banking ${formatDuration(live.cachePolicy?.hashBufferSeconds ?? 0)} of current hash production`);
        } else {
            ns.tprint(
                `ROI: payback ${formatDuration(live.nextAction.paybackSeconds)} | ` +
                `+$${formatNumber(ns, live.nextAction.moneyPerSecond ?? 0)}/s hash-value`
            );
        }
    } else {
        ns.tprint(live.roi?.bestCandidate ? "Next: ROI blocked" : "Next: complete");
        if (live.roi?.bestCandidate) {
            const candidate = live.roi.bestCandidate;
            ns.tprint(`Best Candidate: ${candidate.label}`);
            ns.tprint(`Cost: ${formatMoney(ns, candidate.cost)} | Affordable: ${yesNo(live.spendable >= candidate.cost)}`);
            ns.tprint(
                `ROI: payback ${formatDuration(candidate.paybackSeconds)} vs gate ${formatDuration(live.roi.maxPaybackSeconds)} | ` +
                `+$${formatNumber(ns, candidate.moneyPerSecond ?? 0)}/s hash-value`
            );
            ns.tprint(`Hash Gain: +${formatNumber(ns, candidate.productionGain ?? 0)} / sec`);
        }
    }

    if (live.roi?.homeCompetition) {
        ns.tprint(
            `Home Compare: RAM ${formatMoney(ns, live.roi.homeCompetition.ram.cost)} | ` +
            `Core ${formatMoney(ns, live.roi.homeCompetition.cores.cost)}`
        );
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

function formatDuration(seconds) {
    const n =
        Math.max(0, Number(seconds) || 0);

    if (!Number.isFinite(n)) return "unlimited";

    if (n >= 3600) return `${(n / 3600).toFixed(1)}h`;
    if (n >= 60) return `${(n / 60).toFixed(1)}m`;

    return `${n.toFixed(0)}s`;
}
