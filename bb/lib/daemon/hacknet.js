const DEFAULT_TARGET_NODES = 0;
const DEFAULT_TARGET_LEVEL = 0;
const DEFAULT_TARGET_RAM = 0;
const DEFAULT_TARGET_CORES = 0;
const DEFAULT_TARGET_CACHE = 0;
const DEFAULT_MAX_PAYBACK_SECONDS = 60 * 60;
const DEFAULT_HASH_BUFFER_SECONDS = 2 * 60 * 60;
const DEFAULT_SELL_FOR_MONEY_VALUE = 2_000_000;

export function buildHacknetState(ns, options = {}) {
    const targetNodes =
        getTargetNodes(ns, options.targetNodes);
    const targetLevel =
        getTargetLevel(ns, options.targetLevel);
    const targetRam =
        getTargetRam(ns, options.targetRam);
    const targetCores =
        getTargetCores(ns, options.targetCores);
    const targetCache =
        getTargetCache(ns, options.targetCache);
    const hashBufferSeconds =
        Number(options.hashBufferSeconds) || DEFAULT_HASH_BUFFER_SECONDS;
    const sellForMoneyValue =
        Number(options.sellForMoneyValue) || DEFAULT_SELL_FOR_MONEY_VALUE;
    const minProduction =
        Math.max(0, Number(options.minProduction) || 0);
    const reserveMoney =
        Number(options.reserveMoney) || 0;
    const money =
        ns.getPlayer().money;
    const spendable =
        Math.max(0, money - reserveMoney);
    const nodes =
        getHacknetNodes(ns);
    const totalProduction =
        nodes.reduce((sum, node) => sum + node.production, 0);
    const actionPlan =
        getHacknetActionPlan(ns, {
            targetNodes,
            targetLevel,
            targetRam,
            targetCores,
            targetCache,
            maxPaybackSeconds: options.maxPaybackSeconds,
            hashBufferSeconds,
            sellForMoneyValue,
            minProduction,
            spendable,
            totalProduction,
        });
    const nextAction =
        actionPlan.nextAction;

    return {
        updatedAt: Date.now(),
        nodeCount: nodes.length,
        maxNodes: ns.hacknet.maxNumNodes(),
        targetNodes,
        targetLevel,
        targetRam,
        targetCores,
        targetCache,
        money,
        reserveMoney,
        spendable,
        totalProduction,
        totalProduced:
            nodes.reduce((sum, node) => sum + node.totalProduction, 0),
        hashes: getHashState(ns),
        cachePolicy: {
            targetCache,
            hashBufferSeconds,
            desiredCapacity: totalProduction * hashBufferSeconds,
            capacityGap:
                Math.max(0, (totalProduction * hashBufferSeconds) - safeHashCapacity(ns)),
            nextAction: summarizeAction(actionPlan.cacheCandidate),
        },
        roi: {
            strategy:
                minProduction > 0 && totalProduction < minProduction
                    ? "production-floor-aggressive"
                    : getMaxPaybackSeconds(options.maxPaybackSeconds) === Number.POSITIVE_INFINITY
                    ? "aggressive-cheapest-affordable"
                    : "payback-seconds",
            unlimitedPayback:
                getMaxPaybackSeconds(options.maxPaybackSeconds) === Number.POSITIVE_INFINITY,
            maxPaybackSeconds:
                getSerializablePaybackSeconds(options.maxPaybackSeconds),
            sellForMoneyValue,
            minProduction,
            productionFloorMet:
                minProduction <= 0 || totalProduction >= minProduction,
            productionFloorGap:
                Math.max(0, minProduction - totalProduction),
            hashMoneyValue: getHashMoneyValue(ns, sellForMoneyValue),
            homeCompetition: getHomeUpgradeCompetition(ns),
            bestCandidate: summarizeAction(actionPlan.bestCandidate),
            blockedByPayback:
                nextAction === null &&
                actionPlan.bestCandidate !== null,
        },
        complete:
            nextAction === null &&
            actionPlan.bestCandidate === null,
        nextAction: summarizeAction(nextAction),
        canAffordNext:
            nextAction !== null &&
            spendable >= nextAction.cost,
        nodes,
    };
}

