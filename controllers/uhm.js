const STATE_FILE = "/data/daemon-state.txt";

const scriptsToCopy = ["/workers/h1.js", "/workers/w1.js", "/workers/g1.js"];

const hackScript = "/workers/h1.js";
const growScript = "/workers/g1.js";
const weakenScript = "/workers/w1.js";

const defaultHackPercent = 0.10;
const expHackPercent = 0.02;

const batchSpacingMs = 250;
const rescanIntervalMs = 10000;
const homeReserveRam = 64;
const maxBatchesPerCycle = 25;
const cycleDelayMs = 1000;

const runtimeStats = {
  batchesLaunched: 0,
  failedLaunches: 0,
  hackThreads: 0,
  growThreads: 0,
  weakenThreads: 0,
  prepRuns: 0,
  scanRuns: 0,
  copiedServers: 0,
};

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const flags = ns.flags([
    ["tails", false],
  ]);
  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(1400, 850);
  }

  let rootedServers = new Set(["home"]);
  let lastScan = 0;
  let lastDraw = 0;
  const copiedServers = new Set();

  while (true) {
    const daemonState = readDaemonState(ns);
    const now = Date.now();

    const rescanMs = daemonState?.protoBatching?.rescanIntervalMs ?? rescanIntervalMs;
    const delayMs = daemonState?.protoBatching?.cycleDelayMs ?? cycleDelayMs;

    if (now - lastScan > rescanMs || rootedServers.size <= 1) {
      rootedServers = getAllExecutionServers(ns);
      runtimeStats.scanRuns++;
      lastScan = now;
    }

    rootedServers = sanitizeServerSet(ns, rootedServers);

    await copyScriptsToServers(ns, rootedServers, copiedServers);

    const hosts = getHosts(ns, rootedServers);
    const lanes = buildTargetLanes(ns, rootedServers, hosts, daemonState);
    const laneSnapshots = snapshotLanes(lanes);

    ns.clearLog();

    if (lanes.length === 0) {
      ns.print("No valid multi-target lanes found.");
      await ns.sleep(delayMs);
      continue;
    }

    const results = [];

    for (const lane of lanes) {
      if (!lane.target || !lane.mode || lane.hosts.length === 0) continue;
      if (!isUsableTarget(ns, lane.target)) continue;

      const result = runLane(ns, lane);
      if (result) results.push(result);
    }

    if (now - lastDraw > 5000) {
      printMultiTargetStatus(ns, lanes, results, daemonState, laneSnapshots);
      lastDraw = now;
    }
    await ns.sleep(delayMs);
  }
}

function sanitizeServerSet(ns, servers) {
  const clean = new Set();

  for (const server of servers) {
    if (server === "home" || safeServerExists(ns, server)) {
      clean.add(server);
    }
  }

  return clean;
}

function safeServerExists(ns, server) {
  try {
    return !!server && ns.serverExists(server);
  } catch {
    return false;
  }
}

function isUsableTarget(ns, server) {
  try {
    return (
      safeServerExists(ns, server) &&
      ns.hasRootAccess(server) &&
      ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()
    );
  } catch {
    return false;
  }
}

function snapshotLanes(lanes) {
  return lanes.map(lane => ({
    name: lane.name,
    mode: lane.mode,
    target: lane.target,
    hosts: lane.hosts.map(host => ({ ...host })),
    ram: getLaneRamStats(lane.hosts),
  }));
}

