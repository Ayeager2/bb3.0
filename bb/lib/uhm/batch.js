///lib/uhm/batch.js
import {
    hackScript,
    growScript,
    weakenScript,
    defaultHackPercent,
    expHackPercent,
    batchSpacingMs,
    maxBatchesPerCycle,
    maxWorkerThreadsPerProcess,
} from "/lib/uhm/config.js";

import {
    safeServerExists,
    isUsableTarget,
    safeGetServerMaxMoney,
} from "/lib/uhm/safe.js";

export function launchBatchesAggressive(
    ns,
    target,
    hosts,
    plan,
    runtimeStats,
    options = {}
) {
    let launched = 0;

    const batchLimit = options.maxBatchesPerCycle ?? maxBatchesPerCycle;
    const maxActiveProcesses = options.maxActiveProcesses ?? 10000;

    if (countActiveWorkerProcesses(ns, hosts) >= maxActiveProcesses) {
        return 0;
    }

    while (launched < batchLimit) {
        if (countActiveWorkerProcesses(ns, hosts) >= maxActiveProcesses) {
            break;
        }

        const batchOffset = launched * batchSpacingMs * 4;
        let reservations = reserveFullBatch(ns, hosts, target, plan, batchOffset);

        if (!reservations && plan.mode === "money") {
            reservations = reservePartialMoneyBatch(ns, hosts, target, plan, batchOffset);
        }

        if (!reservations) break;

        const ok = executeReservations(ns, reservations);

        if (!ok) {
            runtimeStats.failedLaunches++;
            break;
        }

        launched++;
    }

    return launched;
}

export function reserveFullBatch(ns, hosts, target, plan, batchOffset) {
    const liveHosts = hosts.filter(x => safeServerExists(ns, x.host));
    const tempHosts = liveHosts.map(x => ({ ...x }));
    const reservations = [];

    const hack = reserveDistributed(ns, tempHosts, hackScript, plan.hackThreads, target, plan.hackDelay + batchOffset);
    if (!hack) return null;
    reservations.push(...hack);

    const weaken1 = reserveDistributed(ns, tempHosts, weakenScript, plan.weakenHackThreads, target, plan.weakenHackDelay + batchOffset);
    if (!weaken1) return null;
    reservations.push(...weaken1);

    const grow = reserveDistributed(ns, tempHosts, growScript, plan.growThreads, target, plan.growDelay + batchOffset);
    if (!grow) return null;
    reservations.push(...grow);

    const weaken2 = reserveDistributed(ns, tempHosts, weakenScript, plan.weakenGrowThreads, target, plan.weakenGrowDelay + batchOffset);
    if (!weaken2) return null;
    reservations.push(...weaken2);

    for (const host of hosts) {
        const updated = tempHosts.find(x => x.host === host.host);
        if (updated) host.freeRam = updated.freeRam;
    }

    return reservations;
}

export function reservePartialMoneyBatch(ns, hosts, target, plan, batchOffset) {
    const liveHosts = hosts.filter(x => safeServerExists(ns, x.host));
    const tempHosts = liveHosts.map(x => ({ ...x }));
    const reservations = [];

    const weaken2 = reserveDistributed(
        ns,
        tempHosts,
        weakenScript,
        Math.max(1, plan.weakenGrowThreads),
        target,
        plan.weakenGrowDelay + batchOffset
    );

    if (weaken2) reservations.push(...weaken2);

    const grow = reserveDistributed(
        ns,
        tempHosts,
        growScript,
        Math.max(1, plan.growThreads),
        target,
        plan.growDelay + batchOffset
    );

    if (grow) reservations.push(...grow);

    const hack = reserveDistributed(
        ns,
        tempHosts,
        hackScript,
        Math.max(1, plan.hackThreads),
        target,
        plan.hackDelay + batchOffset
    );

    if (hack) reservations.push(...hack);

    if (reservations.length === 0) return null;

    for (const host of hosts) {
        const updated = tempHosts.find(x => x.host === host.host);
        if (updated) host.freeRam = updated.freeRam;
    }

    return reservations;
}

export function reserveDistributed(ns, hosts, script, threadsNeeded, target, delay) {
    let remaining = threadsNeeded;
    const scriptRam = ns.getScriptRam(script);
    const reservations = [];

    for (const hostInfo of hosts) {
        if (remaining <= 0) break;
        if (!safeServerExists(ns, hostInfo.host)) continue;

        while (remaining > 0) {
            const threads = Math.min(
                remaining,
                maxWorkerThreadsPerProcess,
                Math.floor(hostInfo.freeRam / scriptRam)
            );
            if (threads <= 0) break;

            reservations.push({
                script,
                server: hostInfo.host,
                threads,
                target,
                delay,
            });

            hostInfo.freeRam -= threads * scriptRam;
            remaining -= threads;
        }
    }

    return remaining <= 0 ? reservations : null;
}

