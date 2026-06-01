///tools/target-service.js
import { TARGET_STATE_FILE } from "/lib/daemon/target-state-config.js";

import {
    getAllServers,
    getRootedServers,
    sanitizeServerSet,
} from "/lib/daemon/network.js";

import { getDaemonTarget } from "/lib/daemon/targets.js";

import {
    getBitNodeRoadmap,
    chooseModeFromRoadmap,
    chooseTargetOverride,
    detectCapabilities,
} from "/lib/daemon/decision.js";

import {
    chooseStrategicMoneyTarget,
} from "/lib/daemon/target-intelligence.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;

    while (true) {
        const capabilities = detectCapabilities(ns);
        const allServers = getAllServers(ns);
        const rootedServers = sanitizeServerSet(
            ns,
            getRootedServers(ns, allServers)
        );

        const bitNodePlan = getBitNodeRoadmap(ns);

        const mode = chooseModeFromRoadmap(
            ns,
            bitNodePlan.roadmap,
            rootedServers
        );

        const targetOverride = chooseTargetOverride(ns, mode);

        const rawTarget = getDaemonTarget(
            ns,
            rootedServers,
            mode,
            targetOverride
        );

        const target =
            mode === "money"
                ? chooseStrategicMoneyTarget(ns, rootedServers, rawTarget)
                : rawTarget;

        const state = {
            updatedAt: Date.now(),
            mode,
            phase: mode,
            target,
            rawTarget,
            targetOverride,
            capabilities,
            bitNodePlan,
            servers: {
                totalCount: allServers.size,
                rootedCount: rootedServers.size,
            },
            targetIntelligence: {
                enabled: true,
                moneyStrategy: "strategic-money-target-v1",
                rawTarget,
                selectedTarget: target,
            },
        };

        ns.write(TARGET_STATE_FILE, JSON.stringify(state, null, 2), "w");

        await ns.sleep(refreshMs);
    }
}