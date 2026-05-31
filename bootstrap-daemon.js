const FULL_DAEMON = "daemon.js";
const TINY_WORKER = "/workers/tiny-worker.js";

const CONFIG = {
  refreshMs: 2000,

  // New philosophy:
  // bootstrap is only a tiny survival phase.
  // once home can run UHM reasonably, hand off.
  minHomeRamForFullDaemon: 64,
  minMoneyForFullDaemon: 1_000_000,

  homeReserveRam: 8,

  earlyTargets: [
    "n00dles",
    "foodnstuff",
    "sigma-cosmetics",
    "joesguns",
    "hong-fang-tea",
    "harakiri-sushi",
  ],
};

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  while (true) {
    const allServers = scanAll(ns);
    const rootedServers = rootAvailableServers(ns, allServers);
    await copyWorker(ns, rootedServers);

    buyEarlyUpgrades(ns);

    const target = chooseBestTarget(ns, rootedServers);
    runWorkers(ns, rootedServers, target);

    draw(ns, rootedServers, target);

    function shouldStartFullDaemon(ns) {
      const homeRam = ns.getServerMaxRam("home");
      const money = ns.getPlayer().money;

      return (
        ns.fileExists(FULL_DAEMON, "home") &&
        homeRam >= CONFIG.minHomeRamForFullDaemon &&
        money >= CONFIG.minMoneyForFullDaemon
      );
    }

    await ns.sleep(CONFIG.refreshMs);
  }
}

function shouldStartFullDaemon(ns) {
  return (
    ns.fileExists(FULL_DAEMON, "home") &&
    ns.getServerMaxRam("home") >= CONFIG.minHomeRamForFullDaemon &&
    ns.getPlayer().money >= CONFIG.minMoneyForFullDaemon
  );
}

function scanAll(ns) {
  const seen = new Set(["home"]);
  const stack = ["home"];

  while (stack.length > 0) {
    const host = stack.pop();

    for (const next of ns.scan(host)) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }

  return [...seen];
}

function rootAvailableServers(ns, servers) {
  const rooted = [];

  for (const server of servers) {
    if (!ns.serverExists(server)) continue;

    if (ns.hasRootAccess(server)) {
      rooted.push(server);
      continue;
    }

    tryRoot(ns, server);

    if (ns.hasRootAccess(server)) {
      rooted.push(server);
    }
  }

  return rooted;
}

function tryRoot(ns, server) {
  let opened = 0;

  try {
    if (ns.fileExists("BruteSSH.exe", "home")) {
      ns.brutessh(server);
      opened++;
    }

    if (ns.fileExists("FTPCrack.exe", "home")) {
      ns.ftpcrack(server);
      opened++;
    }

    if (ns.fileExists("relaySMTP.exe", "home")) {
      ns.relaysmtp(server);
      opened++;
    }

    if (ns.fileExists("HTTPWorm.exe", "home")) {
      ns.httpworm(server);
      opened++;
    }

    if (ns.fileExists("SQLInject.exe", "home")) {
      ns.sqlinject(server);
      opened++;
    }

    if (opened >= ns.getServerNumPortsRequired(server)) {
      ns.nuke(server);
    }
  } catch { }
}

async function copyWorker(ns, rootedServers) {
  for (const server of rootedServers) {
    if (server === "home") continue;
    if (!ns.fileExists(TINY_WORKER, "home")) return;

    try {
      if (!ns.fileExists(TINY_WORKER, server)) {
        await ns.scp(TINY_WORKER, server, "home");
      }
    } catch { }
  }
}

function chooseBestTarget(ns, rootedServers) {
  const preferred = CONFIG.earlyTargets
    .filter(server => rootedServers.includes(server))
    .filter(server => canHack(ns, server))
    .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];

  if (preferred) return preferred;

  return rootedServers
    .filter(server => canHack(ns, server))
    .filter(server => ns.getServerMaxMoney(server) > 0)
    .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0] ?? "n00dles";
}

function canHack(ns, server) {
  try {
    return (
      ns.serverExists(server) &&
      ns.hasRootAccess(server) &&
      ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()
    );
  } catch {
    return false;
  }
}

function scoreTarget(ns, server) {
  const money = Math.max(1, ns.getServerMaxMoney(server));
  const growth = Math.max(1, ns.getServerGrowth(server));
  const weakenTime = Math.max(1, ns.getWeakenTime(server));

  return (money * growth) / weakenTime;
}

function runWorkers(ns, rootedServers, target) {
  if (!target) return;
  if (!ns.fileExists(TINY_WORKER, "home")) return;

  for (const server of rootedServers) {
    if (!ns.serverExists(server)) continue;
    if (!ns.hasRootAccess(server)) continue;

    const scriptHost = server === "home" ? "home" : server;

    if (!ns.fileExists(TINY_WORKER, scriptHost)) continue;
    if (ns.isRunning(TINY_WORKER, scriptHost, target)) continue;

    const threads = getThreads(ns, scriptHost, TINY_WORKER);
    if (threads <= 0) continue;

    ns.exec(TINY_WORKER, scriptHost, threads, target);
  }
}

function getThreads(ns, host, script) {
  const scriptRam = ns.getScriptRam(script, host);
  if (!Number.isFinite(scriptRam) || scriptRam <= 0) return 0;

  const maxRam = ns.getServerMaxRam(host);
  const usedRam = ns.getServerUsedRam(host);
  const reserve = host === "home" ? CONFIG.homeReserveRam : 0;
  const freeRam = Math.max(0, maxRam - usedRam - reserve);

  return Math.floor(freeRam / scriptRam);
}

function buyEarlyUpgrades(ns) {
  buyTorAndPrograms(ns);
  buyHomeRam(ns);
}

function buyTorAndPrograms(ns) {
  try {
    if (!ns.hasTorRouter() && ns.getPlayer().money > 250_000) {
      ns.purchaseTor();
    }

    const programs = [
      "BruteSSH.exe",
      "FTPCrack.exe",
      "relaySMTP.exe",
      "HTTPWorm.exe",
      "SQLInject.exe",
    ];

    for (const program of programs) {
      if (!ns.fileExists(program, "home")) {
        ns.purchaseProgram(program);
      }
    }
  } catch { }
}

function buyHomeRam(ns) {
  try {
    while (ns.getPlayer().money > 1_000_000 && ns.upgradeHomeRam()) { }
  } catch { }
}

function draw(ns, rootedServers, target) {
  ns.clearLog();

  ns.print("Bootstrap Daemon v2");
  ns.print("-------------------");
  ns.print(`Money       : $${ns.format.number(ns.getPlayer().money)}`);
  ns.print(`Hacking     : ${ns.getHackingLevel()}`);
  ns.print(`Home RAM    : ${ns.format.ram(ns.getServerMaxRam("home"))}`);
  ns.print(`Rooted      : ${rootedServers.length}`);
  ns.print(`Target      : ${target}`);
  ns.print("");
  ns.print(`Full daemon : ${shouldStartFullDaemon(ns) ? "READY" : "WAITING"}`);
}