function buildTargetLanes(ns, rootedServers, hosts, daemonState) {
  const mode = daemonState?.mode ?? "money";

  const cleanServers = sanitizeServerSet(ns, rootedServers);
  const moneyTarget = getValidTargetOrFallback(ns, cleanServers, daemonState?.target, "money");
  const secondaryMoneyTarget = getSecondaryMoneyTarget(ns, cleanServers, moneyTarget);
  const expTarget = getValidTargetOrFallback(ns, cleanServers, daemonState?.target, "exp");

  const groups = splitHostsByRamBudget(hosts, daemonState);

  if (mode === "exp") {
    return [
      { name: "HIGH / MONEY", mode: "", target: "", hosts: [] },
      { name: "MID / SECONDARY", mode: "", target: "", hosts: [] },
      { name: "LOW / EXP", mode: "exp", target: expTarget ?? "", hosts: cloneHostsForSingleLane(hosts) },
    ];
  }

  if (mode === "prep") {
    return [
      { name: "HIGH / MONEY", mode: "", target: "", hosts: [] },
      { name: "MID / SECONDARY", mode: "", target: "", hosts: [] },
      { name: "LOW / EXP", mode: "", target: "", hosts: [] },
      { name: "ALL / PREP", mode: "prep", target: moneyTarget ?? "", hosts: cloneHostsForSingleLane(hosts) },
    ];
  }

  return [
    { name: "HIGH / MONEY", mode: "money", target: moneyTarget ?? "", hosts: groups.high },
    { name: "MID / SECONDARY", mode: "money", target: secondaryMoneyTarget ?? "", hosts: groups.mid },
    { name: "LOW / EXP", mode: "exp", target: expTarget ?? "", hosts: groups.low },
  ];
}

function splitHostsByRamBudget(hosts, daemonState = {}) {
  const policy = daemonState?.multiTargetPolicy ?? {};

  const primaryPercent = clampPercent(policy.primaryMoneyRamPercent ?? 0.60);
  const secondaryPercent = clampPercent(policy.secondaryMoneyRamPercent ?? 0.30);
  const expPercent = clampPercent(policy.expRamPercent ?? 0.10);

  const normalized = normalizePercents(primaryPercent, secondaryPercent, expPercent);

  const groups = {
    high: [],
    mid: [],
    low: [],
  };

  const sorted = [...hosts]
    .filter(x => x?.host)
    .filter(x => x.freeRam > 1)
    .sort((a, b) => {
      if (a.host === "home") return -1;
      if (b.host === "home") return 1;
      return b.freeRam - a.freeRam;
    });

  const totalFreeRam = sorted.reduce((sum, x) => sum + x.freeRam, 0);
  if (totalFreeRam <= 0) return groups;

  const budgets = {
    high: totalFreeRam * normalized.primary,
    mid: totalFreeRam * normalized.secondary,
    low: totalFreeRam * normalized.exp,
  };

  for (const host of sorted) {
    let remaining = host.freeRam;

    remaining = allocateHostSlice(host, groups.high, budgets, "high", remaining);
    remaining = allocateHostSlice(host, groups.mid, budgets, "mid", remaining);
    remaining = allocateHostSlice(host, groups.low, budgets, "low", remaining);

    if (remaining > 1) {
      groups.high.push(makeVirtualHost(host, remaining));
    }
  }

  return groups;
}

function allocateHostSlice(host, group, budgets, key, remaining) {
  if (remaining <= 1) return remaining;
  if (budgets[key] <= 1) return remaining;

  const amount = Math.min(remaining, budgets[key]);

  if (amount > 1) {
    group.push(makeVirtualHost(host, amount));
    budgets[key] -= amount;
    remaining -= amount;
  }

  return remaining;
}

function makeVirtualHost(host, allocatedRam) {
  return {
    host: host.host,
    maxRam: allocatedRam,
    usedRam: 0,
    freeRam: allocatedRam,
    reserve: host.reserve ?? 0,
    virtual: true,
  };
}

function cloneHostsForSingleLane(hosts) {
  return hosts
    .filter(x => x?.host)
    .filter(x => x.freeRam > 1)
    .map(x => makeVirtualHost(x, x.freeRam));
}

