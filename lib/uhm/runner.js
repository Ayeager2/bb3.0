import {
    isUsableTarget,
} from "/lib/uhm/safe.js";

import {
    getBatchPlan,
    launchBatchesAggressive,
} from "/lib/uhm/batch.js";

import {
    prepTarget,
    isPrepared,
} from "/lib/uhm/prep.js";

import {
    runExpFallback,
} from "/lib/uhm/modes/exp.js";

export function runLane(ns, lane, runtimeStats) {
    if (!isUsableTarget(ns, lane.target)) return null;

    const plan = getBatchPlan(ns, lane.target, lane.mode);
    if (!plan) return null;

    if (!isPrepared(ns, lane.target)) {
        runtimeStats.prepRuns++;

        prepTarget(ns, lane.target, lane.hosts);

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            status: "PREPPING",
            launched: 0,
            plan,
        };
    }

    const launched = launchBatchesAggressive(
        ns,
        lane.target,
        lane.hosts,
        plan,
        runtimeStats,
    );

    if (launched > 0) {
        runtimeStats.batchesLaunched += launched;
        runtimeStats.hackThreads += plan.hackThreads * launched;
        runtimeStats.growThreads += plan.growThreads * launched;
        runtimeStats.weakenThreads +=
            (plan.weakenHackThreads + plan.weakenGrowThreads) * launched;

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            status: "RUNNING",
            launched,
            plan,
        };
    }

    if (lane.mode === "exp") {
        const fallbackThreads = runExpFallback(ns, lane.target, lane.hosts);

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            status: fallbackThreads > 0 ? "EXP-FALLBACK" : "NO-RAM",
            launched: fallbackThreads,
            plan,
        };
    }

    return {
        lane: lane.name,
        target: lane.target,
        mode: lane.mode,
        status: "NO-RAM",
        launched: 0,
        plan,
    };
}