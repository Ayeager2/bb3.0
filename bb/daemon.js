// daemon.js - Main loop for Bitburner automation daemon
import { CONFIG, STATE_FILE } from "/lib/daemon/config.js";

import { killOtherDaemonInstances } from "/lib/daemon/daemon-process.js";

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
import { refreshDaemonState } from "/lib/daemon/dev-reset.js";
import {
  buildResetPlan,
  writeResetPlan,
} from "/lib/daemon/reset-planner.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["exp", false],
    ["level", false],
    ["leveling", false],
    ["money", false],
    ["faction", false],
    ["force-mode", ""],
    ["force-priority", ""],
    ["force-target", ""],
    ["skip-refresh", false],
  ]);

  const wantsLeveling =
    flags.exp === true ||
    flags.level === true ||
    flags.leveling === true;
  const wantsMoney =
    flags.money === true;
  const wantsFaction =
    flags.faction === true;

  const forcedMode =
    wantsLeveling
      ? "exp"
      : wantsFaction
        ? "faction"
        : wantsMoney
          ? "money"
          : normalizeMode(flags["force-mode"]);

  const explicitPriority =
    wantsLeveling
      ? "leveling"
      : wantsFaction
        ? "faction"
        : wantsMoney
          ? "income"
          : normalizePriority(flags["force-priority"]);
  const forcedPriority =
    explicitPriority ||
    getDefaultPriorityForMode(forcedMode);

  const overrides = {
    mode: forcedMode,
    priority: forcedPriority,
    target: flags["force-target"] || null,
    level: wantsLeveling,
    money: wantsMoney,
    faction: wantsFaction,
  };

  killOtherDaemonInstances(ns);
  if (flags["skip-refresh"] !== true) {
    refreshDaemonState(ns, {
      volatile: true,
      completions: true,
      sessions: true,
      allDataText: true,
      verbose: true,
    });
    ns.tprint("[DAEMON] Startup state refresh complete.");
  } else {
    ns.tprint("[DAEMON] Startup state refresh skipped; startup.js already refreshed state.");
  }

  let capabilities;
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
        decidedMode === "destroy-node"
          ? "destroy-node"
          : overrides.mode ||
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
        overrides,

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
        overrides,
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

    writeResetPlan(ns, buildResetPlan(ns));

    state.services = manageServices(ns, state);

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

function normalizeMode(mode) {
  const normalized = String(mode ?? "").trim().toLowerCase();

  if (!normalized) return null;
  if (normalized === "level" || normalized === "leveling") return "exp";
  if (normalized === "rep" || normalized === "reputation") return "faction";

  return normalized;
}

function normalizePriority(priority) {
  const normalized = String(priority ?? "").trim().toLowerCase();

  if (!normalized) return null;
  if (normalized === "exp" || normalized === "level") return "leveling";
  if (normalized === "rep" || normalized === "reputation") return "faction";

  return normalized;
}

function getDefaultPriorityForMode(mode) {
  if (mode === "faction") return "faction";
  if (mode === "money") return "income";
  if (mode === "exp") return "leveling";

  return null;
}
