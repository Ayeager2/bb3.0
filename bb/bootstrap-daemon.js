//bb/bootstrap-daemon.js
import {
  BOOTSTRAP_FORMULA_CHEATSHEET,
  getBootstrapCheatTarget,
  getBootstrapCheatTargetNames,
} from "/lib/bootstrap/formula-cheatsheet.js";

const FULL_DAEMON = "daemon.js";
const TINY_WORKER = "/workers/tiny-worker.js";
const HACKNET_BUYER = "/economy/hacknet-buyer-service.js";
const HACKNET_HASH_SPENDER = "/economy/hacknet-hash-spender-service.js";
const TARGET_FILE = "/data/bootstrap-target.txt";
const PLAN_FILE = "/data/bootstrap-plan.txt";

const CONFIG = {
  refreshMs: 2000,

  // New philosophy:
  // bootstrap is only a tiny survival phase.
  // once home can run UHM reasonably, hand off.
  minHomeRamForFullDaemon: 64,
  minMoneyForFullDaemon: 1_000_000,

  homeReserveRam: 8,

  earlyTargets: getBootstrapCheatTargetNames().length > 0 ? getBootstrapCheatTargetNames() : [
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
    const executionServers = getBootstrapExecutionServers(ns, rootedServers);
    cleanupBlockedBootstrapHosts(ns, rootedServers);

    buyEarlyUpgrades(ns);
    startBn9HacknetServices(ns);

    const target = chooseBestTarget(ns, rootedServers);
    const plan = buildBootstrapPlan(ns, target);
    writeBootstrapTarget(ns, target);
    writeBootstrapPlan(ns, plan);

    await copyBootstrapFiles(ns, executionServers);

    runWorkers(ns, executionServers, plan);
    draw(ns, rootedServers, executionServers, target, plan);
    if (shouldStartFullDaemon(ns)) {
      startFullDaemon(ns, rootedServers);
      return;
    }
    await ns.sleep(CONFIG.refreshMs);
  }
}

function shouldStartFullDaemon(ns) {
  const daemonRam = ns.getScriptRam(FULL_DAEMON, "home");
  const freeHomeRam = getFreeRam(ns, "home", 0) + getRunningScriptRam(ns, "home", TINY_WORKER);

  return (
    ns.fileExists(FULL_DAEMON, "home") &&
    ns.getServerMaxRam("home") >= CONFIG.minHomeRamForFullDaemon &&
    daemonRam > 0 &&
    freeHomeRam >= daemonRam &&
    ns.getPlayer().money >= CONFIG.minMoneyForFullDaemon
  );
}

function startBn9HacknetServices(ns) {
  if (!isHacknetBitNode(ns)) return;

  const buyerStarted = startBootstrapService(ns, HACKNET_BUYER, [
    "--refresh", 3000,
    "--nodes", 20,
    "--level", 200,
    "--ram", 64,
    "--cores", 16,
    "--cache", 8,
    "--reserve", 0,
    "--max-payback", 21600,
    "--hash-buffer-minutes", 120,
    "--sell-value", 2_000_000,
    "--force", true,
    "--debug", true,
    "--toast", false,
    "--terminal", false,
  ], {
    priority: true,
  });

  if (!buyerStarted && !isScriptRunning(ns, HACKNET_BUYER)) {
    return;
  }

  startBootstrapService(ns, HACKNET_HASH_SPENDER, [
    "--refresh", 3000,
    "--upgrade", "auto",
    "--reserve", 0,
    "--min", 4,
    "--force", true,
    "--debug", true,
  ]);
}

function startBootstrapService(ns, script, args = [], options = {}) {
  if (!ns.fileExists(script, "home")) return false;
  if (isScriptRunning(ns, script)) return true;

  const neededRam = ns.getScriptRam(script, "home");
  if (!Number.isFinite(neededRam) || neededRam <= 0) return false;

  if (options.priority === true) {
    freeBootstrapServiceRam(ns, neededRam);
  }

  const freeRam = getFreeRam(ns, "home", CONFIG.homeReserveRam);
  if (freeRam < neededRam) return false;

  return ns.exec(script, "home", 1, ...args) !== 0;
}

