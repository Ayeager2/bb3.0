// daemon.js - Main loop for Bitburner automation daemon
import { CONFIG, STATE_FILE } from "/lib/daemon/config.js";

import {
  killOtherDaemonInstances,
  manageShareWorkers,
} from "/lib/daemon/control.js";

import { writeJson } from "/lib/daemon/safe.js";

import {
  chooseSpendingPolicy,
  detectCapabilities,
  getBitNodeRoadmap,
  chooseModeFromRoadmap,
  buildStrategicTargetDecision,
} from "/lib/daemon/decision.js";

import { manageServices } from "/lib/daemon/service-manager.js";
import { TARGET_STATE_FILE } from "/lib/daemon/target-state-config.js";
import { buildGlobalState } from "/lib/daemon/state.js";
import { logTargetDecision } from "/lib/daemon/telemetry.js";
import { buildBackdoorState } from "/lib/daemon/backdoor.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

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

  killOtherDaemonInstances(ns);

  let capabilities = detectCapabilities(ns);
  let cachedState = null;
  let lastDecision = 0;

  while (true) {
    const now = Date.now();

    capabilities = detectCapabilities(ns);

    const homeRam = ns.getServerMaxRam("home");
    const money = ns.getPlayer().money;
    const bootstrapMode = homeRam < 64;

    if (!cachedState || now - lastDecision > CONFIG.decisionRefreshMs) {
      const targetState = readJson(ns, TARGET_STATE_FILE);
      const roadmapState = getBitNodeRoadmap(ns);
      const rootedServers = getRootedServersFromTargetState(targetState);
      const backdoorState = buildBackdoorState(ns);

      const decidedMode = chooseModeFromRoadmap(
        ns,
        roadmapState.roadmap,
        rootedServers,
        backdoorState
      );

      const mode =
        overrides.mode ||
        (bootstrapMode
          ? "bootstrap"
          : decidedMode || targetState?.mode || "money");

      const spendingPolicy = chooseSpendingPolicy(
        ns,
        mode,
        capabilities,
        overrides
      );

      const previousTarget = cachedState?.target ?? targetState?.target ?? null;
      const previousTargetSince =
        cachedState?.targetSince ??
        targetState?.targetSince ??
        targetState?.updatedAt ??
        null;

      const strategicTarget = buildStrategicTargetDecision(ns, {
        mode,
        rootedServers,
        currentTarget: previousTarget,
        targetSince: previousTargetSince,
        forceTarget: overrides.target,
      });

      logTargetDecision(ns, {
        previousTarget,
        proposedTarget: strategicTarget?.targetPlan?.target ?? strategicTarget.target,
        finalTarget: strategicTarget.target,
        blockedSwap: strategicTarget?.targetStability?.blockedSwap ?? false,
        changed: previousTarget !== strategicTarget.target,
        reason: strategicTarget.reason ?? "strategic target decision updated",
        targetAgeMs: strategicTarget?.targetStability?.targetAgeMs ?? null,
        minHoldMs: strategicTarget?.targetStability?.minHoldMs ?? null,
        score: strategicTarget?.targetPlan?.bestCandidate?.score ?? null,
        data: {
          bestCandidate:
            strategicTarget?.targetPlan?.bestCandidate?.server ?? null,
          currentCandidate:
            strategicTarget?.targetPlan?.currentCandidate?.server ?? null,
        },
      });

      const decision = {
        mode,
        phase: targetState?.phase ?? mode,

        target: strategicTarget.target,
        targetOverride: overrides.target,
        targetSince: strategicTarget.targetSince,
        targetStability: strategicTarget.targetStability,
        targetPlan: strategicTarget.targetPlan,
        targetReason: strategicTarget.reason,
        laneTargets: strategicTarget.laneTargets ?? null,

        backdoorState,
        rootedServers: new Set(rootedServers),

        capabilities,
        spendingPolicy,

        bitNodePlan: roadmapState,
        roadmap: roadmapState,

        servers: targetState?.servers ?? {
          totalCount: 1,
          rootedCount: rootedServers.length,
        },

      };

      cachedState = buildGlobalState(ns, decision, capabilities);

      cachedState.strategicTargetPlan = strategicTarget.targetPlan;
      cachedState.backdoorState = backdoorState;

      cachedState.controller = {
        ...cachedState.controller,
        reason: "Daemon state now built by /lib/daemon/state.js",
        targetStateAgeMs: targetState?.updatedAt
          ? Date.now() - targetState.updatedAt
          : null,
        targetServiceMode: targetState?.mode ?? null,
        decisionMode: decidedMode,
        strategicTargetPlan: strategicTarget.targetPlan ?? null,
        strategicTargetReason: strategicTarget.reason ?? null,
        backdoorNextTarget:
          cachedState?.backdoorState?.nextTarget?.server ?? null,
        backdoorNextFaction:
          cachedState?.backdoorState?.nextTarget?.faction ?? null,
        backdoorReadyCount:
          cachedState?.backdoorState?.readyCount ?? 0,
      };

      cachedState.bootstrap = {
        active: bootstrapMode,
        homeRam,
        money,
        reason: bootstrapMode
          ? "Home RAM below bootstrap threshold"
          : "Bootstrap complete",
      };

      lastDecision = now;
    }

    const state = {
      ...cachedState,
      updatedAt: Date.now(),
      capabilities,
    };

    state.services = manageServices(ns, state);

    manageShareWorkers(ns, state);

    writeJson(ns, STATE_FILE, state);

    await ns.sleep(CONFIG.refreshMs);
  }
}

function getRootedServersFromTargetState(targetState) {
  if (Array.isArray(targetState?.rootedServers)) {
    return targetState.rootedServers;
  }

  if (Array.isArray(targetState?.servers?.rooted)) {
    return targetState.servers.rooted;
  }

  return ["home"];
}

function readJson(ns, file) {
  try {
    if (!ns.fileExists(file, "home")) return {};
    const raw = ns.read(file);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}