function normalizePercents(primary, secondary, exp) {
  const total = primary + secondary + exp;

  if (total <= 0) {
    return {
      primary: 0.60,
      secondary: 0.30,
      exp: 0.10,
    };
  }

  return {
    primary: primary / total,
    secondary: secondary / total,
    exp: exp / total,
  };
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
function runLane(ns, lane) {
  if (!isUsableTarget(ns, lane.target)) return null;

  const plan = getBatchPlan(ns, lane.target, lane.mode);
  if (!plan) return null;

  if (!isPrepared(ns, lane.target)) {
    runtimeStats.prepRuns++;
    prepTarget(ns, lane.target, lane.hosts);

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      status: "PREPPING",
      launched: 0,
      plan,
    };
  }

  const launched = launchBatchesAggressive(ns, lane.target, lane.hosts, plan);

  if (launched > 0) {
    runtimeStats.batchesLaunched += launched;
    runtimeStats.hackThreads += plan.hackThreads * launched;
    runtimeStats.growThreads += plan.growThreads * launched;
    runtimeStats.weakenThreads += (plan.weakenHackThreads + plan.weakenGrowThreads) * launched;

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      status: "RUNNING",
      launched,
      plan,
    };
  }

  if (lane.mode === "exp") {
    const fallbackThreads = runExpFallback(ns, lane.target, lane.hosts);

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      status: fallbackThreads > 0 ? "EXP-FALLBACK" : "NO-RAM",
      launched: fallbackThreads,
      plan,
    };
  }

  return {
    lane: lane.name,
    target: lane.target,
    mode: lane.mode,
    status: "NO-RAM",
    launched: 0,
    plan,
  };
}

function runExpFallback(ns, target, hosts) {
  let launchedThreads = 0;

  for (const hostInfo of hosts) {
    if (!safeServerExists(ns, hostInfo.host)) continue;

    const scriptRam = ns.getScriptRam(weakenScript);
    const threads = Math.floor(hostInfo.freeRam / scriptRam);

    if (threads <= 0) continue;

    const pid = ns.exec(weakenScript, hostInfo.host, threads, target, 0);

    if (pid !== 0) {
      hostInfo.freeRam -= threads * scriptRam;
      launchedThreads += threads;
    }
  }

  return launchedThreads;
}

function getValidTargetOrFallback(ns, rootedServers, target, mode) {
  if (target && isUsableTarget(ns, target)) return target;

  if (mode === "exp") return getBestExpTarget(ns, rootedServers);

  return getBestTarget(ns, rootedServers);
}

function getSecondaryMoneyTarget(ns, servers, primaryTarget) {
  return [...servers]
    .filter(server => safeServerExists(ns, server))
    .filter(server => server !== primaryTarget)
    .filter(server => isUsableTarget(ns, server))
    .filter(server => {
      try {
        return ns.getServerMaxMoney(server) > 0 && ns.getServerGrowth(server) > 0;
      } catch {
        return false;
      }
    })
    .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];
}

