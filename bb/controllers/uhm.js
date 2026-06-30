//controllers/uhm.js
import {
  rescanIntervalMs,
  homeReserveRam,
  cycleDelayMs,
} from "/lib/uhm/config.js";

import {
  isUsableTarget,
} from "/lib/uhm/safe.js";

import {
  printMultiTargetStatus,
  getLaneRamStats,
} from "/lib/uhm/dashboard.js";

import {
  sanitizeServerSet,
  getAllExecutionServers,
  filterExecutionServers,
  cleanupBlockedExecutionHosts,
  copyScriptsToServers,
  readDaemonState,
} from "/lib/uhm/network.js";

import {
  getHosts,
  snapshotLanes,
} from "/lib/uhm/hosts.js";

import {
  buildTargetLanes,
} from "/lib/uhm/lanes.js";

import {
  runtimeStats,
} from "/lib/uhm/runtime.js";

import {
  runLane,
} from "/lib/uhm/runner.js";

import { runShareMode } from "/lib/uhm/modes/share.js";

import { getProgressionPhase } from "/lib/uhm/progression.js";

const UHM_STATE_FILE = "/data/uhm-state.txt";
const UHM_HUD_FILE = "/data/uhm-hud.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  // RAM anchors for imported modules.
  ns.hackAnalyzeSecurity(1, "n00dles");
  ns.growthAnalyzeSecurity(1, "n00dles");
  ns.hackAnalyzeThreads("n00dles", 1);
  ns.growthAnalyze("n00dles", 2);
  ns.getHackTime("n00dles");
  ns.getGrowTime("n00dles");
  ns.getSharePower();

  const flags = ns.flags([
    ["tails", false],
    ["overdrive", false],
    ["cycle-delay", 100],
    ["max-batches", 750],
    ["exp-cycle-delay", 25],
    // EXP policy allocates more RAM to the normal money HGW batch engine.
    // ["exp-max-batches", 100000],
    ["exp-ram", 1],
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
    let phase = getUhmPhase(ns, daemonState);

    const forcedExpMode = shouldForceExpMode(
      ns,
      daemonState,
      flags
    );
    const forcedExpTarget = getForcedExpTargetLevel(daemonState);
    const forcedExpReason = `Forced EXP mode until hacking ${ns.format.number(forcedExpTarget)}`;

    const daemonWantsExp =
      daemonState?.mode === "exp";

    const effectiveDaemonState =
      forcedExpMode || daemonWantsExp
        ? {
          ...daemonState,
          mode: "exp",
          phase: forcedExpMode
            ? "forced-exp"
            : daemonState?.phase ?? "exp-overdrive",

          multiTargetPolicy: {
            ...(daemonState?.multiTargetPolicy ?? {}),
            primaryMoneyRamPercent: 0,
            secondaryMoneyRamPercent: 0,
            expRamPercent: Number(flags["exp-ram"]) || 1,
            shareRamPercent: 0,
            reason: forcedExpMode
              ? forcedExpReason
              : "Leveling policy: all RAM assigned to normal money HGW batches.",
          },

          protoBatching: {
            ...(daemonState?.protoBatching ?? {}),
            // EXP policy still uses normal money HGW batches.
            // maxBatchesPerCycle: Number(flags["exp-max-batches"]) || 100000,
            cycleDelayMs: Number(flags["exp-cycle-delay"]) || 25,
          },
        }
        : daemonState;

    if (forcedExpMode) {
      phase = {
        ...phase,
        name: "forced-exp",
        moneyRamRatio: 0.00,
        shareRamRatio: 0.00,
        expRamRatio: 1.00,
      };
    }

    runtimeStats.phase = phase;
    runtimeStats.protoMoneyThreads = 0;

    const isExpMode =
      effectiveDaemonState?.mode === "exp";

    const rescanMs =
      effectiveDaemonState?.protoBatching?.rescanIntervalMs ??
      rescanIntervalMs;

    const delayMs =
      isExpMode
        ? Number(flags["exp-cycle-delay"]) || 25
        : effectiveDaemonState?.protoBatching?.cycleDelayMs ?? cycleDelayMs;

    runtimeStats.expOverdrive = {
      active: isExpMode,
      maxBatches: isExpMode ? null : Number(flags["max-batches"]) || 750,
      cycleDelayMs: delayMs,
    };

    if (now - lastScan > rescanMs || rootedServers.size <= 1) {
      rootedServers = getAllExecutionServers(ns);
      runtimeStats.scanRuns++;
      lastScan = now;
    }

    rootedServers = sanitizeServerSet(ns, rootedServers);
    runtimeStats.blockedExecutionCleanup =
      (runtimeStats.blockedExecutionCleanup ?? 0) +
      cleanupBlockedExecutionHosts(ns, rootedServers, effectiveDaemonState);
    rootedServers = filterExecutionServers(ns, rootedServers, effectiveDaemonState);

    await copyScriptsToServers(ns, rootedServers, copiedServers, runtimeStats);

    const hosts = getHosts(ns, rootedServers);

    // Phase-aware RAM reservation.
    // Share runs BEFORE lanes so faction/reset-prep phases reserve RAM first.
    if (phase.shareRamRatio > 0) {
      const shareResult = await runShareMode(
        ns,
        hosts,
        homeReserveRam,
        phase.shareRamRatio
      );

      runtimeStats.share = {
        active: true,
        launched: shareResult.launched,
        threads: shareResult.threadsLaunched,
        bonus: ns.getSharePower(),
        ratio: phase.shareRamRatio,
        phase: phase.name,
      };
    } else {
      runtimeStats.share = {
        active: false,
        launched: 0,
        threads: 0,
        bonus: ns.getSharePower(),
        ratio: 0,
        phase: phase.name,
      };
    }

    const lanes = buildTargetLanes(ns, rootedServers, hosts, effectiveDaemonState);

    const laneSnapshots = snapshotLanes(lanes, getLaneRamStats);
    if (lanes.length === 0) {
      if (now - lastDraw > 5000) {
        ns.clearLog();
        ns.print("No valid multi-target lanes found.");
        lastDraw = now;
      }

      await ns.sleep(delayMs);
      continue;
    }

    const results = [];

    for (const lane of lanes) {
      if (!lane.target || !lane.mode || lane.hosts.length === 0) continue;
      if (!isUsableTarget(ns, lane.target)) continue;

      const result = runLane(ns, lane, runtimeStats);
      if (result) results.push(result);
    }

    if (now - lastDraw > 5000) {
      writeUhmState(ns, {
        daemonState: effectiveDaemonState,
        lanes,
        results,
        laneSnapshots,
        runtimeStats,
        phase,
        hosts,
      });

      ns.clearLog();
      printMultiTargetStatus(
        ns,
        lanes,
        results,
        effectiveDaemonState,
        laneSnapshots,
        runtimeStats,
      );
      lastDraw = now;
    }
    await ns.sleep(delayMs);
  }
}