function freeBootstrapServiceRam(ns, neededRam) {
  let freeRam = getFreeRam(ns, "home", CONFIG.homeReserveRam);
  if (freeRam >= neededRam) return;

  for (const proc of ns.ps("home")) {
    if (normalizeScript(proc.filename) !== normalizeScript(TINY_WORKER)) continue;

    try {
      ns.kill(proc.pid);
    } catch {
      // Best effort; the next bootstrap cycle can try again.
    }

    freeRam = getFreeRam(ns, "home", CONFIG.homeReserveRam);
    if (freeRam >= neededRam) return;
  }
}

function isScriptRunning(ns, script) {
  const normalized = normalizeScript(script);

  return ns.ps("home")
    .some(proc => normalizeScript(proc.filename) === normalized);
}

function isHacknetBitNode(ns) {
  try {
    return ns.getResetInfo()?.currentNode === 9;
  } catch {
    return false;
  }
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

function getBootstrapExecutionServers(ns, rootedServers) {
  return rootedServers.filter(server => shouldUseBootstrapExecutionHost(ns, server));
}

function shouldUseBootstrapExecutionHost(ns, server) {
  if (server === "home") return true;
  if (!isHacknetBitNode(ns)) return true;
  return !isHacknetServer(ns, server);
}

function cleanupBlockedBootstrapHosts(ns, rootedServers) {
  if (!isHacknetBitNode(ns)) return;

  for (const server of rootedServers) {
    if (!isHacknetServer(ns, server)) continue;

    try {
      for (const proc of ns.ps(server)) {
        if (normalizeScript(proc.filename) !== normalizeScript(TINY_WORKER)) continue;
        ns.kill(proc.pid);
      }
    } catch {
      // Hacknet hosts can appear/disappear while bootstrap is still scanning.
    }
  }
}

function isHacknetServer(ns, server) {
  if (String(server).startsWith("hacknet-server-")) return true;

  try {
    const count = ns.hacknet?.numNodes?.() ?? 0;
    for (let i = 0; i < count; i++) {
      if (ns.hacknet.getNodeStats(i)?.name === server) return true;
    }
  } catch {
    return false;
  }

  return false;
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
  } catch (error) {
    console.error(error);
  }
}