export function executeReservations(ns, reservations) {
    for (const job of reservations) {
        if (!safeServerExists(ns, job.server)) return false;

        const pid = ns.exec(job.script, job.server, job.threads, job.target, job.delay);
        if (pid === 0) return false;
    }

    return true;
}
export function getBatchPlan(ns, target, mode, options = {}) {
    if (!isUsableTarget(ns, target)) return null;

    const availableRam = Number(options.availableRam ?? 0);

    if (mode === "exp") {
        return buildBatchPlan(ns, target, mode, expHackPercent, options);
    }

    if (availableRam <= 0) {
        return buildBatchPlan(ns, target, mode, defaultHackPercent, options);
    }

    const candidates = [
        0.10,
        0.05,
        0.025,
        0.01,
        0.005,
        0.0025,
        0.001,
    ];

    for (const percent of candidates) {
        const plan = buildBatchPlan(ns, target, mode, percent, options);
        if (!plan) continue;

        if (plan.totalRam <= availableRam * 0.85) {
            return {
                ...plan,
                adaptive: true,
                availableRam,
                fitRatio: plan.totalRam / Math.max(1, availableRam),
            };
        }
    }

    const smallest = buildBatchPlan(ns, target, mode, 0.001, options);

    if (
        smallest &&
        smallest.totalRam <= availableRam * 0.85
    ) {
        return {
            ...smallest,
            adaptive: true,
            availableRam,
            fitRatio: smallest.totalRam / Math.max(1, availableRam),
        };
    }

    const micro = buildMicroBatchPlan(ns, target, mode, options);

    if (
        micro &&
        micro.totalRam <= availableRam * 0.85
    ) {
        return {
            ...micro,
            adaptive: true,
            availableRam,
            fitRatio: micro.totalRam / Math.max(1, availableRam),
            degraded: true,
        };
    }

    return smallest
        ? {
            ...smallest,
            adaptive: true,
            availableRam,
            fitRatio: smallest.totalRam / Math.max(1, availableRam),
            tooLargeForLane: true,
        }
        : null;
}

function buildBatchPlan(ns, target, mode, hackPercent, options = {}) {
    const threadMath = getThreadMath(
        ns,
        target,
        hackPercent,
        options
    );

    const hackThreads = threadMath.hackThreads;
    const weakenHackThreads = threadMath.weakenHackThreads;
    const growThreads = threadMath.growThreads;
    const weakenGrowThreads = threadMath.weakenGrowThreads;

    const timings = getBatchTimings(ns, target, options);

    const hackTime = timings.hackTime;
    const growTime = timings.growTime;
    const weakenTime = timings.weakenTime;

    const finishHack = weakenTime - batchSpacingMs * 3;
    const finishWeaken1 = weakenTime - batchSpacingMs * 2;
    const finishGrow = weakenTime - batchSpacingMs;
    const finishWeaken2 = weakenTime;

    // ns.print(
    //     `[BATCH PLAN] ${target} | ` +
    //     `source=${threadMath.source} | ` +
    //     `hack=${hackThreads} | ` +
    //     `grow=${growThreads}`
    // );

    return {
        mode,
        hackPercent,
        mathSource: threadMath.source,

        hackThreads,
        weakenHackThreads,
        growThreads,
        weakenGrowThreads,

        hackDelay: Math.max(0, finishHack - hackTime),
        weakenHackDelay: Math.max(0, finishWeaken1 - weakenTime),
        growDelay: Math.max(0, finishGrow - growTime),
        weakenGrowDelay: Math.max(0, finishWeaken2 - weakenTime),

        hackTime,
        growTime,
        weakenTime,

        totalRam:
            hackThreads * ns.getScriptRam(hackScript) +
            weakenHackThreads * ns.getScriptRam(weakenScript) +
            growThreads * ns.getScriptRam(growScript) +
            weakenGrowThreads * ns.getScriptRam(weakenScript),
    };
}

