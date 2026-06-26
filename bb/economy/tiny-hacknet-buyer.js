const STATE_FILE = "/data/hacknet-state.txt";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 3000],
    ["nodes", 0],
    ["level", 0],
    ["ram", 0],
    ["cores", 0],
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
  const reserve = Number(flags.reserve) || 0;
  const maxPurchases = Math.max(1, Math.floor(Number(flags["max-purchases"]) || 1));
  const debug = flags.debug === true;
  const terminal = flags.terminal === true;
  const recentActions = [];

  while (true) {
    const purchases = [];

    while (purchases.length < maxPurchases) {
      const action = chooseCheapestAction(ns, reserve);
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

    const state = buildState(ns, reserve, purchases, recentActions);
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

function chooseCheapestAction(ns, reserve) {
  const spendable = Math.max(0, ns.getPlayer().money - reserve);
  const candidates = getCandidateActions(ns)
    .filter(action => Number.isFinite(action.cost) && action.cost > 0)
    .sort((a, b) => a.cost - b.cost);

  return candidates.find(action => action.cost <= spendable) ?? candidates[0] ?? null;
}

function getCandidateActions(ns) {
  const actions = [];
  const count = safeNumNodes(ns);
  const maxNodes = safeMaxNodes(ns);

  if (count < maxNodes) {
    actions.push({
      type: "node",
      label: "purchase hacknet node",
      cost: safeCost(() => ns.hacknet.getPurchaseNodeCost()),
      run: () => ns.hacknet.purchaseNode() !== -1,
    });
  }

  for (let i = 0; i < count; i++) {
    const stats = safeNodeStats(ns, i);
    if (!stats) continue;

    actions.push({
      type: "level",
      index: i,
      label: `upgrade node ${i} level`,
      cost: safeCost(() => ns.hacknet.getLevelUpgradeCost(i, 1)),
      run: () => ns.hacknet.upgradeLevel(i, 1),
    });

    actions.push({
      type: "ram",
      index: i,
      label: `upgrade node ${i} RAM`,
      cost: safeCost(() => ns.hacknet.getRamUpgradeCost(i, 1)),
      run: () => ns.hacknet.upgradeRam(i, 1),
    });

    actions.push({
      type: "core",
      index: i,
      label: `upgrade node ${i} core`,
      cost: safeCost(() => ns.hacknet.getCoreUpgradeCost(i, 1)),
      run: () => ns.hacknet.upgradeCore(i, 1),
    });
  }

  return actions;
}

function buildState(ns, reserve, purchases, recentActions) {
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

  const next = chooseCheapestAction(ns, reserve);
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
    targetNodes: safeMaxNodes(ns),
    targetLevel: 0,
    targetRam: 0,
    targetCores: 0,
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