function printMultiTargetStatus(ns, lanes, results, daemonState, laneSnapshots = []) {
  const c = colors();

  const allSnapshotHosts = laneSnapshots.flatMap(x => x.hosts ?? []);
  const totalRam = getLaneRamStats(allSnapshotHosts);

  ns.print(`${c.cyan}╔════════════════════════════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} ${c.white}HWGW Multi-Target Batch Manager${c.reset}                                                        ${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} Daemon Mode : ${c.yellow}${padRight(daemonState?.mode ?? "unknown", 78)}${c.reset}${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} Priority    : ${c.yellow}${padRight(daemonState?.spendingPolicy?.priority ?? "unknown", 78)}${c.reset}${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} Policy      : ${c.gray}${padRight(daemonState?.multiTargetPolicy?.reason ?? "No daemon policy reason.", 78)}${c.reset}${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} Total Hosts : ${c.green}${padRight(totalRam.hostCount, 78)}${c.reset}${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} Total RAM   : ${c.green}${padRight(`${ns.format.ram(totalRam.freeRam)} free / ${ns.format.ram(totalRam.maxRam)} max`, 78)}${c.reset}${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} RAM Usage   : ${c.yellow}${padRight(progressBar(totalRam.usedPercent, 30), 78)}${c.reset}${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);

  printAccordionSection(ns, "Lane Allocation", true, laneSnapshots.map(lane => {
    const laneRam = lane.ram ?? getLaneRamStats(lane.hosts ?? []);

    const targetText = lane.target ? lane.target : "-";
    const modeText = lane.mode ? lane.mode : "-";

    const laneColor =
      lane.name.includes("HIGH") ? c.green :
        lane.name.includes("MID") ? c.yellow :
          lane.name.includes("LOW") ? c.cyan :
            c.white;

    const targetColor = lane.target ? c.yellow : c.gray;

    const modeColor =
      lane.mode === "money" ? c.green :
        lane.mode === "exp" ? c.cyan :
          lane.mode === "prep" ? c.yellow :
            c.gray;

    const ramColor =
      laneRam.usedPercent < 0.75 ? c.green :
        laneRam.usedPercent < 0.92 ? c.yellow :
          c.red;

    return (
      `${laneColor}${padRight(lane.name, 18)}${c.reset} ` +
      `Mode: ${modeColor}${padRight(modeText, 7)}${c.reset} ` +
      `Target: ${targetColor}${padRight(targetText, 20)}${c.reset} ` +
      `Hosts: ${padLeft(laneRam.hostCount, 3)} ` +
      `Free: ${c.green}${padLeft(ns.format.ram(laneRam.freeRam), 10)}${c.reset} ` +
      `Max: ${c.yellow}${padLeft(ns.format.ram(laneRam.maxRam), 10)}${c.reset} ` +
      `${ramColor}${progressBar(laneRam.usedPercent, 18)}${c.reset}`
    );
  }), c.cyan);

  const resultLines = [];

  for (const result of results) {
    if (!isUsableTarget(ns, result.target)) continue;

    const lane = laneSnapshots.find(x => x.name === result.lane);
    const laneRam = lane?.ram ?? getLaneRamStats(lane?.hosts ?? []);

    const target = result.target;
    const money = safeGetServerMoneyAvailable(ns, target);
    const maxMoney = safeGetServerMaxMoney(ns, target);
    const moneyPercent = maxMoney > 0 ? money / maxMoney : 0;

    const sec = safeGetServerSecurityLevel(ns, target);
    const minSec = safeGetServerMinSecurityLevel(ns, target);
    const secDiff = sec - minSec;

    const statusColor = result.status === "RUNNING" ? c.green : c.yellow;

    resultLines.push(
      `${c.green}${padRight(result.lane, 16)}${c.reset} ` +
      `${c.yellow}${padRight(result.target, 18)}${c.reset} ` +
      `${padRight(result.mode, 6)} ` +
      `${statusColor}${padRight(result.status, 9)}${c.reset} ` +
      `B:${padLeft(result.launched, 3)} ` +
      `H:${padLeft(laneRam.hostCount, 2)} ` +
      `RAM:${padLeft(ns.format.ram(laneRam.freeRam), 9)}/${padLeft(ns.format.ram(laneRam.maxRam), 9)}`
    );

    resultLines.push(
      `    Money ${progressBar(moneyPercent, 18)} ` +
      `Sec ${sec.toFixed(2)}/${minSec.toFixed(2)}(+${secDiff.toFixed(2)}) ` +
      `Batch ${ns.format.ram(result.plan.totalRam)}`
    );

    resultLines.push(
      `    Threads H:${result.plan.hackThreads} ` +
      `W1:${result.plan.weakenHackThreads} ` +
      `G:${result.plan.growThreads} ` +
      `W2:${result.plan.weakenGrowThreads} ` +
      `Hack:${(result.plan.hackPercent * 100).toFixed(1)}%`
    );

    resultLines.push("");
  }

  printAccordionSection(ns, "Active Lanes", true, resultLines, c.cyan);

  printAccordionSection(ns, "Runtime Stats", true, [
    `Batches launched total : ${runtimeStats.batchesLaunched}`,
    `Failed launch attempts : ${runtimeStats.failedLaunches}`,
    `Prep runs              : ${runtimeStats.prepRuns}`,
    `Scan runs              : ${runtimeStats.scanRuns}`,
    `Copied servers         : ${runtimeStats.copiedServers}`,
    `Hack threads total     : ${runtimeStats.hackThreads}`,
    `Grow threads total     : ${runtimeStats.growThreads}`,
    `Weaken threads total   : ${runtimeStats.weakenThreads}`,
  ], c.cyan);

  ns.print(`${c.cyan}╚════════════════════════════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
}

function getLaneRamStats(hosts) {
  const maxRam = hosts.reduce((sum, x) => sum + x.maxRam, 0);
  const usedRam = hosts.reduce((sum, x) => sum + x.usedRam, 0);
  const freeRam = hosts.reduce((sum, x) => sum + x.freeRam, 0);
  const usedPercent = maxRam > 0 ? usedRam / maxRam : 0;

  return {
    hostCount: hosts.length,
    maxRam,
    usedRam,
    freeRam,
    usedPercent,
  };
}

function launchBatchesAggressive(ns, target, hosts, plan) {
  let launched = 0;

  while (launched < maxBatchesPerCycle) {
    const batchOffset = launched * batchSpacingMs * 4;
    const reservations = reserveFullBatch(ns, hosts, target, plan, batchOffset);

    if (!reservations) break;

    const ok = executeReservations(ns, reservations);
    if (!ok) {
      runtimeStats.failedLaunches++;
      break;
    }

    launched++;
  }

  return launched;
}

function reserveFullBatch(ns, hosts, target, plan, batchOffset) {
  const liveHosts = hosts.filter(x => safeServerExists(ns, x.host));
  const tempHosts = liveHosts.map(x => ({ ...x }));
  const reservations = [];

  const hack = reserveDistributed(ns, tempHosts, hackScript, plan.hackThreads, target, plan.hackDelay + batchOffset);
  if (!hack) return null;
  reservations.push(...hack);

  const weaken1 = reserveDistributed(ns, tempHosts, weakenScript, plan.weakenHackThreads, target, plan.weakenHackDelay + batchOffset);
  if (!weaken1) return null;
  reservations.push(...weaken1);

  const grow = reserveDistributed(ns, tempHosts, growScript, plan.growThreads, target, plan.growDelay + batchOffset);
  if (!grow) return null;
  reservations.push(...grow);

  const weaken2 = reserveDistributed(ns, tempHosts, weakenScript, plan.weakenGrowThreads, target, plan.weakenGrowDelay + batchOffset);
  if (!weaken2) return null;
  reservations.push(...weaken2);

  for (const host of hosts) {
    const updated = tempHosts.find(x => x.host === host.host);
    if (updated) host.freeRam = updated.freeRam;
  }

  return reservations;
}

function reserveDistributed(ns, hosts, script, threadsNeeded, target, delay) {
  let remaining = threadsNeeded;
  const scriptRam = ns.getScriptRam(script);
  const reservations = [];

  for (const hostInfo of hosts) {
    if (remaining <= 0) break;
    if (!safeServerExists(ns, hostInfo.host)) continue;

    const threads = Math.min(remaining, Math.floor(hostInfo.freeRam / scriptRam));
    if (threads <= 0) continue;

    reservations.push({
      script,
      server: hostInfo.host,
      threads,
      target,
      delay,
    });

    hostInfo.freeRam -= threads * scriptRam;
    remaining -= threads;
  }

  return remaining <= 0 ? reservations : null;
}

function executeReservations(ns, reservations) {
  for (const job of reservations) {
    if (!safeServerExists(ns, job.server)) return false;

    const pid = ns.exec(job.script, job.server, job.threads, job.target, job.delay);
    if (pid === 0) return false;
  }

  return true;
}

function getBatchPlan(ns, target, mode) {
  if (!isUsableTarget(ns, target)) return null;

  const hackPercent = mode === "exp" ? expHackPercent : defaultHackPercent;

  const maxMoney = safeGetServerMaxMoney(ns, target);
  const hackMoney = maxMoney * hackPercent;

  const hackThreadsRaw = ns.hackAnalyzeThreads(target, hackMoney);
  const hackThreads = Math.max(1, Math.floor(Number.isFinite(hackThreadsRaw) ? hackThreadsRaw : 1));

  const hackSecurity = ns.hackAnalyzeSecurity(hackThreads, target);
  const weakenHackThreads = Math.max(1, Math.ceil(hackSecurity / ns.weakenAnalyze(1)));

  const growThreadsRaw = ns.growthAnalyze(target, 1 / (1 - hackPercent));
  const growThreads = Math.max(1, Math.ceil(Number.isFinite(growThreadsRaw) ? growThreadsRaw : 1));

  const growSecurity = ns.growthAnalyzeSecurity(growThreads, target);
  const weakenGrowThreads = Math.max(1, Math.ceil(growSecurity / ns.weakenAnalyze(1)));

  const hackTime = ns.getHackTime(target);
  const growTime = ns.getGrowTime(target);
  const weakenTime = ns.getWeakenTime(target);

  const finishHack = weakenTime - batchSpacingMs * 3;
  const finishWeaken1 = weakenTime - batchSpacingMs * 2;
  const finishGrow = weakenTime - batchSpacingMs;
  const finishWeaken2 = weakenTime;

  return {
    mode,
    hackPercent,

    hackThreads,
    weakenHackThreads,
    growThreads,
    weakenGrowThreads,

    hackDelay: Math.max(0, finishHack - hackTime),
    weakenHackDelay: Math.max(0, finishWeaken1 - weakenTime),
    growDelay: Math.max(0, finishGrow - growTime),
    weakenGrowDelay: Math.max(0, finishWeaken2 - weakenTime),

    hackTime,
    growTime,
    weakenTime,

    totalRam:
      hackThreads * ns.getScriptRam(hackScript) +
      weakenHackThreads * ns.getScriptRam(weakenScript) +
      growThreads * ns.getScriptRam(growScript) +
      weakenGrowThreads * ns.getScriptRam(weakenScript),
  };
}

function prepTarget(ns, target, hosts) {
  if (!isUsableTarget(ns, target)) return;

  const money = safeGetServerMoneyAvailable(ns, target);
  const maxMoney = safeGetServerMaxMoney(ns, target);
  const sec = safeGetServerSecurityLevel(ns, target);
  const minSec = safeGetServerMinSecurityLevel(ns, target);

  if (sec > minSec + 1) {
    const threads = Math.ceil((sec - minSec) / ns.weakenAnalyze(1));
    runDistributed(ns, weakenScript, threads, hosts, target, 0);
    return;
  }

  if (money < maxMoney * 0.99) {
    const growThreadsRaw = ns.growthAnalyze(target, maxMoney / Math.max(1, money));
    const growThreads = Math.max(1, Math.ceil(Number.isFinite(growThreadsRaw) ? growThreadsRaw : 1));
    const weakenThreads = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads, target) / ns.weakenAnalyze(1)));

    runDistributed(ns, growScript, growThreads, hosts, target, 0);
    runDistributed(ns, weakenScript, weakenThreads, hosts, target, 100);
  }
}