function writeUhmState(ns, {
  daemonState,
  lanes,
  results,
  laneSnapshots,
  runtimeStats,
  phase,
  hosts,
}) {
  const exp = runtimeStats.expOverdrive ?? {};
  const laneStats = lanes.map((lane, index) => {
    const ram = laneSnapshots[index]?.ram ?? getLaneRamStats(lane);
    const result = results.find(item => item.lane === lane.name) ?? null;

    return {
      name: lane.name,
      mode: lane.mode,
      target: lane.target,
      targetSource: lane.targetSource ?? null,
      expPurpose: lane.expPurpose ?? null,
      hosts: lane.hosts?.length ?? 0,
      ram,
      status: result?.status ?? "idle",
      launched: result?.launched ?? 0,
      expStats: result?.expStats ?? null,
    };
  });

  const state = {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    mode: daemonState?.mode ?? "unknown",
    priority: daemonState?.spendingPolicy?.priority ?? "unknown",
    phase: phase?.name ?? daemonState?.phase ?? "unknown",
    hostCount: hosts.length,
    exp: {
      active: exp.active === true,
      engine: exp.engine ?? null,
      target: exp.target ?? null,
      purpose: exp.purpose ?? null,
      status: exp.status ?? null,
      workers: exp.activeProcesses ?? exp.launched ?? 0,
      maxProcesses: exp.maxProcesses ?? 0,
      threads: exp.totalThreads ?? exp.activeThreads ?? exp.threads ?? 0,
      activeByRole: exp.activeByRole ?? null,
      totalByRole: exp.totalByRole ?? null,
      growRatio: exp.growRatio ?? 0,
      expPerSecond: exp.expPerSecond ?? 0,
    },
    share: {
      active: runtimeStats.share?.active === true,
      launched: runtimeStats.share?.launched ?? 0,
      threads: runtimeStats.share?.threads ?? 0,
      bonus: runtimeStats.share?.bonus ?? 1,
      ratio: runtimeStats.share?.ratio ?? 0,
      phase: runtimeStats.share?.phase ?? phase?.name ?? null,
      policy: daemonState?.sharePolicy ?? null,
    },
    lanes: laneStats,
    runtime: {
      batches: runtimeStats.batchesLaunched ?? 0,
      failed: runtimeStats.failedLaunches ?? 0,
      prep: runtimeStats.prepRuns ?? 0,
      scans: runtimeStats.scanRuns ?? 0,
      copies: runtimeStats.copiedServers ?? 0,
    },
  };

  try {
    ns.write(UHM_STATE_FILE, JSON.stringify(state, null, 2), "w");
    ns.write(UHM_HUD_FILE, buildUhmHudText(ns, state, daemonState), "w");
  } catch {
    // Status telemetry should never stop the controller.
  }
}

