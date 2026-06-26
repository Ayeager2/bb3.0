const STATE_FILE = "/data/hacknet-state.txt";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 3000],
    ["nodes", 5],
    ["level", 200],
    ["ram", 64],
    ["cores", 12],
    ["cache", 0],
    ["reserve", 0],
    ["max-payback", 0],
    ["hash-buffer-minutes", 0],
    ["sell-value", 0],
    ["max-purchases", 1000],
    ["force", false],
    ["debug", true],
    ["toast", false],
    ["terminal", false],
  ]);

  const refreshMs = Number(flags.refresh) || 3000;
  const targetNodes = getPositiveNumber(flags.nodes, 5);
  const targetLevel = getPositiveNumber(flags.level, 200);
  const targetRam = getPositiveNumber(flags.ram, 64);
  const targetCores = Math.min(12, getPositiveNumber(flags.cores, 12));
  const reserve = Number(flags.reserve) || 0;
  const maxPurchases = Math.max(1, Math.floor(Number(flags["max-purchases"]) || 1));
  const debug = flags.debug === true;
  const terminal = flags.terminal === true;
  const recentActions = [];

  while (true) {
    const purchases = [];

    while (purchases.length < maxPurchases) {
      const action = chooseNextAction(ns, {
        reserve,
        targetNodes,
        targetLevel,
        targetRam,
        targetCores,
      });
      if (!action) break;

      const moneyBefore = ns.getPlayer().money;
      if (moneyBefore - reserve < action.cost) break;

      const ok = action.run();
      const moneyAfter = ns.getPlayer().money;
      if (ok !== true) break;

      purchases.push({
        type: action.type,
        item: action.label,
        index: action.index,
        cost: Math.max(0, moneyBefore - moneyAfter) || action.cost,
        moneyBefore,
        moneyAfter,
      });
    }

    if (purchases.length > 0) {
      const summary = `${purchases.length} bootstrap Hacknet buy${purchases.length === 1 ? "" : "s"}.`;
      recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${summary}`);
      recentActions.splice(20);
      if (terminal) ns.tprint(`[TINY HACKNET] ${summary}`);
    }

    const state = buildState(ns, {
      reserve,
      targetNodes,
      targetLevel,
      targetRam,
      targetCores,
    }, purchases, recentActions);
    ns.write(STATE_FILE, JSON.stringify(state, null, 2), "w");

    if (debug) {
      ns.clearLog();
      ns.print("Tiny Hacknet Buyer");
      ns.print("==================");
      ns.print(`Status: ${state.status}`);
      ns.print(`Message: ${state.message}`);
      ns.print(`Nodes: ${state.nodeCount}/${state.maxNodes}`);
      ns.print(`Production: ${state.totalProduction.toFixed(3)} / sec`);
      ns.print(`Spendable: $${Math.floor(state.spendable).toLocaleString()}`);
      if (state.nextAction) {
        ns.print(`Next: ${state.nextAction.label} | $${Math.floor(state.nextAction.cost).toLocaleString()}`);
      }
    }

    await ns.sleep(refreshMs);
  }
}

function chooseNextAction(ns, options) {
  return choosePrimerAction(ns, options) ?? chooseCheapestAction(ns, options);
}

function choosePrimerAction(ns, options) {
  const spendable = Math.max(0, ns.getPlayer().money - options.reserve);
  const count = safeNumNodes(ns);

  if (count <= 0) {
    const action = getPurchaseNodeAction(ns);
    return action.cost <= spendable ? action : action;
  }

  const first = safeNodeStats(ns, 0);
  if (!first) return null;

  const priority = [
    first.ram < options.targetRam ? getRamAction(ns, 0) : null,
    first.cores < options.targetCores ? getCoreAction(ns, 0) : null,
    first.level < options.targetLevel ? getLevelAction(ns, 0) : null,
  ].filter(Boolean);

  return priority.find(action => action.cost <= spendable) ?? priority[0] ?? null;
}

function chooseCheapestAction(ns, options) {
  const reserve = options.reserve ?? 0;
  const spendable = Math.max(0, ns.getPlayer().money - reserve);
  const candidates = getCandidateActions(ns, options)
    .filter(action => Number.isFinite(action.cost) && action.cost > 0)
    .sort((a, b) => a.cost - b.cost);

  return candidates.find(action => action.cost <= spendable) ?? candidates[0] ?? null;
}

function getCandidateActions(ns, options) {
  const actions = [];
  const count = safeNumNodes(ns);
  const maxNodes = Math.min(safeMaxNodes(ns), options.targetNodes);

  if (count < maxNodes) {
    actions.push(getPurchaseNodeAction(ns));
  }

  for (let i = 0; i < count; i++) {
    const stats = safeNodeStats(ns, i);
    if (!stats) continue;

    if (stats.level < options.targetLevel) actions.push(getLevelAction(ns, i));
    if (stats.ram < options.targetRam) actions.push(getRamAction(ns, i));
    if (stats.cores < options.targetCores) actions.push(getCoreAction(ns, i));
  }

  return actions;
}

function getPurchaseNodeAction(ns) {
  return {
    type: "node",
    label: "purchase hacknet node",
    cost: safeCost(() => ns.hacknet.getPurchaseNodeCost()),
    run: () => ns.hacknet.purchaseNode() !== -1,
  };
}

function getLevelAction(ns, index) {
  return {
    type: "level",
    index,
    label: `upgrade node ${index} level`,
    cost: safeCost(() => ns.hacknet.getLevelUpgradeCost(index, 1)),
    run: () => ns.hacknet.upgradeLevel(index, 1),
  };
}

function getRamAction(ns, index) {
  return {
    type: "ram",
    index,
    label: `upgrade node ${index} RAM`,
    cost: safeCost(() => ns.hacknet.getRamUpgradeCost(index, 1)),
    run: () => ns.hacknet.upgradeRam(index, 1),
  };
}

function getCoreAction(ns, index) {
  return {
    type: "core",
    index,
    label: `upgrade node ${index} core`,
    cost: safeCost(() => ns.hacknet.getCoreUpgradeCost(index, 1)),
    run: () => ns.hacknet.upgradeCore(index, 1),
  };
}

function buildState(ns, options, purchases, recentActions) {
  const { reserve, targetNodes, targetLevel, targetRam, targetCores } = options;
  const nodes = [];
  const count = safeNumNodes(ns);

  for (let i = 0; i < count; i++) {
    const stats = safeNodeStats(ns, i);
    if (!stats) continue;
    nodes.push({
      index: i,
      name: stats.name ?? `hacknet-node-${i}`,
      level: stats.level ?? 0,
      ram: stats.ram ?? 0,
      cores: stats.cores ?? 0,
      cache: stats.cache ?? 0,
      production: stats.production ?? 0,
      totalProduction: stats.totalProduction ?? 0,
    });
  }

  const next = chooseNextAction(ns, options);
  const spendable = Math.max(0, ns.getPlayer().money - reserve);
  const totalCost = purchases.reduce((sum, item) => sum + item.cost, 0);

  return {
    updatedAt: Date.now(),
    source: "tiny-hacknet-buyer",
    allowed: true,
    status: purchases.length > 0 ? "purchased" : next ? "waiting-money" : "complete",
    message: purchases.length > 0
      ? `${purchases.length} bootstrap Hacknet purchase${purchases.length === 1 ? "" : "s"} for $${Math.floor(totalCost).toLocaleString()}.`
      : next
        ? `Need $${Math.floor(next.cost).toLocaleString()} for ${next.label}; spendable $${Math.floor(spendable).toLocaleString()}.`
        : "No Hacknet action is available.",
    acted: purchases.length > 0,
    purchaseCount: purchases.length,
    purchases,
    money: ns.getPlayer().money,
    reserveMoney: reserve,
    spendable,
    nodeCount: nodes.length,
    maxNodes: safeMaxNodes(ns),
    targetNodes,
    targetLevel,
    targetRam,
    targetCores,
    targetCache: 0,
    totalProduction: nodes.reduce((sum, node) => sum + (Number(node.production) || 0), 0),
    totalProduced: nodes.reduce((sum, node) => sum + (Number(node.totalProduction) || 0), 0),
    nextAction: next ? summarizeAction(next) : null,
    canAffordNext: next ? spendable >= next.cost : false,
    nodes,
    hashes: {
      available: false,
      hashes: 0,
      capacity: 0,
    },
    recentActions,
  };
}

function summarizeAction(action) {
  return {
    type: action.type,
    index: action.index,
    label: action.label,
    cost: action.cost,
  };
}

function safeNumNodes(ns) {
  try {
    return ns.hacknet.numNodes();
  } catch {
    return 0;
  }
}

function safeMaxNodes(ns) {
  try {
    return ns.hacknet.maxNumNodes();
  } catch {
    return 0;
  }
}

function safeNodeStats(ns, index) {
  try {
    return ns.hacknet.getNodeStats(index);
  } catch {
    return null;
  }
}

function safeCost(fn) {
  try {
    const cost = fn();
    return Number.isFinite(cost) ? cost : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function getPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