function runDistributed(ns, script, threadsNeeded, hosts, target, delay) {
  let remaining = threadsNeeded;
  const scriptRam = ns.getScriptRam(script);

  for (const hostInfo of hosts) {
    if (remaining <= 0) return true;
    if (!safeServerExists(ns, hostInfo.host)) continue;

    const threads = Math.min(remaining, Math.floor(hostInfo.freeRam / scriptRam));
    if (threads <= 0) continue;

    const pid = ns.exec(script, hostInfo.host, threads, target, delay);

    if (pid !== 0) {
      hostInfo.freeRam -= threads * scriptRam;
      remaining -= threads;
    }
  }

  return remaining <= 0;
}

function getHosts(ns, servers) {
  return [...servers]
    .filter(server => safeServerExists(ns, server))
    .filter(server => safeGetServerMaxRam(ns, server) > 0)
    .map(server => {
      const maxRam = safeGetServerMaxRam(ns, server);
      const usedRam = safeGetServerUsedRam(ns, server);
      const reserve = server === "home" ? homeReserveRam : 0;
      const freeRam = Math.max(0, maxRam - usedRam - reserve);

      return {
        host: server,
        maxRam,
        usedRam,
        freeRam,
        reserve,
      };
    })
    .filter(x => x.freeRam > 1)
    .sort((a, b) => {
      if (a.host === "home") return -1;
      if (b.host === "home") return 1;
      return b.freeRam - a.freeRam;
    });
}