function buildUhmHudText(ns, uhmState, daemonState) {
  const player = daemonState?.player ?? {};
  const reset = daemonState?.resetPlan ?? {};
  const policy = daemonState?.spendingPolicy ?? {};
  const faction = daemonState?.factionProgression ?? {};
  const targetStats = daemonState?.targetStats ?? {};
  const services = Array.isArray(daemonState?.services) ? daemonState.services : [];
  const serviceCounts = countServices(services);
  const lines = [];

  lines.push("UHM + Daemon HUD");
  lines.push("============================================================");
  lines.push(`Updated: ${uhmState.updatedAtText ?? new Date().toLocaleTimeString()}`);
  lines.push(`Mode: ${uhmState.mode} | Priority: ${uhmState.priority} | Phase: ${uhmState.phase}`);
  lines.push(`Target: ${daemonState?.target ?? "none"} | Hosts: ${uhmState.hostCount ?? 0}`);
  lines.push(`Money: ${formatMoney(ns, player.money ?? ns.getPlayer().money)} | Hacking: ${ns.format.number(player.hacking ?? ns.getHackingLevel(), 0)}`);
  lines.push("");

  lines.push("Target");
  lines.push("------------------------------------------------------------");
  lines.push(`Money: ${formatPercent(targetStats.moneyPercent)} | Security: +${formatNumber(targetStats.securityDiff ?? 0)} | Weaken: ${formatDuration(targetStats.weakenTime ?? 0)}`);
  lines.push(`Reason: ${daemonState?.targetReason ?? daemonState?.controller?.reason ?? "No target reason published."}`);
  lines.push("");

  lines.push("Progression");
  lines.push("------------------------------------------------------------");
  lines.push(`Stage: ${faction.currentFactionStage ?? "unknown"} | Blocker: ${faction.currentBlocker ?? "none"} | Next: ${faction.nextBestAction ?? "none"}`);
  lines.push(`Reason: ${faction.reason ?? daemonState?.controller?.reason ?? "No progression reason published."}`);
  lines.push("");

  lines.push("Reset");
  lines.push("------------------------------------------------------------");
  lines.push(`Ready: ${yesNo(reset.ready)} | Armed: ${yesNo(reset.armed)} | Pending: ${reset.pendingCount ?? 0} | Installed: ${reset.installedCount ?? 0}`);
  lines.push(`Reason: ${reset.reason ?? "No reset reason."}`);
  lines.push("");

  lines.push("Policy");
  lines.push("------------------------------------------------------------");
  lines.push(
    `EXE${mark(policy.allowExePurchases)} SERV${mark(policy.allowServerPurchases)} ` +
    `STOCK${mark(policy.allowStockTrading)} HACKNET${mark(policy.allowHacknet)} ` +
    `HOME${mark(policy.allowHomeRam)} AUG${mark(policy.allowAugmentPurchases)} ` +
    `RESET${mark(policy.allowReset)}`
  );
  lines.push(`Reserve: ${formatMoney(ns, policy.reserveMoney ?? daemonState?.reserveMoney ?? 0)}`);
  lines.push("");

  lines.push("UHM Lanes");
  lines.push("------------------------------------------------------------");
  for (const lane of uhmState.lanes ?? []) {
    lines.push(
      `${lane.name}: ${lane.mode} ${lane.target ?? "none"} | ${lane.status ?? "idle"} | ` +
      `hosts ${lane.hosts ?? 0} | free ${formatRam(ns, lane.ram?.freeRam ?? 0)} / ${formatRam(ns, lane.ram?.maxRam ?? 0)}`
    );
  }
  if (!uhmState.lanes?.length) lines.push("No lanes published.");
  lines.push("");

  lines.push("Runtime");
  lines.push("------------------------------------------------------------");
  lines.push(
    `Batches: ${uhmState.runtime?.batches ?? 0} | Failed: ${uhmState.runtime?.failed ?? 0} | ` +
    `Prep: ${uhmState.runtime?.prep ?? 0} | Scans: ${uhmState.runtime?.scans ?? 0} | Copies: ${uhmState.runtime?.copies ?? 0}`
  );
  lines.push(`Share: ${uhmState.share?.active ? "ON" : "OFF"} | ${uhmState.share?.threads ?? 0}t | ${formatNumber(uhmState.share?.bonus ?? 1)}x`);
  lines.push("");

  lines.push("Services");
  lines.push("------------------------------------------------------------");
  lines.push(`Live: ${serviceCounts.live} | Started: ${serviceCounts.started} | Blocked: ${serviceCounts.blocked} | Done: ${serviceCounts.done} | Failed: ${serviceCounts.failed}`);
  for (const item of services.slice(0, 8)) {
    lines.push(`${String(item.kind ?? item.status ?? "?").toUpperCase().padEnd(7)} ${item.name ?? item.id} - ${item.reason ?? ""}`);
  }

  return `${lines.join("\n")}\n`;
}

