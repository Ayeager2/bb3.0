//daemon.js - Main loop for Bitburner automation daemon
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
} from "/lib/daemon/decision.js";

import { manageServices } from "/lib/daemon/service-manager.js";
import { TARGET_STATE_FILE } from "/lib/daemon/target-state-config.js";
import { buildGlobalState } from "/lib/daemon/state.js";
import { buildStrategicMoneyTargetPlan } from "/lib/daemon/target-intelligence.js";
import {
  logTargetDecision,
} from "/lib/daemon/telemetry.js";
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
        backdoorState,
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
      
      const previousTargetState = {
        target: cachedState?.target ?? targetState?.target ?? null,
        targetOverride: cachedState?.targetOverride ?? targetState?.targetOverride ?? null,
        targetSince: cachedState?.targetSince ?? targetState?.targetSince ?? targetState?.updatedAt ?? null,
        updatedAt: cachedState?.updatedAt ?? targetState?.updatedAt ?? null,
      };

      const targetAgeMs =
        previousTargetState?.targetSince
          ? Date.now() - previousTargetState.targetSince
          : Number.MAX_SAFE_INTEGER;

      const strategicTargetPlan = buildStrategicMoneyTargetPlan(
        ns,
        rootedServers,
        previousTargetState?.target ?? targetState?.target ?? null,
        {
          minHoldMs: 5 * 60 * 1000,
          targetAgeMs,
          forceTarget: overrides.target,
        }
      );

      const proposedTarget = strategicTargetPlan?.target || targetState?.target || "n00dles";

      const stableTarget = applyTargetStability(
        ns,
        previousTargetState,
        proposedTarget,
        overrides
      );

      logTargetDecision(ns, {
        previousTarget: previousTargetState?.target ?? null,

        proposedTarget,

        finalTarget: stableTarget.target,

        blockedSwap: stableTarget?.targetStability?.blockedSwap ?? false,

        changed: previousTargetState?.target !== stableTarget.target,

        reason:
          strategicTargetPlan?.reason ??
          stableTarget?.targetStability?.reason ??
          "target decision updated",

        targetAgeMs: stableTarget?.targetStability?.ageMs ?? null,

        minHoldMs: stableTarget?.targetStability?.minHoldMs ?? null,

        score: strategicTargetPlan?.bestCandidate?.score ?? null,

        data: {
          bestCandidate: strategicTargetPlan?.bestCandidate?.server ?? null,

          currentCandidate: strategicTargetPlan?.currentCandidate?.server ?? null,
        },
      });

      const decision = {
        mode,
        phase: targetState?.phase ?? mode,

        target: stableTarget.target,
        targetOverride: stableTarget.targetOverride,

        strategicTargetPlan,
        backdoorState,

        rootedServers: new Set(rootedServers),       

        capabilities,
        spendingPolicy,

        bitNodePlan: roadmapState,
        roadmap: roadmapState,

        servers: targetState?.servers ?? {
          totalCount: 1,
          rootedCount: 1,
        },

        targetStability: stableTarget.targetStability,
        targetSince: stableTarget.targetSince,
      };

      cachedState = buildGlobalState(ns, decision, capabilities);
      cachedState.strategicTargetPlan = strategicTargetPlan;
      cachedState.backdoorState = backdoorState;
      cachedState.controller = {
        ...cachedState.controller,

        reason: "Daemon state now built by /lib/daemon/state.js",

        targetStateAgeMs: targetState?.updatedAt
          ? Date.now() - targetState.updatedAt
          : null,

        targetServiceMode: targetState?.mode ?? null,

        decisionMode: decidedMode,

        strategicTargetPlan:
          cachedState?.strategicTargetPlan ?? null,

        strategicTargetReason:
          cachedState?.strategicTargetPlan?.reason ?? null,

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

function applyTargetStability(ns, targetState, proposedTarget, overrides) {
  const now = Date.now();
  const minHoldMs = 5 * 60 * 1000;

  if (overrides?.target) {
    return {
      target: overrides.target,
      targetOverride: overrides.target,
      targetSince: now,
      targetStability: {
        held: false,
        reason: "manual target override",
        proposedTarget,
        activeTarget: overrides.target,
        minHoldMs,
      },
    };
  }

  const currentTarget = targetState?.target || proposedTarget || "n00dles";
  const previousTarget = targetState?.target || null;
  const previousSince = targetState?.targetSince || targetState?.updatedAt || now;
  const ageMs = now - previousSince;

  if (!previousTarget || previousTarget === proposedTarget) {
    return {
      target: proposedTarget || currentTarget,
      targetOverride: targetState?.targetOverride || null,
      targetSince: previousSince,
      targetStability: {
        held: true,
        reason: "target unchanged",
        proposedTarget,
        activeTarget: proposedTarget || currentTarget,
        ageMs,
        minHoldMs,
      },
    };
  }

  if (ageMs < minHoldMs) {
    return {
      target: previousTarget,
      targetOverride: targetState?.targetOverride || null,
      targetSince: previousSince,
      targetStability: {
        held: true,
        blockedSwap: true,
        reason: "minimum target hold active",
        proposedTarget,
        activeTarget: previousTarget,
        ageMs,
        remainingMs: minHoldMs - ageMs,
        minHoldMs,
      },
    };
  }
  
  return {
    target: proposedTarget || currentTarget,
    targetOverride: null,
    targetSince: now,
    targetStability: {
      held: false,
      blockedSwap: false,
      reason: "target swap allowed",
      proposedTarget,
      activeTarget: proposedTarget || currentTarget,
      previousTarget,
      ageMs,
      minHoldMs,
    },
  };
}