function isPrepared(ns, target) {
  if (!isUsableTarget(ns, target)) return false;

  return (
    safeGetServerSecurityLevel(ns, target) <= safeGetServerMinSecurityLevel(ns, target) + 1 &&
    safeGetServerMoneyAvailable(ns, target) >= safeGetServerMaxMoney(ns, target) * 0.99
  );
}

function getBestTarget(ns, servers) {
  return [...servers]
    .filter(server => safeServerExists(ns, server))
    .filter(server => isUsableTarget(ns, server))
    .filter(server => safeGetServerMaxMoney(ns, server) > 0 && safeGetServerGrowth(ns, server) > 0)
    .sort((a, b) => scoreTarget(ns, b) - scoreTarget(ns, a))[0];
}

function scoreTarget(ns, server) {
  if (!isUsableTarget(ns, server)) return 0;

  const money = safeGetServerMaxMoney(ns, server);
  const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
  const chance = safeHackAnalyzeChance(ns, server);
  const growth = safeGetServerGrowth(ns, server);
  const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));

  return (money * chance * growth) / (weakenTime * minSec);
}

function getBestExpTarget(ns, servers) {
  const cleanServers = sanitizeServerSet(ns, servers);

  const candidates = [...cleanServers]
    .filter(server => isUsableTarget(ns, server))
    .filter(server => safeGetServerMaxMoney(ns, server) > 0)
    .filter(server => safeGetWeakenTime(ns, server) <= 10 * 60 * 1000);

  const pool = candidates.length > 0
    ? candidates
    : [...cleanServers].filter(server => isUsableTarget(ns, server));

  return pool.sort((a, b) => scoreExpTarget(ns, b) - scoreExpTarget(ns, a))[0] ?? "joesguns";
}

