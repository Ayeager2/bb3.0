import {
  STATE_FILE,
  scriptsToCopy,
  hackScript,
  growScript,
  weakenScript,
  defaultHackPercent,
  expHackPercent,
  batchSpacingMs,
  rescanIntervalMs,
  homeReserveRam,
  maxBatchesPerCycle,
  cycleDelayMs,
} from "/lib/uhm/config.js";

import {
  safeServerExists,
  isUsableTarget,
  safeGetServerMaxRam,
  safeGetServerUsedRam,
  safeGetServerMaxMoney,
  safeGetServerMoneyAvailable,
  safeGetServerSecurityLevel,
  safeGetServerMinSecurityLevel,
  safeGetServerGrowth,
  safeGetWeakenTime,
  safeHackAnalyzeChance,
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
  splitHostsByRamBudget,
  cloneHostsForSingleLane,
} from "/lib/uhm/hosts.js";

import {
  launchBatchesAggressive,
  getBatchPlan,
} from "/lib/uhm/batch.js";

import {
  prepTarget,
  isPrepared,
} from "/lib/uhm/prep.js";

import {
  getValidTargetOrFallback,
  getSecondaryMoneyTarget,
} from "/lib/uhm/targets.js";

import {
  buildTargetLanes,
} from "/lib/uhm/lanes.js";

import {
  runtimeStats,
} from "/lib/uhm/runtime.js";

import {
  runExpFallback,
} from "/lib/uhm/modes/exp.js";

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
    const phase = getProgressionPhase(ns);
    runtimeStats.phase = phase;
    const rescanMs = daemonState?.protoBatching?.rescanIntervalMs ?? rescanIntervalMs;
    const delayMs = daemonState?.protoBatching?.cycleDelayMs ?? cycleDelayMs;

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

    const lanes = buildTargetLanes(ns, rootedServers, hosts, daemonState);

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
        daemonState,
        laneSnapshots,
        runtimeStats,
      );
      lastDraw = now;
    }
    await ns.sleep(delayMs);
  }
}




