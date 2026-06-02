// /tools/target-service.js
import { TARGET_STATE_FILE } from "/lib/daemon/target-state-config.js";

import {
    getAllServers,
    getRootedServers,
    sanitizeServerSet,
} from "/lib/daemon/network.js";

import {
    getBitNodeRoadmap,
    detectCapabilities,
} from "/lib/daemon/decision.js";

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

        const state = {
            updatedAt: Date.now(),
            role: "passive-target-observer",
            authority: "daemon-decision-layer",
            capabilities,
            bitNodePlan,
            servers: {
                totalCount: allServers.size,
                rootedCount: rootedServers.size,
                rooted: [...rootedServers],
            },
        };

        ns.write(TARGET_STATE_FILE, JSON.stringify(state, null, 2), "w");

        await ns.sleep(refreshMs);
    }
}