function scoreExpTarget(ns, server) {
  if (!isUsableTarget(ns, server)) return 0;

  const weakenTime = Math.max(1, safeGetWeakenTime(ns, server));
  const minSec = Math.max(1, safeGetServerMinSecurityLevel(ns, server));
  const sec = Math.max(minSec, safeGetServerSecurityLevel(ns, server));
  const growth = Math.max(1, safeGetServerGrowth(ns, server));
  const money = Math.max(1, safeGetServerMaxMoney(ns, server));
  const chance = Math.max(0.01, safeHackAnalyzeChance(ns, server));

  const secPenalty = 1 + Math.max(0, sec - minSec) * 0.15;
  const timeSeconds = weakenTime / 1000;

  return (Math.log10(money + 1) * Math.sqrt(growth) * chance) / (timeSeconds * secPenalty);
}

function getBestPrepTarget(ns, servers) {
  return [...servers]
    .filter(server => safeServerExists(ns, server))
    .filter(server => isUsableTarget(ns, server))
    .filter(server => safeGetServerMaxMoney(ns, server) > 0)
    .sort((a, b) => prepNeed(ns, b) - prepNeed(ns, a))[0] ?? getBestTarget(ns, servers);
}

function prepNeed(ns, server) {
  if (!isUsableTarget(ns, server)) return 0;

  const maxMoney = safeGetServerMaxMoney(ns, server);
  const money = safeGetServerMoneyAvailable(ns, server);
  const minSec = safeGetServerMinSecurityLevel(ns, server);
  const sec = safeGetServerSecurityLevel(ns, server);

  const moneyNeed = maxMoney > 0 ? 1 - money / maxMoney : 0;
  const secNeed = Math.max(0, sec - minSec);

  return moneyNeed + secNeed;
}

function getAllExecutionServers(ns) {
  const rootedServers = scanAndHack(ns);

  try {
    for (const server of ns.getPurchasedServers()) {
      if (safeServerExists(ns, server)) rootedServers.add(server);
    }
  } catch { }

  try {
    for (const server of ns.cloud.getServerNames()) {
      if (safeServerExists(ns, server)) rootedServers.add(server);
    }
  } catch { }

  return sanitizeServerSet(ns, rootedServers);
}

