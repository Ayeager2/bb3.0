const STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(900, 650);
  }
  const CONFIG = {
    refreshMs: 1000,
    actionRefreshMs: 100,
    stateRefreshMs: 2000,

    fallbackReserveMoney: 1_000_000_000,

    // Only buy upgrades that pay for themselves within this many seconds.
    // 3600 = 1 hour, 600 = 10 minutes, 300 = 5 minutes.
    defaultMaxPayoffSeconds: 600,

    payoffByPriority: {
      income: 600,
      upgrades: 300,
      leveling: 120,
      faction: 0,
      "reset-prep": 0,
      unknown: 300,
    },
  };

  let daemonState = {};
  let lastStateRefresh = 0;

  const state = {
    started: Date.now(),
    cycles: 0,
    daemonAllowed: true,
    daemonPriority: "unknown",
    reserveMoney: CONFIG.fallbackReserveMoney,
    maxPayoffSeconds: CONFIG.defaultMaxPayoffSeconds,
    nodeCount: 0,
    maxNodes: 0,
    totalProduction: 0,
    money: 0,
    spendableMoney: 0,
    best: null,
    lastAction: "Starting daemon-controlled Hacknet manager...",
    recentActions: [],
  };

  while (true) {
    const now = Date.now();

    if (now - lastStateRefresh > CONFIG.stateRefreshMs) {
      daemonState = readDaemonState(ns);
      lastStateRefresh = now;
    }

    const policy = daemonState?.spendingPolicy ?? {};
    state.daemonAllowed = policy.allowHacknet !== false;
    state.daemonPriority = policy.priority ?? "unknown";
    state.reserveMoney = Number.isFinite(policy.reserveMoney)
      ? policy.reserveMoney
      : CONFIG.fallbackReserveMoney;

    state.maxPayoffSeconds =
      CONFIG.payoffByPriority[state.daemonPriority] ??
      CONFIG.defaultMaxPayoffSeconds;

    state.cycles++;
    state.nodeCount = ns.hacknet.numNodes();
    state.maxNodes = ns.hacknet.maxNumNodes();
    state.totalProduction = getTotalProduction(ns);
    state.money = ns.getPlayer().money;
    state.spendableMoney = Math.max(0, state.money - state.reserveMoney);
    state.best = getBestUpgrade(ns);
    const hashResult = spendHashesForMoney(ns, CONFIG, state);

    if (hashResult.spent > 0) {
      log(state, `Sold hashes for money x${hashResult.spent}`);
    }

    drawDashboard(ns, CONFIG, state);

    if (!state.daemonAllowed) {
      log(state, "Paused by daemon spending policy.");
      await ns.sleep(CONFIG.refreshMs);
      continue;
    }

    if (!state.best) {
      await ns.sleep(CONFIG.refreshMs);
      continue;
    }

    if (state.best.payoffSeconds > state.maxPayoffSeconds) {
      await ns.sleep(CONFIG.refreshMs);
      continue;
    }

    if (state.spendableMoney < state.best.cost) {
      await ns.sleep(CONFIG.refreshMs);
      continue;
    }

    const bought = buyUpgrade(ns, state.best);

    if (bought) {
      log(state, `Bought ${state.best.description}`);
      await ns.sleep(CONFIG.actionRefreshMs);
    } else {
      log(state, `Failed ${state.best.description}`);
      await ns.sleep(CONFIG.refreshMs);
    }
  }
}
function spendHashesForMoney(ns, CONFIG, state) {
  const result = {
    available: false,
    hashes: 0,
    capacity: 0,
    spent: 0,
  };

  if (!CONFIG.sellHashes?.enabled) return result;
  if (!state.daemonAllowed) return result;

  let hashes = 0;
  let capacity = 0;
  let hashCost = 0;

  try {
    hashes = ns.hacknet.numHashes();
    capacity = ns.hacknet.hashCapacity();
    hashCost = ns.hacknet.hashCost(CONFIG.sellHashes.upgradeName);
  } catch {
    return result;
  }

  result.available = true;
  result.hashes = hashes;
  result.capacity = capacity;

  if (!Number.isFinite(hashCost) || hashCost <= 0) return result;

  const reserve = CONFIG.sellHashes.reserveHashes ?? 0;
  const minHashes = CONFIG.sellHashes.minHashesToSpend ?? hashCost;
  const maxSpends = CONFIG.sellHashes.maxSpendsPerCycle ?? 25;

  let spendableHashes = Math.max(0, hashes - reserve);

  if (spendableHashes < minHashes) return result;

  let spends = Math.min(maxSpends, Math.floor(spendableHashes / hashCost));

  while (spends > 0) {
    const sold = ns.hacknet.spendHashes(CONFIG.sellHashes.upgradeName);

    if (!sold) break;

    result.spent++;
    spends--;
  }

  return result;
}