export function runHacknetBuyer(ns, options = {}) {
    const maxPurchasesPerCycle =
        Math.max(1, Math.floor(Number(options.maxPurchasesPerCycle) || 1));
    const purchases = [];
    let lastState =
        buildHacknetState(ns, options);
    let lastActionPlan =
        null;

    while (purchases.length < maxPurchasesPerCycle) {
        const actionPlan =
            getHacknetActionPlan(ns, {
                targetNodes: lastState.targetNodes,
                targetLevel: lastState.targetLevel,
                targetRam: lastState.targetRam,
                targetCores: lastState.targetCores,
                targetCache: lastState.targetCache,
                maxPaybackSeconds: options.maxPaybackSeconds,
                hashBufferSeconds: lastState.cachePolicy?.hashBufferSeconds,
                sellForMoneyValue: lastState.roi?.sellForMoneyValue,
                minProduction: options.minProduction,
                spendable: lastState.spendable,
                totalProduction: lastState.totalProduction,
            });
        const action =
            actionPlan.nextAction;

        lastActionPlan = actionPlan;

        if (!action) break;
        if (lastState.spendable < action.cost) break;

        const before = ns.getPlayer().money;
        const ok = action.run();
        const after = ns.getPlayer().money;
        const actualCost =
            Math.max(0, before - after);

        if (ok !== true) {
            const failedState =
                buildHacknetState(ns, options);

            return {
                acted: purchases.length > 0,
                status: purchases.length > 0 ? "purchased" : "failed",
                type: action.type,
                index: action.index,
                item: action.label,
                cost: purchases.reduce((sum, item) => sum + item.cost, 0),
                moneyBefore: purchases[0]?.moneyBefore ?? before,
                moneyAfter: after,
                purchases,
                purchaseCount: purchases.length,
                message:
                    purchases.length > 0
                        ? formatPurchaseSummary(ns, purchases)
                        : `Failed to run ${action.label}.`,
                action: summarizeAction(action),
                state: {
                    ...failedState,
                    failedAction: summarizeAction(action),
                    failedSpendable: lastState.spendable,
                    failedMoneyBefore: before,
                    failedMoneyAfter: after,
                },
            };
        }

        purchases.push({
            type: action.type,
            index: action.index,
            item: action.label,
            cost:
                actualCost > 0
                    ? actualCost
                    : action.cost,
            moneyBefore: before,
            moneyAfter: after,
            action: summarizeAction(action),
        });

        lastState =
            buildHacknetState(ns, options);
    }

    if (purchases.length > 0) {
        const afterState =
            buildHacknetState(ns, options);

        return {
            acted: true,
            status: "purchased",
            type: purchases[purchases.length - 1]?.type ?? "hacknet",
            index: purchases[purchases.length - 1]?.index,
            item: purchases[purchases.length - 1]?.item ?? "hacknet upgrade",
            cost: purchases.reduce((sum, item) => sum + item.cost, 0),
            moneyBefore: purchases[0]?.moneyBefore,
            moneyAfter: purchases[purchases.length - 1]?.moneyAfter,
            purchases,
            purchaseCount: purchases.length,
            message: formatPurchaseSummary(ns, purchases),
            action: purchases[purchases.length - 1]?.action ?? null,
            state: afterState,
        };
    }

    const state =
        lastState;
    const actionPlan =
        lastActionPlan ?? getHacknetActionPlan(ns, {
            targetNodes: state.targetNodes,
            targetLevel: state.targetLevel,
            targetRam: state.targetRam,
            targetCores: state.targetCores,
            targetCache: state.targetCache,
            maxPaybackSeconds: options.maxPaybackSeconds,
            hashBufferSeconds: state.cachePolicy?.hashBufferSeconds,
            sellForMoneyValue: state.roi?.sellForMoneyValue,
            minProduction: options.minProduction,
            spendable: state.spendable,
            totalProduction: state.totalProduction,
        });
    const action =
        actionPlan.nextAction;

    if (!action) {
        const bestCandidate =
            summarizeAction(actionPlan.bestCandidate);

        return {
            acted: false,
            status: bestCandidate ? "roi-blocked" : "complete",
            message: bestCandidate
                ? `Best Hacknet action is ${bestCandidate.label}, but payback ${formatDuration(bestCandidate.paybackSeconds)} exceeds gate ${formatDuration(state.roi.maxPaybackSeconds)}.`
                : "No Hacknet action is available.",
            state,
        };
    }

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

function formatPurchaseSummary(ns, purchases) {
    const totalCost =
        purchases.reduce((sum, item) => sum + item.cost, 0);
    const labels =
        summarizePurchaseLabels(purchases);

    return `${purchases.length} Hacknet purchase${purchases.length === 1 ? "" : "s"} for ${formatMoney(ns, totalCost)}: ${labels}.`;
}

function summarizePurchaseLabels(purchases) {
    const counts =
        new Map();

    for (const purchase of purchases) {
        counts.set(purchase.item, (counts.get(purchase.item) ?? 0) + 1);
    }

    return [...counts.entries()]
        .slice(0, 4)
        .map(([label, count]) => count > 1 ? `${label} x${count}` : label)
        .join("; ");
}

export function getNextHacknetAction(ns, options = {}) {
    return getHacknetActionPlan(ns, options).nextAction;
}

export function getHacknetActionPlan(ns, options = {}) {
    const targetNodes =
        getTargetNodes(ns, options.targetNodes);
    const targetLevel =
        getTargetLevel(ns, options.targetLevel);
    const targetRam =
        getTargetRam(ns, options.targetRam);
    const targetCores =
        getTargetCores(ns, options.targetCores);
    const targetCache =
        getTargetCache(ns, options.targetCache);
    const maxPaybackSeconds =
        getMaxPaybackSeconds(options.maxPaybackSeconds);
    const hashBufferSeconds =
        Number(options.hashBufferSeconds) || DEFAULT_HASH_BUFFER_SECONDS;
    const sellForMoneyValue =
        Number(options.sellForMoneyValue) || DEFAULT_SELL_FOR_MONEY_VALUE;
    const minProduction =
        Math.max(0, Number(options.minProduction) || 0);
    const spendable =
        Math.max(0, Number(options.spendable) || 0);
    const nodeCount =
        ns.hacknet.numNodes();
    const productionModel =
        buildProductionModel(ns);
    const totalProduction =
        Number.isFinite(options.totalProduction)
            ? Number(options.totalProduction)
            : productionModel.nodes.reduce((sum, node) => sum + node.production, 0);
    const actions = [];

    if (nodeCount < targetNodes) {
        actions.push({
            type: "node",
            label: "purchase hacknet node",
            cost: ns.hacknet.getPurchaseNodeCost(),
            productionGain: estimateNewNodeProduction(productionModel),
            run: () => ns.hacknet.purchaseNode() !== -1,
        });
    }

    for (let i = 0; i < nodeCount; i++) {
        const node = ns.hacknet.getNodeStats(i);

        if (node.level < targetLevel) {
            const amount =
                1;

            actions.push({
                type: "level",
                index: i,
                amount,
                label: `upgrade node ${i} level by ${amount}`,
                cost: ns.hacknet.getLevelUpgradeCost(i, amount),
                productionGain: estimateUpgradeProductionGain(node, {
                    level: node.level + amount,
                    ram: node.ram,
                    cores: node.cores,
                }, productionModel),
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
                productionGain: estimateUpgradeProductionGain(node, {
                    level: node.level,
                    ram: node.ram * 2,
                    cores: node.cores,
                }, productionModel),
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
                productionGain: estimateUpgradeProductionGain(node, {
                    level: node.level,
                    ram: node.ram,
                    cores: node.cores + 1,
                }, productionModel),
                run: () => ns.hacknet.upgradeCore(i, 1),
            });
        }
    }

    const cacheCandidate =
        getCacheCandidate(ns, {
            targetCache,
            hashBufferSeconds,
            totalProduction,
            spendable,
        });
    const hashMoneyValue =
        getHashMoneyValue(ns, sellForMoneyValue);
    const unlimitedPayback =
        maxPaybackSeconds === Number.POSITIVE_INFINITY;
    const belowProductionFloor =
        minProduction > 0 &&
        totalProduction < minProduction;

    const rawCandidates = actions
        .filter(action =>
            Number.isFinite(action.cost) &&
            action.cost >= 0
        )
        .map(action => annotateRoi(action, hashMoneyValue))
        .sort((a, b) => a.cost - b.cost);
    const candidates = rawCandidates
        .filter(action =>
            Number.isFinite(action.productionGain) &&
            action.productionGain > 0
        )
        .sort((a, b) => a.paybackSeconds - b.paybackSeconds);
    const bestCandidate =
        unlimitedPayback || belowProductionFloor
            ? rawCandidates[0] ?? null
            : candidates[0] ?? null;
    const affordableAction =
        getCheapestAffordableAction(rawCandidates, spendable);
    const nextAction =
        affordableAction ??
        (
            unlimitedPayback
                || belowProductionFloor
                ? rawCandidates[0] ?? null
                : candidates
                    .filter(action =>
                        action.paybackSeconds <= maxPaybackSeconds ||
                        nodeCount === 0
                    )[0] ?? null
        );
    const selectedAction =
        nextAction ??
        (
            cacheCandidate?.affordable === true
                ? cacheCandidate
                : null
        );

    return {
        nextAction: selectedAction,
        productionAction: nextAction,
        cacheCandidate,
        bestCandidate,
        candidates: candidates.map(summarizeAction),
        maxPaybackSeconds,
        minProduction,
        belowProductionFloor,
    };
}

function getCheapestAffordableAction(actions, spendable) {
    return actions
        .filter(action => spendable >= action.cost)
        .sort((a, b) =>
            getActionAggressionPriority(a) - getActionAggressionPriority(b) ||
            b.cost - a.cost
        )[0] ?? null;
}

function getActionAggressionPriority(action) {
    const priorities = {
        node: 0,
        ram: 1,
        core: 2,
        level: 3,
        cache: 4,
    };

    return priorities[action?.type] ?? 9;
}

function getCacheCandidate(ns, options) {
    const desiredCapacity =
        Math.max(0, options.totalProduction * options.hashBufferSeconds);
    const currentCapacity =
        safeHashCapacity(ns);

    if (desiredCapacity <= currentCapacity) return null;

    const actions = [];
    const nodeCount =
        ns.hacknet.numNodes();

    for (let i = 0; i < nodeCount; i++) {
        const node =
            ns.hacknet.getNodeStats(i);

        if (Number(node.cache) >= options.targetCache) continue;

        actions.push({
            type: "cache",
            index: i,
            amount: 1,
            label: `upgrade node ${i} cache`,
            cost: ns.hacknet.getCacheUpgradeCost(i, 1),
            productionGain: 0,
            moneyPerSecond: 0,
            paybackSeconds: null,
            roi: null,
            capacityPolicy: {
                desiredCapacity,
                currentCapacity,
                capacityGap: Math.max(0, desiredCapacity - currentCapacity),
                bufferSeconds: options.hashBufferSeconds,
            },
            run: () => ns.hacknet.upgradeCache(i, 1),
        });
    }

    const action =
        actions
            .filter(x => Number.isFinite(x.cost) && x.cost >= 0)
            .sort((a, b) => a.cost - b.cost)[0] ?? null;

    if (!action) return null;

    return {
        ...action,
        affordable: options.spendable >= action.cost,
    };
}

function getMaxPaybackSeconds(value) {
    const n = Number(value);
    if (n === 0) return Number.POSITIVE_INFINITY;
    if (Number.isFinite(n) && n > 0) return n;
    return DEFAULT_MAX_PAYBACK_SECONDS;
}

function getSerializablePaybackSeconds(value) {
    const seconds =
        getMaxPaybackSeconds(value);

    return Number.isFinite(seconds)
        ? seconds
        : null;
}

function getTargetNodes(ns, value) {
    const max =
        ns.hacknet.maxNumNodes();
    const n =
        Number(value);

    if (!Number.isFinite(n) || n <= 0) {
        return max;
    }

    return Math.min(n, max);
}

function getTargetLevel(ns, value) {
    const n =
        Number(value);

    if (Number.isFinite(n) && n > 0) return n;

    return getHacknetCap(ns, "MaxLevel", 200);
}

function getTargetRam(ns, value) {
    const n =
        Number(value);

    const cap =
        getHacknetCap(ns, "MaxRam", 8192);
    if (Number.isFinite(n) && n > 0) return Math.min(n, cap);

    return cap;
}

function getTargetCores(ns, value) {
    const n =
        Number(value);

    const cap =
        getHacknetCap(ns, "MaxCores", 128);
    if (Number.isFinite(n) && n > 0) return Math.min(n, cap);

    return cap;
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function getTargetCache(ns, value) {
    const n =
        Number(value);

    if (Number.isFinite(n) && n > 0) return n;

    return getHacknetCap(ns, "MaxCache", 15);
}

function getHacknetCap(ns, key, fallback) {
    try {
        const constants =
            ns.formulas?.hacknetServers?.constants?.();
        const value =
            constants?.[key];

        return Number.isFinite(value) && value > 0
            ? value
            : fallback;
    } catch {
        return fallback;
    }
}

function formatDuration(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n)) return "unlimited";
    if (n >= 3600) return `${(n / 3600).toFixed(1)}h`;
    if (n >= 60) return `${(n / 60).toFixed(1)}m`;
    return `${Math.max(0, n).toFixed(0)}s`;
}

