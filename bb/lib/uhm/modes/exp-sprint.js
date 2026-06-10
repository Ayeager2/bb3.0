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

    const cycle = buildSprintCycle(ns, target, purpose, maxThreadsPerProcess);
    for (const host of hosts) {
        if (!safeServerExists(ns, host.host)) continue;
        stopStaleSprintWorkers(ns, host.host, target, cycle);
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

        const launchResult = launchChunks(ns, {
            host: host.host,
            target,
            cycle,
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
            engine: "hgw-sprint",
            growRatio: 0,
            target,
            maxProcesses,
            maxThreadsPerProcess,
            maxProcessesPerHost,
            purpose,
        }
    );
}

function buildSprintCycle(ns, target, purpose = "background", maxThreadsPerProcess = DEFAULT_MAX_THREADS_PER_PROCESS) {
    const money = ns.getServerMoneyAvailable(target);
    const maxMoney = Math.max(1, ns.getServerMaxMoney(target));
    const sec = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);
    const moneyRatio = money / maxMoney;
    const securityGap = sec - minSec;
    const hackPercent = Math.max(0.0001, ns.hackAnalyze(target));
    const weakenPerThread = Math.max(0.0001, ns.weakenAnalyze(1));
    const stealFraction = chooseStealFraction(purpose, moneyRatio, securityGap);
    const hackThreads = clampThreads(Math.floor(stealFraction / hackPercent), maxThreadsPerProcess);
    const growMultiplier = Math.max(1.02, 1 / Math.max(0.05, 1 - (hackThreads * hackPercent)));
    const repairGrowThreads = clampThreads(Math.ceil(safeGrowthAnalyze(ns, target, growMultiplier)), maxThreadsPerProcess);
    const prepGrowThreads = moneyRatio < 0.85
        ? clampThreads(Math.ceil(safeGrowthAnalyze(ns, target, Math.max(1.1, 0.9 / Math.max(0.01, moneyRatio)))), maxThreadsPerProcess)
        : 0;
    const growThreads = clampThreads(repairGrowThreads + prepGrowThreads, maxThreadsPerProcess);
    const hackSecurity = hackThreads * 0.002;
    const growSecurity = growThreads * 0.004;
    const prepSecurity = Math.max(0, securityGap - 3);
    const weakenThreads = clampThreads(Math.ceil((hackSecurity + growSecurity + prepSecurity) / weakenPerThread), maxThreadsPerProcess);

    return [
        { script: EXP_HACK, role: "hack", threads: hackThreads },
        { script: EXP_GROW, role: "grow", threads: growThreads },
        { script: EXP_WEAKEN, role: "weaken", threads: weakenThreads },
    ];
}

function chooseStealFraction(purpose, moneyRatio, securityGap) {
    if (securityGap > 10 || moneyRatio < 0.35) return 0.01;
    if (purpose === "leveling") return 0.025;
    return 0.05;
}

function safeGrowthAnalyze(ns, target, multiplier) {
    try {
        const threads = ns.growthAnalyze(target, multiplier);
        return Number.isFinite(threads) ? threads : 1;
    } catch {
        return 1;
    }
}

function clampThreads(threads, maxThreadsPerProcess) {
    return Math.max(1, Math.min(maxThreadsPerProcess, Number(threads) || 1));
}

function launchChunks(ns, {
    host,
    target,
    cycle,
    freeRam,
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
        const batch = cycle[launched % cycle.length];
        const script = batch.script;
        const scriptRam = ns.getScriptRam(script, host);
        if (scriptRam <= 0 || remainingRam < scriptRam) break;

        const possibleThreads = Math.floor(remainingRam / scriptRam);
        const threadCount = Math.min(possibleThreads, batch.threads);

        if (threadCount <= 0) break;

        const pid = ns.exec(script, host, threadCount, target, batch.role, launched);

        if (pid === 0) break;

        launched++;
        threads += threadCount;
        remainingRam -= threadCount * scriptRam;
    }

    return { launched, threads };
}

function stopStaleSprintWorkers(ns, host, target, cycle) {
    const desiredScripts = new Set(cycle.map(item => normalizeScript(item.script)));
    const procs = ns.ps(host).filter(proc => desiredScripts.has(normalizeScript(proc.filename)));
    const staleTargetProcs = procs.filter(proc => String(proc.args?.[0] ?? "") !== target);
    for (const proc of staleTargetProcs) {
        try {
            ns.kill(proc.pid);
        } catch {
            // Ignore races with completed processes.
        }
    }

    const currentTargetProcs = procs.filter(proc => String(proc.args?.[0] ?? "") === target);
    if (currentTargetProcs.length < 3) return;

    const byScript = new Map();
    for (const proc of currentTargetProcs) {
        const script = normalizeScript(proc.filename);
        byScript.set(script, [...(byScript.get(script) ?? []), proc]);
    }

    const dominant = [...byScript.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    const singleRole = byScript.size === 1;
    const dominated = dominant.length >= 6 && dominant.length / currentTargetProcs.length > 0.85;
    if (!singleRole && !dominated) return;

    const killCount = singleRole ? dominant.length : Math.ceil(dominant.length / 2);
    for (const proc of dominant.slice(0, killCount)) {
        try {
            ns.kill(proc.pid);
        } catch {
            // Ignore races with completed processes.
        }
    }
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
    return normalizeScript(a) === normalizeScript(b);
}

function normalizeScript(path) {
    return String(path ?? "").replace(/^\/+/, "");
}
