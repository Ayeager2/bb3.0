
import { CONFIG, STATE_FILE } from "/lib/daemon/config.js";

import {
  killOtherDaemonInstances,
  cleanDaemonManagedProcesses,
  manageShareWorkers,
  startScripts,
  updateCompletedStatus,
  layoutRunningTails,
} from "/lib/daemon/control.js";

import {
  writeJson,
  safeServerExists,
  safeGetPurchasedServers,
  safeGetCloudServers,
  safeGetServerMaxMoney,
  safeGetServerMoneyAvailable,
  safeGetServerSecurityLevel,
  safeGetServerMinSecurityLevel,
  safeGetServerGrowth,
  safeGetWeakenTime,
  safeHackAnalyzeChance,
  buildProcessCache,
  getPidFromCache,
  getScriptKey,
  formatMoney,
} from "/lib/daemon/safe.js";

import {
  getAllServers,
  getRootedServers,
  sanitizeServerSet,
} from "/lib/daemon/network.js";

import {
  getDaemonTarget,
  getBestMoneyTarget,
  isTargetReasonableForMoney,
  getBestPrepTarget,
  prepNeed,
  getTargetStats,
  scoreMoneyTarget,
  canUseTarget,
} from "/lib/daemon/targets.js";

import {
  getBn4VictoryPlan,
  getBn4Readiness,
  getOwnedAugmentationsSafe,
} from "/lib/daemon/progression.js";

import {
  getBitNodeRoadmap,
  chooseModeFromRoadmap,
  chooseSpendingPolicy,
  chooseTargetOverride,
  detectCapabilities,
} from "/lib/daemon/decision.js";


import { buildGlobalState } from "/lib/daemon/state.js";
import { applyTargetStability } from "/lib/daemon/target-stability.js";
import { drawDashboard } from "/lib/daemon/dashboard.js";

import {
  logModeChange,
  logTargetChange,
  logPriorityChange,
  logSpendingPolicy,
  logDecision,
  logError,
  getDecisionReasonSafe
} from "/lib/daemon/telemetry.js";

// #region 2. main()

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  const flags = ns.flags([
    ["force-mode", ""],
    ["force-priority", ""],
    ["force-target", ""],
  ]);

  const overrides = {
    mode: flags["force-mode"] || null,
    priority: flags["force-priority"] || null,
    target: flags["force-target"] || null,
  };

  const completedOnce = new Set();
  const startedOnce = new Set();
  const openedTails = new Set();
  let capabilities = detectCapabilities(ns);

  const scripts = [
    { name: "/tools/worm-update.js", host: "home", threads: 1, args: [], tail: false, keepAlive: false },
    { name: "/controllers/uhm.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
    { name: "/economy/scaleingServerPurchase.js", host: "home", threads: 1, args: [], tail: false, keepAlive: false },
    { name: "/economy/justhacknet.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
    { name: "/economy/stock-trader.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
    { name: "/helpers/servers.js", host: "home", threads: 1, args: [], tail: false, keepAlive: false },
    { name: "/planners/flight-status.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
    { name: "/helpers/darknet-watch.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
    { name: "/singularity/s4/autobuyAugmentations.js", host: "home", threads: 1, args: [], tail: false, requiresSingularity: true },
    { name: "/controllers/progression-buyer.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
    { name: "/planners/augmentation-planner.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true, requiresSingularity: true },
    { name: "/planners/faction-planner.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true, },
    { name: "/singularity/faction-ai.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true, requiresSingularity: true },
    { name: "/planners/reset-planner.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true, requiresSingularity: true },
    { name: "/singularity/int-travel.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true, requiresSingularity: true },
    { name: "/controllers/backdoor-ai.js", host: "home", threads: 1, args: [], tail: false, keepAlive: true },
  ];

  killOtherDaemonInstances(ns);
  cleanDaemonManagedProcesses(ns, scripts);

  let cachedServers = new Set(["home"]);
  let cachedRootedServers = new Set(["home"]);
  let cachedDecision = null;
  let previousDecision = null;
  let lastScan = 0;
  let lastDecision = 0;
  let lastDashboardDraw = 0;
  let lastTailLayout = 0;

  while (true) {
    const now = Date.now();
    capabilities = detectCapabilities(ns);

    if (now - lastScan > CONFIG.scanRefreshMs) {
      cachedServers = getAllServers(ns);
      cachedRootedServers = getRootedServers(ns, cachedServers);
      cachedRootedServers = sanitizeServerSet(ns, cachedRootedServers);
      lastScan = now;
    }

    if (!cachedDecision || now - lastDecision > CONFIG.decisionRefreshMs) {
      cachedRootedServers = sanitizeServerSet(ns, cachedRootedServers);

      const bitNodePlan = getBitNodeRoadmap(ns);

      const mode =
        overrides.mode ||
        chooseModeFromRoadmap(ns, bitNodePlan.roadmap, cachedRootedServers);

      const spendingPolicy = chooseSpendingPolicy(ns, mode, capabilities, overrides);
      const targetOverride =
        overrides.target ||
        chooseTargetOverride(ns, mode);
      const target = getDaemonTarget(ns, cachedRootedServers, mode, targetOverride);
      let nextDecision = {
        rootedServers: cachedRootedServers,
        target,
        mode,
        bitNodePlan,
        targetOverride,
        spendingPolicy,
      };
      const stability = applyTargetStability(ns, previousDecision, nextDecision, {
        minimumHoldMs: 5 * 60 * 1000,
      });

      cachedDecision = stability.decision;
      try {
        if (previousDecision) {
          logModeChange(
            ns,
            previousDecision.mode,
            cachedDecision.mode,
            getDecisionReasonSafe(previousDecision, cachedDecision)
          );

          logTargetChange(
            ns,
            previousDecision.target,
            cachedDecision.target,
            getDecisionReasonSafe(previousDecision, cachedDecision)
          );

          logPriorityChange(
            ns,
            previousDecision.spendingPolicy?.priority,
            cachedDecision.spendingPolicy?.priority,
            getDecisionReasonSafe(previousDecision, cachedDecision)
          );

          logSpendingPolicy(
            ns,
            previousDecision.spendingPolicy,
            cachedDecision.spendingPolicy,
            getDecisionReasonSafe(previousDecision, cachedDecision)
          );
        }

        logDecision(ns, cachedDecision, "Decision refresh completed.");
        previousDecision = structuredClone(cachedDecision);

      } catch (error) {
        logError(ns, "daemon decision telemetry", error);
      }
      lastDecision = now;
    }

    const state = buildGlobalState(ns, cachedDecision, capabilities);
    writeJson(ns, STATE_FILE, state);

    startScripts(ns, scripts, startedOnce, completedOnce, openedTails, state);
    manageShareWorkers(ns, state);
    updateCompletedStatus(ns, scripts, startedOnce, completedOnce);
    if (now - lastTailLayout > 30000) {
      layoutRunningTails(ns, scripts, openedTails);
      lastTailLayout = now;
    }
    if (now - lastDashboardDraw > 10000) {
      drawDashboard(ns, scripts, startedOnce, completedOnce, state, overrides);
      lastDashboardDraw = now;
    }
    await ns.sleep(CONFIG.refreshMs);
  }
}



// #endregion
