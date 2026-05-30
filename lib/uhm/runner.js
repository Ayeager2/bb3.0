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

import {
    runExpOverdrive,
} from "/lib/uhm/modes/exp-overdrive.js";

export function runLane(ns, lane, runtimeStats) {
    if (!isUsableTarget(ns, lane.target)) return null;

    const forcedExp =
        runtimeStats?.phase?.name === "forced-exp-until-2500";

    if (forcedExp && lane.mode === "exp") {
        const result = runExpOverdrive(ns, lane.target, lane.hosts, {
            mode: "weaken",
            maxProcesses: 250,
        });

        runtimeStats.expOverdrive = {
            active: true,
            target: lane.target,
            launched: result.launched,
            threads: result.threads,
            status: result.status,
            activeProcesses: result.activeProcesses ?? 0,
            maxProcesses: result.maxProcesses ?? 0,
            growRatio: result.growRatio ?? 0,
        };

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            status: result.status,
            launched: result.launched,
            threads: result.threads,
            plan: null,
        };
    }

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
        {
            maxBatchesPerCycle:
                runtimeStats?.phase?.name?.startsWith("forced-exp")
                    ? 100
                    : undefined,
            maxActiveProcesses:
                runtimeStats?.phase?.name?.startsWith("forced-exp")
                    ? 20000
                    : 10000,
        }
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