async function copyBootstrapFiles(ns, rootedServers) {
  for (const server of rootedServers) {
    if (server === "home") continue;
    if (!ns.fileExists(TINY_WORKER, "home")) return;

    try {
      if (!ns.fileExists(TINY_WORKER, server)) {
        await ns.scp(TINY_WORKER, server, "home");
      }

      if (ns.fileExists(TARGET_FILE, "home")) {
        await ns.scp(TARGET_FILE, server, "home");
      }

      if (ns.fileExists(PLAN_FILE, "home")) {
        await ns.scp(PLAN_FILE, server, "home");
      }
    } catch (error) {
      console.error(error);
    }
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
  const cheat = getBootstrapCheatTarget(server);
  if (cheat) {
    const hackLevel = ns.getHackingLevel();
    const levelPenalty = hackLevel < Number(cheat.minHack ?? 1) ? 0.1 : 1;
    const liveMoney = Math.max(1, ns.getServerMaxMoney(server));
    const liveTime = Math.max(1, ns.getWeakenTime(server));
    const liveScore = (liveMoney * Math.max(1, ns.getServerGrowth(server))) / liveTime;
    return ((Number(cheat.rank) || 1) * 1_000_000 + liveScore) * levelPenalty;
  }

  const money = Math.max(1, ns.getServerMaxMoney(server));
  const growth = Math.max(1, ns.getServerGrowth(server));
  const weakenTime = Math.max(1, ns.getWeakenTime(server));

  return (money * growth) / weakenTime;
}

function buildBootstrapPlan(ns, target) {
  const cheat = getBootstrapCheatTarget(target);
  const money = ns.getServerMoneyAvailable(target);
  const maxMoney = Math.max(1, ns.getServerMaxMoney(target));
  const sec = ns.getServerSecurityLevel(target);
  const minSec = ns.getServerMinSecurityLevel(target);
  const weakenAtSecurityGap = Number(cheat?.weakenAtSecurityGap ?? 5);
  const growAtMoneyRatio = Number(cheat?.growAtMoneyRatio ?? 0.75);
  const hackAtMoneyRatio = Number(cheat?.hackAtMoneyRatio ?? 0.95);
  const securityGap = sec - minSec;
  const moneyRatio = money / maxMoney;
  const chance = getHackChance(ns, target);
  const hackPercent = Math.max(0.0001, ns.hackAnalyze(target));
  const weakenPerThread = Math.max(0.0001, ns.weakenAnalyze(1));
  const desiredStealFraction = chooseStealFraction(chance, moneyRatio, securityGap, weakenAtSecurityGap);
  const hackThreads = Math.max(1, Math.min(128, Math.floor(desiredStealFraction / hackPercent)));
  const hackSecurity = hackThreads * 0.002;
  const growMultiplier = Math.max(1.02, 1 / Math.max(0.05, 1 - (hackThreads * hackPercent)));
  const repairGrowThreads = Math.max(1, Math.ceil(safeGrowthAnalyze(ns, target, growMultiplier)));
  const prepGrowThreads = moneyRatio < growAtMoneyRatio
    ? Math.max(1, Math.ceil(safeGrowthAnalyze(ns, target, Math.max(1.1, growAtMoneyRatio / Math.max(0.01, moneyRatio)))))
    : 0;
  const growThreads = Math.min(256, repairGrowThreads + prepGrowThreads);
  const growSecurity = growThreads * 0.004;
  const prepSecurity = Math.max(0, securityGap - weakenAtSecurityGap);
  const weakenThreads = Math.max(1, Math.min(256, Math.ceil((hackSecurity + growSecurity + prepSecurity) / weakenPerThread)));
  const cycle = [
    { role: "hack", threads: hackThreads },
    { role: "grow", threads: growThreads },
    { role: "weaken", threads: weakenThreads },
  ];

  return {
    updatedAt: Date.now(),
    source: "bootstrap-daemon",
    cheatSheetVersion: BOOTSTRAP_FORMULA_CHEATSHEET.version,
    target,
    moneyRatio,
    securityGap,
    chance,
    hackPercent,
    desiredStealFraction,
    weakenAtSecurityGap,
    growAtMoneyRatio,
    hackAtMoneyRatio,
    cycle,
    cycleThreads: cycle.reduce((sum, item) => sum + item.threads, 0),
    cheat: cheat ? {
      rank: cheat.rank,
      minHack: cheat.minHack,
      samples: cheat.samples ?? [],
    } : null,
  };
}

function chooseStealFraction(chance, moneyRatio, securityGap, weakenAtSecurityGap) {
  if (securityGap > weakenAtSecurityGap * 2) return 0.01;
  if (moneyRatio < 0.5) return 0.01;
  if (chance < 0.35) return 0.01;
  if (chance < 0.6) return 0.025;
  if (chance < 0.8) return 0.05;
  return 0.08;
}

function getHackChance(ns, target) {
  try {
    return Number(ns.hackAnalyzeChance(target)) || 0;
  } catch {
    return 0;
  }
}

function safeGrowthAnalyze(ns, target, multiplier) {
  try {
    const threads = ns.growthAnalyze(target, multiplier);
    return Number.isFinite(threads) ? threads : 1;
  } catch {
    return 1;
  }
}

function runWorkers(ns, rootedServers, plan) {
  if (!ns.fileExists(TINY_WORKER, "home")) return;
  const cycle = Array.isArray(plan?.cycle) && plan.cycle.length > 0
    ? plan.cycle.filter(item => item.threads > 0)
    : [{ role: "hack", threads: 1 }, { role: "grow", threads: 1 }, { role: "weaken", threads: 1 }];

  for (const server of rootedServers) {
    if (!ns.serverExists(server)) continue;
    if (!ns.hasRootAccess(server)) continue;

    const scriptHost = server === "home" ? "home" : server;

    if (!ns.fileExists(TINY_WORKER, scriptHost)) continue;

    const scriptRam = ns.getScriptRam(TINY_WORKER, scriptHost);
    if (scriptRam <= 0) continue;
    stopStaleTinyWorkers(ns, scriptHost, TINY_WORKER, cycle);

    let cycleIndex = getRunningScriptCount(ns, scriptHost, TINY_WORKER) % cycle.length;
    while (true) {
      const freeThreads = getThreads(ns, scriptHost, TINY_WORKER);
      if (freeThreads <= 0) break;

      const batch = cycle[cycleIndex % cycle.length];
      const threads = Math.min(freeThreads, Math.max(1, Number(batch.threads) || 1));

      const pid = ns.exec(TINY_WORKER, scriptHost, threads, batch.role, `${Date.now()}-${cycleIndex}`);
      if (pid === 0) break;
      cycleIndex++;
    }
  }
}

function stopStaleTinyWorkers(ns, host, script, cycle) {
  const roles = new Set(cycle.map(item => item.role));
  const maxThreadsByRole = new Map(cycle.map(item => [item.role, Math.max(1, Number(item.threads) || 1)]));

  for (const proc of ns.ps(host)) {
    if (proc.filename !== script) continue;

    const role = String(proc.args?.[0] ?? "legacy");
    const maxThreads = maxThreadsByRole.get(role) ?? 0;
    const stale = !roles.has(role) || Number(proc.threads) > maxThreads;
    if (!stale) continue;

    try {
      ns.kill(proc.filename, host, ...proc.args);
    } catch (error) {
      console.error(error);
    }
  }
}

function getRunningScriptCount(ns, host, script) {
  try {
    return ns.ps(host)
      .filter(proc => proc.filename === script)
      .length;
  } catch {
    return 0;
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
    if (!hasTorOrDarkweb(ns) && ns.getPlayer().money > 250_000) {
      purchaseTor(ns);
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
        purchaseProgram(ns, program);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function buyHomeRam(ns) {
  try {
    while (ns.getPlayer().money > 1_000_000 && upgradeHomeRam(ns)) {
      // Keep upgrading while affordable.
    }
  } catch (error) {
    console.error(error);
  }
}

function draw(ns, rootedServers, executionServers, target, plan) {
  ns.clearLog();

  ns.print("Bootstrap Daemon v2");
  ns.print("-------------------");
  ns.print(`Money       : $${ns.format.number(ns.getPlayer().money)}`);
  ns.print(`Hacking     : ${ns.getHackingLevel()}`);
  ns.print(`Home RAM    : ${ns.format.ram(ns.getServerMaxRam("home"))}`);
  ns.print(`Rooted      : ${rootedServers.length}`);
  ns.print(`Workers     : ${executionServers.length}`);
  if (isHacknetBitNode(ns)) {
    ns.print("Hacknet RAM : reserved for hash production");
  }
  ns.print(`Target      : ${target}`);
  ns.print(`Plan        : ${formatCycle(plan.cycle)} | ${formatPercent(plan.moneyRatio)} | sec +${ns.format.number(plan.securityGap)}`);
  ns.print(`Hack odds   : ${formatPercent(plan.chance)} | steal ${formatPercent(plan.desiredStealFraction)}`);
  ns.print(`Cheat sheet : ${BOOTSTRAP_FORMULA_CHEATSHEET.version}`);
  ns.print("");
  ns.print(`Full daemon : ${shouldStartFullDaemon(ns) ? "READY" : "WAITING"}`);
}

function formatPercent(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

function formatCycle(cycle) {
  return (cycle ?? [])
    .map(item => `${item.role[0].toUpperCase()}${item.threads}`)
    .join(" ");
}

function writeBootstrapTarget(ns, target) {
  if (!target) return;

  try {
    ns.write(TARGET_FILE, target, "w");
  } catch (error) {
    console.error(error);
  }
}

function startFullDaemon(ns, rootedServers) {
  stopTinyWorkers(ns, rootedServers);

  if (!ns.isRunning(FULL_DAEMON, "home")) {
    const daemonRam = ns.getScriptRam(FULL_DAEMON, "home");
    const freeHomeRam = getFreeRam(ns, "home", 0);
    if (freeHomeRam < daemonRam) {
      ns.tprint(`[BOOTSTRAP] Waiting for daemon RAM. Need ${ns.format.ram(daemonRam)}, free ${ns.format.ram(freeHomeRam)}.`);
      return;
    }

    ns.tprint("[BOOTSTRAP] Starting full daemon.");
    const pid = ns.exec(FULL_DAEMON, "home", 1);

    if (pid === 0) {
      ns.tprint("[BOOTSTRAP] Failed to start full daemon. Not enough RAM?");
    } else {
      ns.tprint(`[BOOTSTRAP] Full daemon started. PID=${pid}`);
    }
  }
}

function stopTinyWorkers(ns, rootedServers) {
  for (const server of rootedServers) {
    try {
      if (!ns.serverExists(server)) continue;
      ns.kill(TINY_WORKER, server);
    } catch (error) {
      console.error(error);
    }
  }
}

function getFreeRam(ns, host, reserve = 0) {
  return Math.max(0, ns.getServerMaxRam(host) - ns.getServerUsedRam(host) - reserve);
}

function getRunningScriptRam(ns, host, script) {
  const scriptRam = ns.getScriptRam(script, host);
  if (scriptRam <= 0) return 0;

  try {
    return ns.ps(host)
      .filter(proc => normalizeScript(proc.filename) === normalizeScript(script))
      .reduce((total, proc) => total + ((Number(proc.threads) || 0) * scriptRam), 0);
  } catch {
    return 0;
  }
}

function normalizeScript(path) {
  return String(path ?? "").replace(/^\/+/, "");
}

function hasTorOrDarkweb(ns) {
  try {
    if (ns.hasTorRouter()) return true;
  } catch {
    // Fall back below.
  }

  try {
    if (ns.scan("home").includes("darkweb")) return true;
  } catch {
    // Fall back to program ownership below.
  }

  return ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]
    .some(program => ns.fileExists(program, "home"));
}

function purchaseTor(ns) {
  try {
    if (ns.singularity?.purchaseTor()) return true;
  } catch {
    // Fall back to legacy API below.
  }

  try {
    return typeof ns.purchaseTor === "function" && ns.purchaseTor();
  } catch {
    return false;
  }
}

function purchaseProgram(ns, program) {
  try {
    if (ns.singularity?.purchaseProgram(program)) return true;
  } catch {
    // Fall back to legacy API below.
  }

  try {
    return typeof ns.purchaseProgram === "function" && ns.purchaseProgram(program);
  } catch {
    return false;
  }
}

function upgradeHomeRam(ns) {
  try {
    if (ns.singularity?.upgradeHomeRam()) return true;
  } catch {
    // Fall back to legacy API below.
  }

  try {
    return typeof ns.upgradeHomeRam === "function" && ns.upgradeHomeRam();
  } catch {
    return false;
  }
}

function writeBootstrapPlan(ns, plan) {
  try {
    ns.write(PLAN_FILE, JSON.stringify(plan, null, 2), "w");
  } catch (error) {
    console.error(error);
  }
}
