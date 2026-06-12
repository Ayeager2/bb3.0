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
    // EXP sprint saturation is controlled by /lib/uhm/runner.js process caps.
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
              : "Endgame EXP overdrive",
          },

          protoBatching: {
            ...(daemonState?.protoBatching ?? {}),
            // EXP mode does not use proto batch count; runner.js fills RAM with capped workers.
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
