// /lib/uhm/runner.js
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
    hackScript,
    growScript,
    weakenScript,
} from "/lib/uhm/config.js";
import {
    runExpSprint,
} from "/lib/uhm/modes/exp-sprint.js";

export function runLane(ns, lane, runtimeStats) {
    if (!isUsableTarget(ns, lane.target)) return null;

    if (lane.mode === "exp") {
        const result = runExpSprint(ns, lane.target, lane.hosts, {
            maxProcesses: 100000,
            maxThreadsPerProcess: 50_000,
            maxProcessesPerHost: 48,
        });

        runtimeStats.expOverdrive = {
            active: true,
            engine: result.engine ?? "hack-sprint",
            target: lane.target,
            purpose: lane.expPurpose ?? "background",
            launched: result.launched,
            threads: result.threads,
            status: result.status,
            activeProcesses: result.activeProcesses ?? 0,
            maxProcesses: result.maxProcesses ?? 0,
            maxThreadsPerProcess: result.maxThreadsPerProcess ?? 0,
            growRatio: Number.isFinite(result.growRatio) ? result.growRatio : 0,
        };

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            expPurpose: lane.expPurpose ?? "background",
            targetSource: lane.targetSource ?? "selected",
            requestedTarget: lane.requestedTarget ?? null,
            status: result.status,
            launched: result.launched,
            threads: result.threads,
            plan: null,
        };
    }

    if (lane.mode === "money" && shouldUseProtoMoney(ns, lane)) {
        const protoThreads = runProtoMoney(ns, lane.target, lane.hosts);

        runtimeStats.protoMoneyThreads =
            (runtimeStats.protoMoneyThreads ?? 0) + protoThreads;

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            targetSource: lane.targetSource ?? "selected",
            requestedTarget: lane.requestedTarget ?? null,
            status: protoThreads > 0 ? "PROTO-MONEY" : "NO-RAM",
            launched: protoThreads,
            plan: null,
        };
    }

    const availableRam = getLaneFreeRam(lane.hosts);

    const plan = getBatchPlan(ns, lane.target, lane.mode, {
        availableRam,
        formulasUnlocked:
            lane.formulasUnlocked === true &&
            !!ns.formulas?.hacking,
    });

    if (!plan) return null;

    if (!isPrepared(ns, lane.target)) {
        runtimeStats.prepRuns++;

        prepTarget(ns, lane.target, lane.hosts);

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            targetSource: lane.targetSource ?? "selected",
            requestedTarget: lane.requestedTarget ?? null,
            status: "PREPPING",
            launched: 0,
            plan,
        };
    }

    if (plan.tooLargeForLane) {
        const protoThreads = runProtoMoney(ns, lane.target, lane.hosts);

        runtimeStats.protoMoneyThreads =
            (runtimeStats.protoMoneyThreads ?? 0) + protoThreads;

        return {
            lane: lane.name,
            target: lane.target,
            mode: lane.mode,
            targetSource: lane.targetSource ?? "selected",
            requestedTarget: lane.requestedTarget ?? null,
            status: protoThreads > 0 ? "PROTO-MONEY" : "PLAN-TOO-LARGE",
            launched: protoThreads,
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
            maxActiveProcesses: 10000,
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
            targetSource: lane.targetSource ?? "selected",
            requestedTarget: lane.requestedTarget ?? null,
            status: "RUNNING",
            launched,
            plan,
        };
    }

    const protoThreads = lane.mode === "money"
        ? runProtoMoney(ns, lane.target, lane.hosts)
        : 0;

    runtimeStats.protoMoneyThreads =
        (runtimeStats.protoMoneyThreads ?? 0) + protoThreads;

    return {
        lane: lane.name,
        target: lane.target,
        mode: lane.mode,
        targetSource: lane.targetSource ?? "selected",
        requestedTarget: lane.requestedTarget ?? null,
        status: protoThreads > 0 ? "PROTO-MONEY" : "NO-RAM",
        launched: protoThreads,
        plan,
    };
}

function shouldUseProtoMoney(ns, lane) {
    const homeRam = ns.getServerMaxRam("home");
    const formulasUnlocked =
        lane.formulasUnlocked === true &&
        !!ns.formulas?.hacking;

    if (!formulasUnlocked) return true;
    if (homeRam < 256) return true;

    return false;
}

function getLaneFreeRam(hosts = []) {
    return hosts.reduce(
        (sum, host) => sum + Math.max(0, host.freeRam ?? 0),
        0
    );
}

function runProtoMoney(ns, target, hosts = []) {
    const money = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const sec = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);

    if (sec > minSec + 2) {
        return runTinyDistributed(ns, weakenScript, target, hosts);
    }

    if (money < maxMoney * 0.75) {
        return runTinyDistributed(ns, growScript, target, hosts);
    }

    return runTinyDistributed(ns, hackScript, target, hosts);
}

function runTinyDistributed(ns, script, target, hosts = []) {
    const scriptRam = ns.getScriptRam(script);
    let launched = 0;

    for (const host of hosts) {
        const freeRam = Math.max(0, host.freeRam ?? 0);
        const threads = Math.floor(freeRam / scriptRam);

        if (threads <= 0) continue;

        const pid = ns.exec(script, host.host, threads, target, 0);

        if (pid !== 0) {
            host.freeRam -= threads * scriptRam;
            launched += threads;
        }
    }

    return launched;
}
