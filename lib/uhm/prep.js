//prep.js
import {
    growScript,
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

    if (sec > minSec + 1) {
        const threads = Math.ceil((sec - minSec) / ns.weakenAnalyze(1));
        runDistributed(ns, weakenScript, threads, hosts, target, 0);
        return;
    }

    if (money < maxMoney * 0.99) {
        const growThreadsRaw = ns.growthAnalyze(target, maxMoney / Math.max(1, money));
        const growThreads = Math.max(1, Math.ceil(Number.isFinite(growThreadsRaw) ? growThreadsRaw : 1));
        const weakenThreads = Math.max(1, Math.ceil(ns.growthAnalyzeSecurity(growThreads, target) / ns.weakenAnalyze(1)));

        runDistributed(ns, growScript, growThreads, hosts, target, 0);
        runDistributed(ns, weakenScript, weakenThreads, hosts, target, 100);
    }
}

export function runDistributed(ns, script, threadsNeeded, hosts, target, delay) {
    let remaining = threadsNeeded;
    const scriptRam = ns.getScriptRam(script);

    for (const hostInfo of hosts) {
        if (remaining <= 0) return true;
        if (!safeServerExists(ns, hostInfo.host)) continue;

        const threads = Math.min(remaining, Math.floor(hostInfo.freeRam / scriptRam));
        if (threads <= 0) continue;

        const pid = ns.exec(script, hostInfo.host, threads, target, delay);

        if (pid !== 0) {
            hostInfo.freeRam -= threads * scriptRam;
            remaining -= threads;
        }
    }

    return remaining <= 0;
}

export function isPrepared(ns, target) {
    if (!isUsableTarget(ns, target)) return false;

    return (
        safeGetServerSecurityLevel(ns, target) <= safeGetServerMinSecurityLevel(ns, target) + 1 &&
        safeGetServerMoneyAvailable(ns, target) >= safeGetServerMaxMoney(ns, target) * 0.99
    );
}