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

      const decidedMode = chooseModeFromRoadmap(
        ns,
        roadmapState.roadmap,
        rootedServers
      );

      const mode =
        overrides.mode ||
        (bootstrapMode ? "bootstrap" : decidedMode || targetState?.mode || "money");

      const spendingPolicy = chooseSpendingPolicy(
        ns,
        mode,
        capabilities,
        overrides
      );

      cachedState = {
        updatedAt: Date.now(),

        mode,
        phase: targetState?.phase ?? mode,

        target: overrides.target || targetState?.target || "n00dles",
        targetOverride: overrides.target || targetState?.targetOverride || null,

        capabilities,
        spendingPolicy,

        bitNodePlan: targetState?.bitNodePlan ?? {},
        roadmap: roadmapState,

        servers: targetState?.servers ?? {
          totalCount: 1,
          rootedCount: 1,
        },

        controller: {
          reason: "Daemon mode now driven by decision.js roadmap logic",
          targetStateAgeMs: targetState?.updatedAt
            ? Date.now() - targetState.updatedAt
            : null,
          targetServiceMode: targetState?.mode ?? null,
          decisionMode: decidedMode,
        },

        bootstrap: {
          active: bootstrapMode,
          homeRam,
          money,
          reason: bootstrapMode
            ? "Home RAM below bootstrap threshold"
            : "Bootstrap complete",
        },
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