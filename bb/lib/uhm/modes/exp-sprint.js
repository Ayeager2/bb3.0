import { homeReserveRam } from "/lib/uhm/config.js";
import { safeServerExists, isUsableTarget } from "/lib/uhm/safe.js";

const EXP_HACK = "/workers/exp-hack.js";
const EXP_GROW = "/workers/exp-grow.js";
const EXP_WEAKEN = "/workers/exp-weaken.js";

const DEFAULT_MAX_THREADS_PER_PROCESS = 1000;
const DEFAULT_MAX_PROCESSES_PER_HOST = 5000;

export function runExpSprint(ns, target, hosts, options = {}) {
    const maxProcesses = options.maxProcesses ?? 100000;
    const maxThreadsPerProcess =
        options.maxThreadsPerProcess ?? DEFAULT_MAX_THREADS_PER_PROCESS;
    const maxProcessesPerHost =
        options.maxProcessesPerHost ?? DEFAULT_MAX_PROCESSES_PER_HOST;

    const reserveHomeRam = options.homeReserveRam ?? homeReserveRam;
    const purpose = options.purpose ?? "background";

    if (!isUsableTarget(ns, target)) {
        return result("INVALID_TARGET", 0, 0, 0, { target });
    }

    const active = countActiveSprintWorkers(ns, hosts);

    let launched = 0;
    let threads = 0;

    for (const host of hosts) {
        if (active + launched >= maxProcesses) break;
        if (!safeServerExists(ns, host.host)) continue;

        const hostActive = countActiveSprintWorkersOnHost(ns, host.host);
        if (hostActive >= maxProcessesPerHost) continue;

        const maxRam = ns.getServerMaxRam(host.host);
        const usedRam = ns.getServerUsedRam(host.host);
        const reserve = host.host === "home" ? reserveHomeRam : 0;
        const freeRam = Math.max(0, maxRam - usedRam - reserve);

        if (freeRam <= 0) continue;

        const script = chooseSprintScript(ns, target, purpose);

        const launchResult = launchChunks(ns, {
            host: host.host,
            target,
            script,
            freeRam,
            maxThreadsPerProcess,
            maxProcessesRemaining: maxProcesses - active - launched,
            maxProcessesForHost: maxProcessesPerHost - hostActive,
        });

        launched += launchResult.launched;
        threads += launchResult.threads;
    }

    return result(
        launched > 0 ? "EXP_SPRINT" : active > 0 ? "EXP_RUNNING" : "NO_RAM",
        launched,
        threads,
        active + launched,
        {
            engine: "hack-sprint",
            growRatio: 0,
            target,
            maxProcesses,
            maxThreadsPerProcess,
            maxProcessesPerHost,
            purpose,
        }
    );
}

function chooseSprintScript(ns, target, purpose = "background") {
    // if (purpose === "leveling") return EXP_HACK;

    const money = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const sec = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);

    if (sec > minSec + 8) return EXP_WEAKEN;
    if (maxMoney > 0 && money < maxMoney * 0.25) return EXP_GROW;

    return EXP_HACK;
}

function launchChunks(ns, {
    host,
    target,
    script,
    freeRam,
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

    return { launched, threads };
}

function countActiveSprintWorkers(ns, hosts) {
    let count = 0;

    for (const host of hosts) {
        count += countActiveSprintWorkersOnHost(ns, host.host);
    }

    return count;
}

function countActiveSprintWorkersOnHost(ns, host) {
    try {
        return ns.ps(host).filter(p =>
            sameScript(p.filename, EXP_HACK) ||
            sameScript(p.filename, EXP_GROW) ||
            sameScript(p.filename, EXP_WEAKEN)
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