async function copyScriptsToServers(ns, servers, copiedServers) {
  for (const server of servers) {
    if (server === "home") continue;
    if (!safeServerExists(ns, server)) {
      copiedServers.delete(server);
      continue;
    }

    let missingScripts = false;

    try {
      missingScripts = scriptsToCopy.some(script => !ns.fileExists(script, server));
    } catch {
      copiedServers.delete(server);
      continue;
    }

    if (!missingScripts) continue;

    try {
      const copied = await ns.scp(scriptsToCopy, server, "home");

      if (copied) {
        copiedServers.add(server);
        runtimeStats.copiedServers++;
      }
    } catch {
      copiedServers.delete(server);
    }
  }
}

function scanAndHack(ns) {
  const servers = new Set(["home"]);
  scanAll(ns, "home", servers);

  const rooted = new Set();

  for (const server of servers) {
    if (!safeServerExists(ns, server)) continue;

    try {
      if (ns.hasRootAccess(server)) {
        rooted.add(server);
        continue;
      }

      let ports = 0;

      if (ns.fileExists("BruteSSH.exe", "home")) {
        ns.brutessh(server);
        ports++;
      }

      if (ns.fileExists("FTPCrack.exe", "home")) {
        ns.ftpcrack(server);
        ports++;
      }

      if (ns.fileExists("relaySMTP.exe", "home")) {
        ns.relaysmtp(server);
        ports++;
      }

      if (ns.fileExists("HTTPWorm.exe", "home")) {
        ns.httpworm(server);
        ports++;
      }

      if (ns.fileExists("SQLInject.exe", "home")) {
        ns.sqlinject(server);
        ports++;
      }

      if (ports >= ns.getServerNumPortsRequired(server)) {
        ns.nuke(server);
        rooted.add(server);
      }
    } catch {
      // Server may have disappeared during scan.
    }
  }

  return sanitizeServerSet(ns, rooted);
}

function scanAll(ns, host, servers) {
  if (!safeServerExists(ns, host)) return;

  let neighbors = [];

  try {
    neighbors = ns.scan(host);
  } catch {
    return;
  }

  for (const next of neighbors) {
    if (!servers.has(next)) {
      servers.add(next);
      scanAll(ns, next, servers);
    }
  }
}

function safeGetServerMaxRam(ns, server) {
  try { return ns.getServerMaxRam(server); } catch { return 0; }
}

function safeGetServerUsedRam(ns, server) {
  try { return ns.getServerUsedRam(server); } catch { return 0; }
}

function safeGetServerMaxMoney(ns, server) {
  try { return ns.getServerMaxMoney(server); } catch { return 0; }
}

function safeGetServerMoneyAvailable(ns, server) {
  try { return ns.getServerMoneyAvailable(server); } catch { return 0; }
}

function safeGetServerSecurityLevel(ns, server) {
  try { return ns.getServerSecurityLevel(server); } catch { return 999; }
}

function safeGetServerMinSecurityLevel(ns, server) {
  try { return ns.getServerMinSecurityLevel(server); } catch { return 1; }
}

function safeGetServerGrowth(ns, server) {
  try { return ns.getServerGrowth(server); } catch { return 0; }
}

function safeGetWeakenTime(ns, server) {
  try { return ns.getWeakenTime(server); } catch { return Number.MAX_SAFE_INTEGER; }
}

function safeHackAnalyzeChance(ns, server) {
  try { return ns.hackAnalyzeChance(server); } catch { return 0; }
}

function printAccordionSection(ns, title, isOpen, lines, color = "\u001b[36m") {
  const reset = "\u001b[0m";
  const icon = isOpen ? "[-]" : "[+]";

  ns.print(`${color}${icon} ${title}${reset}`);

  if (!isOpen) return;

  for (const line of lines) {
    ns.print(`    ${line}`);
  }
}

function progressBar(percent, width) {
  const safePercent = Math.max(0, Math.min(1, percent));
  const filled = Math.round(safePercent * width);
  const empty = width - filled;

  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${(safePercent * 100).toFixed(1)}%`;
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

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}

function padLeft(value, length) {
  return String(value).padStart(length, " ");
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