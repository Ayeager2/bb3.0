const DEFAULT_TARGET_NODES = 23;
const DEFAULT_TARGET_LEVEL = 200;
const DEFAULT_TARGET_RAM = 64;
const DEFAULT_TARGET_CORES = 16;

export function buildHacknetState(ns, options = {}) {
    const targetNodes =
        Math.min(
            Number(options.targetNodes) || DEFAULT_TARGET_NODES,
            ns.hacknet.maxNumNodes()
        );
    const targetLevel =
        Number(options.targetLevel) || DEFAULT_TARGET_LEVEL;
    const targetRam =
        Number(options.targetRam) || DEFAULT_TARGET_RAM;
    const targetCores =
        Number(options.targetCores) || DEFAULT_TARGET_CORES;
    const reserveMoney =
        Number(options.reserveMoney) || 0;
    const money =
        ns.getPlayer().money;
    const spendable =
        Math.max(0, money - reserveMoney);
    const nodes =
        getHacknetNodes(ns);
    const nextAction =
        getNextHacknetAction(ns, {
            targetNodes,
            targetLevel,
            targetRam,
            targetCores,
        });

    return {
        updatedAt: Date.now(),
        nodeCount: nodes.length,
        maxNodes: ns.hacknet.maxNumNodes(),
        targetNodes,
        targetLevel,
        targetRam,
        targetCores,
        money,
        reserveMoney,
        spendable,
        totalProduction:
            nodes.reduce((sum, node) => sum + node.production, 0),
        totalProduced:
            nodes.reduce((sum, node) => sum + node.totalProduction, 0),
        hashes: getHashState(ns),
        complete: nextAction === null,
        nextAction: summarizeAction(nextAction),
        canAffordNext:
            nextAction !== null &&
            spendable >= nextAction.cost,
        nodes,
    };
}

export function runHacknetBuyer(ns, options = {}) {
    const state =
        buildHacknetState(ns, options);
    const action =
        getNextHacknetAction(ns, {
            targetNodes: state.targetNodes,
            targetLevel: state.targetLevel,
            targetRam: state.targetRam,
            targetCores: state.targetCores,
        });

    if (!action) {
        return {
            acted: false,
            status: "complete",
            message: "Hacknet target is complete.",
            state,
        };
    }

    if (state.spendable < action.cost) {
        return {
            acted: false,
            status: "waiting-money",
            message:
                `Need ${formatMoney(ns, action.cost)} for ${action.label}; ` +
                `spendable ${formatMoney(ns, state.spendable)}.`,
            action: summarizeAction(action),
            state,
        };
    }

    const before = ns.getPlayer().money;
    const ok = action.run();
    const after = ns.getPlayer().money;
    const actualCost =
        Math.max(0, before - after);

    return {
        acted: ok === true,
        status: ok === true ? "purchased" : "failed",
        type: action.type,
        index: action.index,
        item: action.label,
        cost:
            actualCost > 0
                ? actualCost
                : action.cost,
        moneyBefore: before,
        moneyAfter: after,
        message:
            ok === true
                ? `${action.label} for ${formatMoney(ns, actualCost || action.cost)}.`
                : `Failed to run ${action.label}.`,
        action: summarizeAction(action),
        state:
            buildHacknetState(ns, options),
    };
}

export function getNextHacknetAction(ns, options = {}) {
    const targetNodes =
        Math.min(
            Number(options.targetNodes) || DEFAULT_TARGET_NODES,
            ns.hacknet.maxNumNodes()
        );
    const targetLevel =
        Number(options.targetLevel) || DEFAULT_TARGET_LEVEL;
    const targetRam =
        Number(options.targetRam) || DEFAULT_TARGET_RAM;
    const targetCores =
        Number(options.targetCores) || DEFAULT_TARGET_CORES;
    const nodeCount =
        ns.hacknet.numNodes();
    const actions = [];

    if (nodeCount < targetNodes) {
        actions.push({
            type: "node",
            label: "purchase hacknet node",
            cost: ns.hacknet.getPurchaseNodeCost(),
            run: () => ns.hacknet.purchaseNode() !== -1,
        });
    }

    for (let i = 0; i < nodeCount; i++) {
        const node = ns.hacknet.getNodeStats(i);

        if (node.level < targetLevel) {
            const amount =
                Math.min(5, targetLevel - node.level);

            actions.push({
                type: "level",
                index: i,
                amount,
                label: `upgrade node ${i} level by ${amount}`,
                cost: ns.hacknet.getLevelUpgradeCost(i, amount),
                run: () => ns.hacknet.upgradeLevel(i, amount),
            });
        }

        if (node.ram < targetRam) {
            actions.push({
                type: "ram",
                index: i,
                amount: 1,
                label: `upgrade node ${i} RAM`,
                cost: ns.hacknet.getRamUpgradeCost(i, 1),
                run: () => ns.hacknet.upgradeRam(i, 1),
            });
        }

        if (node.cores < targetCores) {
            actions.push({
                type: "core",
                index: i,
                amount: 1,
                label: `upgrade node ${i} cores`,
                cost: ns.hacknet.getCoreUpgradeCost(i, 1),
                run: () => ns.hacknet.upgradeCore(i, 1),
            });
        }
    }

    return actions
        .filter(action =>
            Number.isFinite(action.cost) &&
            action.cost >= 0
        )
        .sort((a, b) => a.cost - b.cost)[0] ?? null;
}

function getHacknetNodes(ns) {
    return Array.from(
        { length: ns.hacknet.numNodes() },
        (_, index) => {
            const stats = ns.hacknet.getNodeStats(index);

            return {
                index,
                name: stats.name,
                level: stats.level,
                ram: stats.ram,
                cores: stats.cores,
                cache: stats.cache ?? null,
                production: stats.production,
                totalProduction: stats.totalProduction,
                timeOnline: stats.timeOnline,
            };
        }
    );
}

function getHashState(ns) {
    try {
        return {
            available: true,
            hashes: ns.hacknet.numHashes(),
            capacity: ns.hacknet.hashCapacity(),
            upgrades: ns.hacknet.getHashUpgrades(),
        };
    } catch {
        return {
            available: false,
            hashes: 0,
            capacity: 0,
            upgrades: [],
        };
    }
}

function summarizeAction(action) {
    if (!action) return null;

    return {
        type: action.type,
        index: action.index ?? null,
        amount: action.amount ?? null,
        label: action.label,
        cost: action.cost,
    };
}

function formatMoney(ns, value) {
    return ns.format?.number
        ? `$${ns.format.number(value)}`
        : `$${Number(value).toFixed(0)}`;
}
