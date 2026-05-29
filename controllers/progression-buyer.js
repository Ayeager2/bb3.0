const STATE_FILE = "/data/daemon-state.txt";

const PROGRAMS = [
  { name: "BruteSSH.exe", cost: 500_000 },
  { name: "FTPCrack.exe", cost: 1_500_000 },
  { name: "relaySMTP.exe", cost: 5_000_000 },
  { name: "HTTPWorm.exe", cost: 30_000_000 },
  { name: "SQLInject.exe", cost: 250_000_000 },
];

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.resizeTail(900, 650);

  const CONFIG = {
    refreshMs: 1000,
    actionRefreshMs: 100,
    fallbackReserveMoney: 1_000_000_000,
    minTorBuffer: 250_000,
    recentLimit: 10,
  };

  const state = {
    started: Date.now(),
    cycles: 0,
    daemonPriority: "unknown",
    allowExePurchases: true,
    allowHomeRam: true,
    reserveMoney: CONFIG.fallbackReserveMoney,
    lastAction: "Starting progression buyer...",
    recentActions: [],
  };

  while (true) {
    const daemonState = readDaemonState(ns);
    const policy = daemonState?.spendingPolicy ?? {};

    state.cycles++;
    state.daemonPriority = policy.priority ?? "unknown";
    state.allowExePurchases = policy.allowExePurchases !== false;
    state.allowHomeRam = policy.allowHomeRam !== false;
    state.reserveMoney = Number.isFinite(policy.reserveMoney)
      ? policy.reserveMoney
      : CONFIG.fallbackReserveMoney;

    drawDashboard(ns, CONFIG, state);

    let acted = false;

    if (state.allowExePurchases) {
      acted = buyTorAndPrograms(ns, CONFIG, state) || acted;
    }

    if (!acted && state.allowHomeRam) {
      acted = buyHomeRam(ns, state) || acted;
    }

    await ns.sleep(acted ? CONFIG.actionRefreshMs : CONFIG.refreshMs);
  }
}

function buyTorAndPrograms(ns, CONFIG, state) {
  const money = ns.getPlayer().money;
  const spendable = getSpendableMoney(ns, state.reserveMoney);

  if (!hasTorOrDarkweb(ns) && money > 200_000 + CONFIG.minTorBuffer) {
    try {
      if (ns.purchaseTor()) {
        log(state, "Purchased TOR router");
        return true;
      }
    } catch { }
  }

  if (!hasTorOrDarkweb(ns)) return false;

  for (const program of PROGRAMS) {
    if (ns.fileExists(program.name, "home")) continue;
    if (spendable < program.cost) continue;

    try {
      if (ns.purchaseProgram(program.name)) {
        log(state, `Purchased ${program.name}`);
        return true;
      }
    } catch { }
  }

  return false;
}

function buyHomeRam(ns, state) {
  const cost = ns.singularity
    ? safeHomeRamCost(ns)
    : Infinity;

  if (!Number.isFinite(cost)) return false;
  if (getSpendableMoney(ns, state.reserveMoney) < cost) return false;

  try {
    if (ns.singularity.upgradeHomeRam()) {
      log(state, `Upgraded home RAM to ${ns.format.ram(ns.getServerMaxRam("home"))}`);
      return true;
    }
  } catch { }

  return false;
}

function safeHomeRamCost(ns) {
  try {
    return ns.singularity.getUpgradeHomeRamCost();
  } catch {
    return Infinity;
  }
}

function getSpendableMoney(ns, reserveMoney) {
  return Math.max(0, ns.getPlayer().money - reserveMoney);
}

function hasTorOrDarkweb(ns) {
  return PROGRAMS.some(p => ns.fileExists(p.name, "home"));
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

function drawDashboard(ns, CONFIG, state) {
  const c = colors();
  ns.clearLog();

  printTitleBox(ns, "Daemon-Controlled Progression Buyer", [
    `Priority   : ${state.daemonPriority}`,
    `EXEs       : ${state.allowExePurchases ? "ALLOWED" : "PAUSED"}`,
    `Home RAM   : ${state.allowHomeRam ? "ALLOWED" : "PAUSED"}`,
    `Last Action: ${state.lastAction}`,
  ], c);

  printAccordionSection(ns, "Status", true, [
    `${badge(c, "MONEY", "$" + formatNum(ns.getPlayer().money), c.green)} ` +
    `${badge(c, "RESERVE", "$" + formatNum(state.reserveMoney), c.yellow)} ` +
    `${badge(c, "SPENDABLE", "$" + formatNum(getSpendableMoney(ns, state.reserveMoney)), c.cyan)}`,
    `${badge(c, "HOME RAM", ns.format.ram(ns.getServerMaxRam("home")), c.green)} ` +
    `${badge(c, "TOR", hasTorOrDarkweb(ns) ? "YES" : "NO", hasTorOrDarkweb(ns) ? c.green : c.red)}`,
  ], c.cyan);

  printAccordionSection(ns, "Programs", true, PROGRAMS.map(p => {
    const owned = ns.fileExists(p.name, "home");
    return checklistLine(c, p.name, owned, owned ? "owned" : "$" + formatNum(p.cost));
  }), c.cyan);

  const recent =
    state.recentActions.length === 0
      ? [`${c.gray}No purchases yet.${c.reset}`]
      : state.recentActions.slice(0, CONFIG.recentLimit);

  printAccordionSection(ns, "Recent Purchases", true, recent, c.cyan);
}

function log(state, message) {
  state.lastAction = message;
  state.recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function checklistLine(c, label, done, detail) {
  return `${done ? c.green : c.red}[${done ? "✓" : " "}]${c.reset} ${padRight(label, 18)} ${c.gray}${detail}${c.reset}`;
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
  ns.print("");
  ns.print(`${color}${isOpen ? "[-]" : "[+]"} ${title}${reset}`);
  if (!isOpen) return;
  for (const line of lines) ns.print(`    ${line}`);
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

function shorten(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function stripAnsi(value) {
  return String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "");
}

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}