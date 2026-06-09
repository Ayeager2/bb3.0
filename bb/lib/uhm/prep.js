// /lib/uhm/prep.js
import {
    growScript,
    maxPrepThreadsPerProcess,
    weakenScript,
} from "/lib/uhm/config.js";

import {
    safeServerExists,
    isUsableTarget,
    safeGetServerMaxMoney,
    safeGetServerMoneyAvailable,
    safeGetServerSecurityLevel,
    safeGetServerMinSecurityLevel,
} from "/lib/uhm/safe.js";

export function prepTarget(ns, target, hosts) {
    if (!isUsableTarget(ns, target)) return;

    const money = safeGetServerMoneyAvailable(ns, target);
    const maxMoney = safeGetServerMaxMoney(ns, target);
    const sec = safeGetServerSecurityLevel(ns, target);
    const minSec = safeGetServerMinSecurityLevel(ns, target);

    if (sec > minSec + 2) {
        runBestEffortWeaken(ns, target, hosts, sec, minSec);
        return;
    }

    if (money < maxMoney * 0.90) {
        runBestEffortGrow(ns, target, hosts, money, maxMoney);
    }
}

function runBestEffortWeaken(ns, target, hosts, sec, minSec) {
    const neededThreads = Math.max(
        1,
        Math.ceil((sec - minSec) / ns.weakenAnalyze(1))
    );

    const maxThreads = getAvailableThreads(ns, hosts, weakenScript);
    const threads = Math.min(neededThreads, maxThreads);

    if (threads <= 0) return false;

    return runDistributed(ns, weakenScript, threads, hosts, target, 0);
}

function runBestEffortGrow(ns, target, hosts, money, maxMoney) {
    const growThreadsRaw = ns.growthAnalyze(
        target,
        maxMoney / Math.max(1, money)
    );

    const neededGrowThreads = Math.max(
        1,
        Math.ceil(Number.isFinite(growThreadsRaw) ? growThreadsRaw : 1)
    );

    const maxGrowThreads = getAvailableThreads(ns, hosts, growScript);
    const growThreads = Math.min(neededGrowThreads, maxGrowThreads);

    if (growThreads <= 0) return false;

    const launchedGrow = runDistributed(
        ns,
        growScript,
        growThreads,
        hosts,
        target,
        0
    );

    if (!launchedGrow) return false;

    const weakenNeeded = Math.max(
        1,
        Math.ceil(
            ns.growthAnalyzeSecurity(growThreads, target) /
            ns.weakenAnalyze(1)
        )
    );

    const maxWeakenThreads = getAvailableThreads(ns, hosts, weakenScript);
    const weakenThreads = Math.min(weakenNeeded, maxWeakenThreads);

    if (weakenThreads > 0) {
        runDistributed(
            ns,
            weakenScript,
            weakenThreads,
            hosts,
            target,
            100
        );
    }

    return true;
}

function getAvailableThreads(ns, hosts, script) {
    const scriptRam = ns.getScriptRam(script);

    if (scriptRam <= 0) return 0;

    return hosts.reduce(
        (sum, hostInfo) =>
            sum + Math.floor(Math.max(0, hostInfo.freeRam ?? 0) / scriptRam),
        0
    );
}

export function runDistributed(ns, script, threadsNeeded, hosts, target, delay) {
    let remaining = threadsNeeded;
    const scriptRam = ns.getScriptRam(script);

    for (const hostInfo of hosts) {
        if (remaining <= 0) return true;
        if (!safeServerExists(ns, hostInfo.host)) continue;

        while (remaining > 0) {
            const threads = Math.min(
                remaining,
                maxPrepThreadsPerProcess,
                Math.floor(Math.max(0, hostInfo.freeRam ?? 0) / scriptRam)
            );

            if (threads <= 0) break;

            const pid = ns.exec(script, hostInfo.host, threads, target, delay);

            if (pid === 0) break;

            hostInfo.freeRam -= threads * scriptRam;
            remaining -= threads;
        }
    }

    return remaining <= 0;
}

export function isPrepared(ns, target) {
    if (!isUsableTarget(ns, target)) return false;

    const sec = safeGetServerSecurityLevel(ns, target);
    const minSec = safeGetServerMinSecurityLevel(ns, target);
    const money = safeGetServerMoneyAvailable(ns, target);
    const maxMoney = safeGetServerMaxMoney(ns, target);

    return (
        sec <= minSec + 2 &&
        money >= maxMoney * 0.90
    );
}