function countActiveWorkerProcesses(ns, hosts) {
    let count = 0;

    for (const host of hosts) {
        try {
            for (const proc of ns.ps(host.host)) {
                if (
                    proc.filename === hackScript ||
                    proc.filename === growScript ||
                    proc.filename === weakenScript
                ) {
                    count++;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    return count;
}

function getBatchTimings(ns, target, options = {}) {
    const formulasUnlocked =
        options.formulasUnlocked === true &&
        !!ns.formulas?.hacking &&
        ns.fileExists("Formulas.exe", "home");

    if (!formulasUnlocked) {
        return {
            source: "legacy",
            hackTime: ns.getHackTime(target),
            growTime: ns.getGrowTime(target),
            weakenTime: ns.getWeakenTime(target),
        };
    }

    try {
        const server = ns.getServer(target);
        const player = ns.getPlayer();

        return {
            source: "formulas",
            hackTime: ns.formulas.hacking.hackTime(server, player),
            growTime: ns.formulas.hacking.growTime(server, player),
            weakenTime: ns.formulas.hacking.weakenTime(server, player),
        };
    } catch {
        return {
            source: "legacy-fallback",
            hackTime: ns.getHackTime(target),
            growTime: ns.getGrowTime(target),
            weakenTime: ns.getWeakenTime(target),
        };
    }
}

function hasFormulas(ns, options = {}) {
    return (
        options.formulasUnlocked === true &&
        ns.fileExists("Formulas.exe", "home") &&
        !!ns.formulas?.hacking
    );
}

function getThreadMath(ns, target, hackPercent, options = {}) {
    if (!hasFormulas(ns, options)) {
        return getLegacyThreadMath(ns, target, hackPercent);
    }

    try {
        return getFormulaThreadMath(ns, target, hackPercent);
    } catch {
        return getLegacyThreadMath(ns, target, hackPercent);
    }
}

function getLegacyThreadMath(ns, target, hackPercent) {
    const maxMoney = safeGetServerMaxMoney(ns, target);
    const hackMoney = maxMoney * hackPercent;

    const hackThreadsRaw = ns.hackAnalyzeThreads(target, hackMoney);
    const hackThreads = Math.max(
        1,
        Math.floor(Number.isFinite(hackThreadsRaw) ? hackThreadsRaw : 1)
    );

    const hackSecurity = ns.hackAnalyzeSecurity(hackThreads, target);
    const weakenHackThreads = Math.max(
        1,
        Math.ceil(hackSecurity / ns.weakenAnalyze(1))
    );

    const growThreadsRaw = ns.growthAnalyze(target, 1 / (1 - hackPercent));
    const growThreads = Math.max(
        1,
        Math.ceil(Number.isFinite(growThreadsRaw) ? growThreadsRaw : 1)
    );

    const growSecurity = ns.growthAnalyzeSecurity(growThreads, target);
    const weakenGrowThreads = Math.max(
        1,
        Math.ceil(growSecurity / ns.weakenAnalyze(1))
    );

    return {
        source: "legacy",
        hackThreads,
        weakenHackThreads,
        growThreads,
        weakenGrowThreads,
    };
}

function getFormulaThreadMath(ns, target, hackPercent) {
    const server = ns.getServer(target);
    const player = ns.getPlayer();

    const moneyMax = Math.max(1, server.moneyMax ?? 1);

    const hackPercentPerThread =
        Math.max(
            0.000001,
            ns.formulas.hacking.hackPercent(server, player)
        );

    const hackThreads = Math.max(
        1,
        Math.floor(hackPercent / hackPercentPerThread)
    );

    const stolenPercent =
        Math.min(0.90, hackThreads * hackPercentPerThread);

    const moneyAfterHack =
        Math.max(1, moneyMax * (1 - stolenPercent));

    const growMultiplier =
        Math.max(
            1.001,
            moneyMax / moneyAfterHack
        );

    server.moneyAvailable = moneyAfterHack;

    const growThreads = Math.max(
        1,
        Math.ceil(
            ns.formulas.hacking.growThreads(
                server,
                player,
                moneyMax,
                1
            )
        )
    );

    const hackSecurity = ns.hackAnalyzeSecurity(hackThreads, target);
    const weakenHackThreads = Math.max(
        1,
        Math.ceil(hackSecurity / ns.weakenAnalyze(1))
    );

    const growSecurity = ns.growthAnalyzeSecurity(growThreads, target);
    const weakenGrowThreads = Math.max(
        1,
        Math.ceil(growSecurity / ns.weakenAnalyze(1))
    );

    return {
        source: "formulas",
        hackThreads,
        weakenHackThreads,
        growThreads,
        weakenGrowThreads,
        hackPercentPerThread,
        stolenPercent,
        growMultiplier,
    };
}

function buildMicroBatchPlan(ns, target, mode, options = {}) {
    const timings = getBatchTimings(ns, target, options);

    const hackThreads = 1;
    const growThreads = 1;

    const hackSecurity = ns.hackAnalyzeSecurity(hackThreads, target);
    const weakenHackThreads = Math.max(
        1,
        Math.ceil(hackSecurity / ns.weakenAnalyze(1))
    );

    const growSecurity = ns.growthAnalyzeSecurity(growThreads, target);
    const weakenGrowThreads = Math.max(
        1,
        Math.ceil(growSecurity / ns.weakenAnalyze(1))
    );

    const hackTime = timings.hackTime;
    const growTime = timings.growTime;
    const weakenTime = timings.weakenTime;

    const finishHack = weakenTime - batchSpacingMs * 3;
    const finishWeaken1 = weakenTime - batchSpacingMs * 2;
    const finishGrow = weakenTime - batchSpacingMs;
    const finishWeaken2 = weakenTime;

    return {
        mode,
        hackPercent: 0,
        mathSource: `micro-${timings.source}`,

        hackThreads,
        weakenHackThreads,
        growThreads,
        weakenGrowThreads,

        hackDelay: Math.max(0, finishHack - hackTime),
        weakenHackDelay: Math.max(0, finishWeaken1 - weakenTime),
        growDelay: Math.max(0, finishGrow - growTime),
        weakenGrowDelay: Math.max(0, finishWeaken2 - weakenTime),

        hackTime,
        growTime,
        weakenTime,

        microBatch: true,

        totalRam:
            hackThreads * ns.getScriptRam(hackScript) +
            weakenHackThreads * ns.getScriptRam(weakenScript) +
            growThreads * ns.getScriptRam(growScript) +
            weakenGrowThreads * ns.getScriptRam(weakenScript),
    };
}