function countServices(services) {
  const counts = {
    live: 0,
    started: 0,
    blocked: 0,
    done: 0,
    failed: 0,
  };

  for (const service of services) {
    if (service.kind === "live") counts.live++;
    else if (service.status === "started") counts.started++;
    else if (service.kind === "locked") counts.blocked++;
    else if (service.kind === "done") counts.done++;
    else if (service.kind === "failed") counts.failed++;
  }

  return counts;
}

function mark(value) {
  return value === true ? "Y" : "N";
}

function yesNo(value) {
  return value === true ? "YES" : "NO";
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "unknown";
  return `${(number * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  if (Math.abs(number) >= 1000) return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return number.toFixed(2);
}

function formatMoney(ns, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "$0";
  try {
    return `$${ns.format.number(number)}`;
  } catch {
    return `$${Math.round(number).toLocaleString()}`;
  }
}

function formatRam(ns, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0GB";
  try {
    return ns.format.ram(number);
  } catch {
    return `${number.toFixed(2)}GB`;
  }
}

function formatDuration(ms) {
  const number = Number(ms);
  if (!Number.isFinite(number) || number <= 0) return "0s";
  const seconds = Math.round(number / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getUhmPhase(ns, daemonState) {
  const fallback = getProgressionPhase(ns);

  if (!daemonState) return fallback;

  const shareEnabled = daemonState?.sharePolicy?.enabled === true;

  return {
    ...fallback,
    name: daemonState.phase ?? fallback.name,
    daemonMode: daemonState.mode ?? null,
    daemonPriority: daemonState.spendingPolicy?.priority ?? null,

    moneyRamRatio:
      daemonState?.multiTargetPolicy?.primaryMoneyRamPercent ??
      fallback.moneyRamRatio,

    shareRamRatio:
      shareEnabled
        ? daemonState?.sharePolicy?.reserveRamPercent ?? fallback.shareRamRatio
        : 0,

    expRamRatio:
      daemonState?.multiTargetPolicy?.expRamPercent ??
      fallback.expRamRatio,
  };
}

function shouldForceExpMode(ns, daemonState, flags) {
  if (flags.overdrive === true) {
    return true;
  }

  const formulasUnlocked =
    daemonState?.formulasUnlocked === true &&
    ns.fileExists("Formulas.exe", "home") &&
    !!ns.formulas?.hacking;

  if (!formulasUnlocked) return false;
  if (daemonState?.mode !== "exp") return false;

  const hacking = ns.getHackingLevel();
  const forcedTarget = getForcedExpTargetLevel(daemonState);
  const money = ns.getPlayer().money;
  const reserve = daemonState?.reserveMoney ?? 0;
  const spendable = Math.max(0, money - reserve);

  const bootstrapActive =
    daemonState?.bootstrap?.active === true;

  const priority =
    daemonState?.spendingPolicy?.priority ?? "";

  const darkwebComplete =
    daemonState?.services?.some(service =>
      service.id === "darkweb-buyer" &&
      service.status === "completed"
    ) === true;

  if (bootstrapActive) return false;
  if (!darkwebComplete) return false;
  if (priority === "upgrades") return false;
  if (hacking >= forcedTarget) return false;
  if (spendable < 1_000_000_000) return false;

  return true;
}

function getForcedExpTargetLevel(daemonState) {
  const candidates = [
    daemonState?.bn4VictoryPlan?.hackingTarget,
    daemonState?.factionProgression?.requiredHack,
    daemonState?.factionProgression?.expPolicy?.targetLevel,
    daemonState?.bn4Readiness?.hackingTarget,
    daemonState?.progression?.hackingTarget,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 2500;
}
