import {
    expGrowScript,
    expWeakenScript,
    homeReserveRam,
    maxExpThreadsPerProcess,
} from "/lib/uhm/config.js";
import { safeServerExists, isUsableTarget } from "/lib/uhm/safe.js";

// Legacy EXP engine. runner.js now uses exp-sprint.js so EXP always runs
// balanced hack/grow/weaken workers instead of weaken/grow-only saturation.
const DEFAULT_MAX_THREADS_PER_PROCESS = maxExpThreadsPerProcess;
const DEFAULT_MAX_PROCESSES_PER_HOST = 5000;

export function runExpOverdrive(ns, target, hosts, options = {}) {
    const maxProcesses = options.maxProcesses ?? 100;
    const maxThreadsPerProcess =
        options.maxThreadsPerProcess ?? DEFAULT_MAX_THREADS_PER_PROCESS;
    const maxProcessesPerHost =
        options.maxProcessesPerHost ?? DEFAULT_MAX_PROCESSES_PER_HOST;

    const growRatio = options.growRatio ?? 0.15;
    const reserveHomeRam = options.homeReserveRam ?? homeReserveRam;

    if (!isUsableTarget(ns, target)) {
        return result("INVALID_TARGET", 0, 0, 0, {
            target,
            maxProcesses,
            maxThreadsPerProcess,
            maxProcessesPerHost,
            growRatio,
        });
    }

    const active = countActiveExpWorkers(ns, hosts);

    if (active >= maxProcesses) {
        return result("PROCESS_CAP", 0, 0, active, {
            target,
            maxProcesses,
            maxThreadsPerProcess,
            maxProcessesPerHost,
            growRatio,
        });
    }

    let launched = 0;
    let threads = 0;

    for (const host of hosts) {
        if (active + launched >= maxProcesses) break;
        if (!safeServerExists(ns, host.host)) continue;

        const hostActive = countActiveExpWorkersOnHost(ns, host.host);

        if (hostActive >= maxProcessesPerHost) continue;

        const maxRam = ns.getServerMaxRam(host.host);
        const usedRam = ns.getServerUsedRam(host.host);
        const reserve = host.host === "home" ? reserveHomeRam : 0;
        const freeRam = Math.max(0, maxRam - usedRam - reserve);

        if (freeRam <= 0) continue;

        const launchResult = launchChunkedExpWorkers(ns, {
            host: host.host,
            target,
            freeRam,
            growRatio,
            maxThreadsPerProcess,
            maxProcessesRemaining: maxProcesses - active - launched,
            maxProcessesForHost: maxProcessesPerHost - hostActive,
        });

        launched += launchResult.launched;
        threads += launchResult.threads;
    }

    const status =
        launched > 0
            ? "EXP_OVERDRIVE"
            : active > 0
                ? "EXP_RUNNING"
                : "NO_RAM";

    return result(
        status,
        launched,
        threads,
        active + launched,
        {
            target,
            maxProcesses,
            maxThreadsPerProcess,
            maxProcessesPerHost,
            growRatio,
        }
    );
}

function launchChunkedExpWorkers(ns, {
    host,
    target,
    freeRam,
    growRatio,
    maxThreadsPerProcess,
    maxProcessesRemaining,
    maxProcessesForHost,
}) {
    let launched = 0;
    let threads = 0;
    let remainingRam = freeRam;

    while (
        remainingRam > 0 &&
        launched < maxProcessesRemaining &&
        launched < maxProcessesForHost
    ) {
        const script = Math.random() < growRatio ? expGrowScript : expWeakenScript;
        const scriptRam = ns.getScriptRam(script, host);

        if (scriptRam <= 0 || remainingRam < scriptRam) break;

        const possibleThreads = Math.floor(remainingRam / scriptRam);
        const threadCount = Math.min(possibleThreads, maxThreadsPerProcess);

        if (threadCount <= 0) break;

        const pid = ns.exec(script, host, threadCount, target, launched);

        if (pid === 0) break;

        launched++;
        threads += threadCount;
        remainingRam -= threadCount * scriptRam;
    }

    return {
        launched,
        threads,
    };
}

function countActiveExpWorkers(ns, hosts) {
    let count = 0;

    for (const host of hosts) {
        count += countActiveExpWorkersOnHost(ns, host.host);
    }

    return count;
}

function countActiveExpWorkersOnHost(ns, host) {
    try {
        return ns.ps(host).filter(p =>
            sameScript(p.filename, expWeakenScript) ||
            sameScript(p.filename, expGrowScript)
        ).length;
    } catch {
        return 0;
    }
}

function result(status, launched, threads, activeProcesses, extra = {}) {
    return {
        status,
        launched,
        threads,
        activeProcesses,
        ...extra,
    };
}

function sameScript(a, b) {
    return String(a ?? "").replace(/^\/+/, "") ===
        String(b ?? "").replace(/^\/+/, "");
}