function annotateRoi(action, hashMoneyValue) {
    const moneyPerSecond =
        action.productionGain * hashMoneyValue;
    const paybackSeconds =
        moneyPerSecond > 0
            ? action.cost / moneyPerSecond
            : Number.POSITIVE_INFINITY;

    return {
        ...action,
        hashMoneyValue,
        moneyPerSecond,
        paybackSeconds,
        roi:
            action.cost > 0
                ? moneyPerSecond / action.cost
                : 0,
    };
}

function buildProductionModel(ns) {
    const nodes =
        getHacknetNodes(ns);
    const modelSum =
        nodes.reduce((sum, node) => sum + modelProduction(node), 0);
    const actualSum =
        nodes.reduce((sum, node) => sum + node.production, 0);
    const scale =
        modelSum > 0
            ? actualSum / modelSum
            : 1;

    return {
        nodes,
        scale:
            Number.isFinite(scale) && scale > 0
                ? scale
                : 1,
    };
}

function estimateNewNodeProduction(model) {
    if (model.nodes.length === 0) {
        return scaledModelProduction({ level: 1, ram: 1, cores: 1 }, model);
    }

    return Math.max(
        scaledModelProduction({ level: 1, ram: 1, cores: 1 }, model),
        Math.min(...model.nodes.map(node => node.production)) * 0.25
    );
}