function readDaemonState(ns) {
  try {
    if (!ns.fileExists(STATE_FILE, "home")) return {};
    const raw = ns.read(STATE_FILE);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getBestUpgrade(ns) {
  const upgrades = [];

  const nodeCount = ns.hacknet.numNodes();
  const maxNodes = ns.hacknet.maxNumNodes();

  if (nodeCount < maxNodes) {
    const cost = ns.hacknet.getPurchaseNodeCost();

    upgrades.push({
      type: "new-node",
      index: null,
      cost,
      gain: getNewNodeGain(ns),
      description: "Buy new Hacknet node",
    });
  }

  for (let i = 0; i < nodeCount; i++) {
    const stats = ns.hacknet.getNodeStats(i);

    addUpgrade(upgrades, {
      type: "level",
      index: i,
      cost: ns.hacknet.getLevelUpgradeCost(i, 1),
      gain: getLevelGain(stats),
      description: `Node ${i}: +1 level`,
    });

    addUpgrade(upgrades, {
      type: "ram",
      index: i,
      cost: ns.hacknet.getRamUpgradeCost(i, 1),
      gain: getRamGain(stats),
      description: `Node ${i}: x2 RAM`,
    });

    addUpgrade(upgrades, {
      type: "core",
      index: i,
      cost: ns.hacknet.getCoreUpgradeCost(i, 1),
      gain: getCoreGain(stats),
      description: `Node ${i}: +1 core`,
    });
  }

  return upgrades
    .filter(x => Number.isFinite(x.cost))
    .filter(x => x.cost > 0)
    .filter(x => x.gain > 0)
    .map(x => ({
      ...x,
      payoffSeconds: x.cost / x.gain,
      roi: x.gain / x.cost,
    }))
    .sort((a, b) => a.payoffSeconds - b.payoffSeconds)[0];
}

function addUpgrade(upgrades, upgrade) {
  if (!Number.isFinite(upgrade.cost)) return;
  if (upgrade.cost <= 0) return;
  if (upgrade.gain <= 0) return;

  upgrades.push(upgrade);
}

function buyUpgrade(ns, upgrade) {
  switch (upgrade.type) {
    case "new-node":
      return ns.hacknet.purchaseNode() !== -1;

    case "level":
      return ns.hacknet.upgradeLevel(upgrade.index, 1);

    case "ram":
      return ns.hacknet.upgradeRam(upgrade.index, 1);

    case "core":
      return ns.hacknet.upgradeCore(upgrade.index, 1);

    default:
      return false;
  }
}

function getNewNodeGain(ns) {
  return calculateProduction({
    level: 1,
    ram: 1,
    cores: 1,
  });
}

function getLevelGain(stats) {
  const before = calculateProduction(stats);

  const after = calculateProduction({
    ...stats,
    level: stats.level + 1,
  });

  return after - before;
}

function getRamGain(stats) {
  const before = calculateProduction(stats);

  const after = calculateProduction({
    ...stats,
    ram: stats.ram * 2,
  });

  return after - before;
}

function getCoreGain(stats) {
  const before = calculateProduction(stats);

  const after = calculateProduction({
    ...stats,
    cores: stats.cores + 1,
  });

  return after - before;
}

function calculateProduction(stats) {
  return stats.level * 1.5 * Math.pow(1.035, stats.ram - 1) * ((stats.cores + 5) / 6);
}

function getTotalProduction(ns) {
  let totalProduction = 0;

  for (let i = 0; i < ns.hacknet.numNodes(); i++) {
    totalProduction += ns.hacknet.getNodeStats(i).production;
  }

  return totalProduction;
}

function drawDashboard(ns, CONFIG, state) {
  const c = colors();
  ns.clearLog();

  const allowedColor = state.daemonAllowed ? c.green : c.red;
  const priorityColor =
    state.daemonPriority === "income" ? c.green :
      state.daemonPriority === "upgrades" ? c.yellow :
        state.daemonPriority === "leveling" ? c.cyan :
          state.daemonPriority === "faction" ? c.magenta :
            state.daemonPriority === "reset-prep" ? c.red :
              c.gray;

  printTitleBox(ns, "Daemon-Controlled Hacknet Manager", [
    `Daemon     : ${state.daemonAllowed ? "ALLOWED" : "PAUSED"} | Priority: ${state.daemonPriority}`,
    `Cycle      : ${state.cycles}`,
    `Last Action: ${state.lastAction}`,
  ], c);

  printAccordionSection(ns, "Daemon Policy", true, [
    `${badge(c, "HACKNET", state.daemonAllowed ? "YES" : "NO", allowedColor)} ` +
    `${badge(c, "PRIORITY", state.daemonPriority, priorityColor)}`,
    `${badge(c, "RESERVE", "$" + formatNum(state.reserveMoney), c.yellow)} ` +
    `${badge(c, "PAYOFF MAX", formatDuration(state.maxPayoffSeconds * 1000), c.cyan)}`,
  ], c.cyan);

  printAccordionSection(ns, "Status", true, [
    `${badge(c, "NODES", `${state.nodeCount}/${state.maxNodes}`, c.cyan)} ` +
    `${badge(c, "PROD", "$" + formatNum(state.totalProduction) + "/s", c.green)}`,
    `${badge(c, "MONEY", "$" + formatNum(state.money), c.green)} ` +
    `${badge(c, "SPENDABLE", "$" + formatNum(state.spendableMoney), state.spendableMoney > 0 ? c.green : c.red)}`,
  ], c.cyan);

  const best = state.best;

  if (!best) {
    printAccordionSection(ns, "Best Upgrade", true, [
      `${c.gray}No valid upgrades found.${c.reset}`,
    ], c.yellow);
  } else {
    const payoffColor =
      best.payoffSeconds <= state.maxPayoffSeconds ? c.green : c.red;

    const affordColor =
      state.spendableMoney >= best.cost ? c.green : c.red;

    printAccordionSection(ns, "Best Upgrade", true, [
      `${badge(c, "UPGRADE", best.description, c.white)}`,
      `${badge(c, "COST", "$" + formatNum(best.cost), affordColor)} ` +
      `${badge(c, "GAIN", "$" + formatNum(best.gain) + "/s", c.green)}`,
      `${badge(c, "PAYOFF", formatDuration(best.payoffSeconds * 1000), payoffColor)} ` +
      `${badge(c, "ROI", (best.roi * 100).toFixed(6) + "%", c.cyan)}`,
      getWaitReason(c, state, best),
    ], c.cyan);
  }

  const recentLines =
    state.recentActions.length === 0
      ? [`${c.gray}No purchases yet.${c.reset}`]
      : state.recentActions.slice(0, 8).map(x => `${c.gray}${shorten(x, 90)}${c.reset}`);

  printAccordionSection(ns, "Recent Purchases", true, recentLines, c.cyan);
}

function getWaitReason(c, state, best) {
  if (!state.daemonAllowed) {
    return `${c.red}Waiting: daemon paused Hacknet spending.${c.reset}`;
  }

  if (best.payoffSeconds > state.maxPayoffSeconds) {
    return `${c.yellow}Waiting: payoff is too slow for current priority.${c.reset}`;
  }

  if (state.spendableMoney < best.cost) {
    return `${c.yellow}Waiting: not enough spendable money after reserve.${c.reset}`;
  }

  return `${c.green}Ready: buying this upgrade.${c.reset}`;
}

function log(state, message) {
  state.lastAction = message;
  state.recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  state.recentActions = state.recentActions.slice(0, 20);
}

function printTitleBox(ns, title, lines, c) {
  const width = 86;
  const innerWidth = width - 4;

  ns.print(`${c.cyan}╔${"═".repeat(width - 2)}╗${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} ${c.white}${padRight(title, innerWidth)}${c.reset} ${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}╠${"═".repeat(width - 2)}╣${c.reset}`);

  for (const line of lines) {
    ns.print(`${c.cyan}║${c.reset} ${padRight(stripAnsi(shorten(line, innerWidth)), innerWidth)} ${c.cyan}║${c.reset}`);
  }

  ns.print(`${c.cyan}╚${"═".repeat(width - 2)}╝${c.reset}`);
}

function printAccordionSection(ns, title, isOpen, lines, color = "\u001b[36m") {
  const reset = "\u001b[0m";
  const icon = isOpen ? "[-]" : "[+]";

  ns.print("");
  ns.print(`${color}${icon} ${title}${reset}`);

  if (!isOpen) return;

  for (const line of lines) {
    ns.print(`    ${line}`);
  }
}

function badge(c, label, value, color) {
  return `${c.gray}[${c.reset}${color}${label}:${value}${c.reset}${c.gray}]${c.reset}`;
}

function colors() {
  return {
    reset: "\u001b[0m",
    cyan: "\u001b[36m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
    white: "\u001b[37m",
    gray: "\u001b[90m",
    magenta: "\u001b[35m",
  };
}

function formatNum(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "k";

  return n.toFixed(0);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "never";

  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function shorten(value, maxLength) {
  const text = String(value ?? "");

  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);

  return text.slice(0, maxLength - 3) + "...";
}

function stripAnsi(value) {
  return String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "");
}

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}