function estimateUpgradeProductionGain(current, next, model) {
    const currentModel =
        scaledModelProduction(current, model);
    const nextModel =
        scaledModelProduction(next, model);
    const modelDelta =
        Math.max(0, nextModel - currentModel);

    if (currentModel > 0 && current.production > 0) {
        return current.production * (modelDelta / currentModel);
    }

    return modelDelta;
}

function scaledModelProduction(stats, model) {
    return modelProduction(stats) * model.scale;
}

function modelProduction(stats) {
    const level =
        Math.max(1, Number(stats.level) || 1);
    const ram =
        Math.max(1, Number(stats.ram) || 1);
    const cores =
        Math.max(1, Number(stats.cores) || 1);

    return (
        level *
        Math.pow(1.035, ram - 1) *
        ((cores + 5) / 6)
    );
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

function safeHashCapacity(ns) {
    try {
        return ns.hacknet.hashCapacity();
    } catch {
        return 0;
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
        productionGain: action.productionGain ?? null,
        moneyPerSecond: action.moneyPerSecond ?? null,
        paybackSeconds: action.paybackSeconds ?? null,
        roi: action.roi ?? null,
        capacityPolicy: action.capacityPolicy ?? null,
        affordable: action.affordable ?? null,
    };
}

function getHashMoneyValue(ns, sellForMoneyValue = DEFAULT_SELL_FOR_MONEY_VALUE) {
    try {
        const cost =
            ns.hacknet.hashCost("Sell for Money");

        if (Number.isFinite(cost) && cost > 0) {
            return sellForMoneyValue / cost;
        }
    } catch {
        // Fall through to conservative default.
    }

    return sellForMoneyValue / 4;
}

function getHomeUpgradeCompetition(ns) {
    return {
        ram: {
            cost: safeHomeRamCost(ns),
            current: ns.getServerMaxRam("home"),
        },
        cores: {
            cost: safeHomeCoreCost(ns),
            current: safeHomeCores(ns),
        },
    };
}

function safeHomeRamCost(ns) {
    try {
        const cost = ns.singularity?.getUpgradeHomeRamCost?.();
        return Number.isFinite(cost) ? cost : Infinity;
    } catch {
        return Infinity;
    }
}

function safeHomeCoreCost(ns) {
    try {
        const cost = ns.singularity?.getUpgradeHomeCoresCost?.();
        return Number.isFinite(cost) ? cost : Infinity;
    } catch {
        return Infinity;
    }
}

function safeHomeCores(ns) {
    try {
        return ns.getServer("home").cpuCores;
    } catch {
        return 1;
    }
}

function formatMoney(ns, value) {
    return ns.format?.number
        ? `$${ns.format.number(value)}`
        : `$${Number(value).toFixed(0)}`;
}
