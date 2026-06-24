import { homeReserveRam, maxExpThreadsPerProcess } from "/lib/uhm/config.js";
import { safeServerExists, isUsableTarget } from "/lib/uhm/safe.js";

const EXP_HACK = "/workers/exp-hack.js";
const EXP_GROW = "/workers/exp-grow.js";
const EXP_WEAKEN = "/workers/exp-weaken.js";

const DEFAULT_MAX_THREADS_PER_PROCESS = maxExpThreadsPerProcess;
const DEFAULT_MAX_PROCESSES_PER_HOST = 7500;

export function runExpSprint(ns, target, hosts, options = {}) {
    const maxProcesses = options.maxProcesses ?? 100000;
    const maxThreadsPerProcess =
        options.maxThreadsPerProcess ?? DEFAULT_MAX_THREADS_PER_PROCESS;
    const maxProcessesPerHost =
        options.maxProcessesPerHost ?? DEFAULT_MAX_PROCESSES_PER_HOST;

    const reserveHomeRam = options.homeReserveRam ?? homeReserveRam;
    const purpose = options.purpose ?? "background";

    if (!isUsableTarget(ns, target)) {
        return result("INVALID_TARGET", 0, 0, 0, { ns, target });
    }

    const cycle = buildSprintCycle(ns, target, purpose, maxThreadsPerProcess);
    for (const host of hosts) {
        if (!safeServerExists(ns, host.host)) continue;
        stopStaleSprintWorkers(ns, host.host, target, cycle);
    }

    const active = countActiveSprintWorkers(ns, hosts);

    let launched = 0;
    let threads = 0;
    const launchedByRole = emptyRoleCounts();
    const roleBalance = mergeRoleCounts(active.byRole, launchedByRole);
    const targetRoleRatios = getRoleRatios(cycle);

    for (const host of hosts) {
        if (active.processes + launched >= maxProcesses) break;
        if (!safeServerExists(ns, host.host)) continue;

        const hostActive = countActiveSprintWorkersOnHost(ns, host.host);
        if (hostActive.processes >= maxProcessesPerHost) continue;

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
            maxProcessesRemaining: maxProcesses - active.processes - launched,
            maxProcessesForHost: maxProcessesPerHost - hostActive.processes,
            roleBalance,
            targetRoleRatios,
        });

        launched += launchResult.launched;
        threads += launchResult.threads;
        addRoleCounts(launchedByRole, launchResult.byRole);
    }

    const totalByRole = mergeRoleCounts(active.byRole, launchedByRole);

    return result(
        launched > 0 ? "EXP_SPRINT" : active.processes > 0 ? "EXP_RUNNING" : "NO_RAM",
        launched,
        threads,
        active.processes + launched,
        {
            ns,
            engine: "hgw-sprint",
            growRatio: getRoleThreadRatio(totalByRole, "grow"),
            target,
            maxProcesses,
            maxThreadsPerProcess,
            maxProcessesPerHost,
            purpose,
            activeThreads: active.threads,
            totalThreads: active.threads + threads,
            activeByRole: active.byRole,
            launchedByRole,
            totalByRole,
            cycle: summarizeCycle(cycle),
        }
    );
}

function getRoleThreadRatio(roleCounts, role) {
    const total =
        Object.values(roleCounts ?? {})
            .reduce((sum, item) => sum + (Number(item?.threads) || 0), 0);

    if (total <= 0) return 0;
    return (Number(roleCounts?.[role]?.threads) || 0) / total;
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

    if (purpose === "leveling") {
        return buildLevelingCycle({
            ns,
            target,
            maxThreadsPerProcess,
            moneyRatio,
            securityGap,
            hackPercent,
            weakenPerThread,
        });
    }

    const stealFraction = chooseStealFraction(purpose, moneyRatio, securityGap);
    const repairMode = shouldRepairExpTarget(moneyRatio, securityGap);
    const hackThreads = repairMode
        ? 0
        : clampThreads(Math.floor(stealFraction / hackPercent), maxThreadsPerProcess);
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
    ].filter(item => item.threads > 0);
}

function buildLevelingCycle({
    ns,
    target,
    maxThreadsPerProcess,
    moneyRatio,
    securityGap,
    hackPercent,
    weakenPerThread,
}) {
    const baseUnit =
        getLevelingUnitSize(ns);
    const targetSecurityDelta =
        getLevelingSecurityTarget(ns);
    const shouldHack =
        moneyRatio >= 0.65 &&
        securityGap <= targetSecurityDelta * 2;
    const hackThreads = shouldHack
        ? clampThreads(Math.floor(0.01 / hackPercent), Math.min(maxThreadsPerProcess, baseUnit))
        : 0;
    const growThreads = clampThreads(
        shouldHack ? baseUnit * 2 : baseUnit * 3,
        maxThreadsPerProcess
    );
    const generatedSecurity =
        hackThreads * 0.002 +
        growThreads * 0.004;
    const repairSecurity =
        Math.max(0, securityGap - targetSecurityDelta);
    const weakenThreads = clampThreads(
        Math.ceil((generatedSecurity + repairSecurity) / weakenPerThread),
        maxThreadsPerProcess
    );

    return [
        { script: EXP_HACK, role: "hack", threads: hackThreads },
        { script: EXP_GROW, role: "grow", threads: growThreads },
        { script: EXP_WEAKEN, role: "weaken", threads: weakenThreads },
    ].filter(item => item.threads > 0);
}

function getLevelingUnitSize(ns) {
    const homeRam = safeHomeRam(ns);

    if (homeRam < 128) return 8;
    if (homeRam < 512) return 16;
    if (homeRam < 4096) return 32;
    if (homeRam < 65536) return 64;

    return 128;
}

function getLevelingSecurityTarget(ns) {
    const hacking = safeHacking(ns);

    if (hacking < 250) return 25;
    if (hacking < 750) return 35;
    if (hacking < 1500) return 45;

    return 60;
}

function chooseStealFraction(purpose, moneyRatio, securityGap) {
    if (securityGap > 10 || moneyRatio < 0.35) return 0.01;
    if (purpose === "leveling") return 0.025;
    return 0.05;
}

function safeHomeRam(ns) {
    try {
        return ns.getServerMaxRam("home");
    } catch {
        return 64;
    }
}

function safeHacking(ns) {
    try {
        return ns.getHackingLevel();
    } catch {
        return 1;
    }
}

function shouldRepairExpTarget(moneyRatio, securityGap) {
    return securityGap > 12 || moneyRatio < 0.30;
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
    maxThreadsPerProcess,
    maxProcessesRemaining,
    maxProcessesForHost,
    roleBalance,
    targetRoleRatios,
}) {
    let launched = 0;
    let threads = 0;
    let remainingRam = freeRam;
    const byRole = emptyRoleCounts();

    while (
        remainingRam > 0 &&
        launched < maxProcessesRemaining &&
        launched < maxProcessesForHost
    ) {
        const batch = chooseNextBatch(cycle, roleBalance, targetRoleRatios);
        const script = batch.script;
        const scriptRam = ns.getScriptRam(script, host);
        if (scriptRam <= 0 || remainingRam < scriptRam) break;

        const possibleThreads = Math.floor(remainingRam / scriptRam);
        const threadCount = chooseLogicalThreadCount(
            possibleThreads,
            batch.threads,
            maxThreadsPerProcess
        );

        if (threadCount <= 0) break;

        const pid = ns.exec(script, host, threadCount, target, batch.role, launched);

        if (pid === 0) break;

        launched++;
        threads += threadCount;
        byRole[batch.role].processes++;
        byRole[batch.role].threads += threadCount;
        roleBalance[batch.role].processes++;
        roleBalance[batch.role].threads += threadCount;
        remainingRam -= threadCount * scriptRam;
    }

    return { launched, threads, byRole };
}

function chooseNextBatch(cycle, roleBalance, targetRoleRatios) {
    if (cycle.length <= 1) return cycle[0];

    const totalThreads =
        Object.values(roleBalance)
            .reduce((sum, item) => sum + (Number(item?.threads) || 0), 0);

    return [...cycle].sort((a, b) => {
        const aDeficit = getRoleDeficit(a.role, totalThreads, roleBalance, targetRoleRatios);
        const bDeficit = getRoleDeficit(b.role, totalThreads, roleBalance, targetRoleRatios);

        if (bDeficit !== aDeficit) return bDeficit - aDeficit;
        return (b.threads ?? 0) - (a.threads ?? 0);
    })[0];
}

function getRoleDeficit(role, totalThreads, roleBalance, targetRoleRatios) {
    const current = Number(roleBalance?.[role]?.threads) || 0;
    const ratio = Number(targetRoleRatios?.[role]) || 0;
    const desired = Math.max(1, totalThreads * ratio);

    return desired - current;
}

function getRoleRatios(cycle) {
    const totals = emptyRoleCounts();
    let totalThreads = 0;

    for (const item of cycle) {
        const threads = Math.max(1, Number(item.threads) || 1);
        totals[item.role].threads += threads;
        totalThreads += threads;
    }

    const ratios = {};
    for (const role of Object.keys(totals)) {
        ratios[role] =
            totalThreads > 0
                ? totals[role].threads / totalThreads
                : 0;
    }

    return ratios;
}

function chooseLogicalThreadCount(possibleThreads, baseThreads, maxThreadsPerProcess) {
    const unitThreads = Math.max(1, Number(baseThreads) || 1);
    const processCap = Math.max(unitThreads, Number(maxThreadsPerProcess) || unitThreads);
    const available = Math.min(possibleThreads, processCap);

    if (available < unitThreads) {
        return Math.max(0, Math.floor(available));
    }

    const units = Math.max(1, Math.floor(available / unitThreads));

    return unitThreads * units;
}

function stopStaleSprintWorkers(ns, host, target, cycle) {
    const desiredScripts = new Set(cycle.map(item => normalizeScript(item.script)));
    const expScripts = new Set([
        normalizeScript(EXP_HACK),
        normalizeScript(EXP_GROW),
        normalizeScript(EXP_WEAKEN),
    ]);
    const procs = ns.ps(host).filter(proc => expScripts.has(normalizeScript(proc.filename)));
    const staleProcs = procs.filter(proc => {
        const script = normalizeScript(proc.filename);
        const procTarget = String(proc.args?.[0] ?? "");
        return procTarget !== target || !desiredScripts.has(script);
    });

    for (const proc of staleProcs) {
        try {
            ns.kill(proc.pid);
        } catch {
            // Ignore races with completed processes.
        }
    }

    const currentTargetProcs = procs.filter(proc => {
        const script = normalizeScript(proc.filename);
        return (
            String(proc.args?.[0] ?? "") === target &&
            desiredScripts.has(script)
        );
    });
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
    let processes = 0;
    let threads = 0;
    const byRole = emptyRoleCounts();

    for (const host of hosts) {
        const hostCount = countActiveSprintWorkersOnHost(ns, host.host);
        processes += hostCount.processes;
        threads += hostCount.threads;
        addRoleCounts(byRole, hostCount.byRole);
    }

    return { processes, threads, byRole };
}

function countActiveSprintWorkersOnHost(ns, host) {
    try {
        const procs = ns.ps(host).filter(p =>
            sameScript(p.filename, EXP_HACK) ||
            sameScript(p.filename, EXP_GROW) ||
            sameScript(p.filename, EXP_WEAKEN)
        );

        const byRole = emptyRoleCounts();

        for (const proc of procs) {
            const role = getProcessRole(proc);
            byRole[role].processes++;
            byRole[role].threads += Number(proc.threads) || 0;
        }

        return {
            processes: procs.length,
            threads: procs.reduce((sum, proc) => sum + (Number(proc.threads) || 0), 0),
            byRole,
        };
    } catch {
        return { processes: 0, threads: 0, byRole: emptyRoleCounts() };
    }
}

function result(status, launched, threads, activeProcesses, extra = {}) {
    const ns = extra.ns;
    const target = extra.target;
    const totalByRole = extra.totalByRole ?? {};
    const expPerAction = ns && target ? estimateHackExp(ns, target) : 0;
    const expPerSecond = ns && target
        ? estimateCycleExpPerSecond(ns, target, totalByRole, expPerAction)
        : 0;
    const { ns: _ns, ...publicExtra } = extra;

    return {
        status,
        launched,
        threads,
        activeProcesses,
        expPerAction,
        expPerSecond,
        ...publicExtra,
    };
}

function estimateHackExp(ns, target) {
    try {
        if (ns.formulas?.hacking?.hackExp) {
            return Math.max(0, ns.formulas.hacking.hackExp(ns.getServer(target), ns.getPlayer()));
        }
    } catch {
        // Fall through to the approximation below.
    }

    try {
        return 3 + Math.max(1, ns.getServerMinSecurityLevel(target)) * 0.3;
    } catch {
        return 0;
    }
}

function estimateCycleExpPerSecond(ns, target, byRole, expPerAction) {
    if (!expPerAction || !target) return 0;

    const hackThreads = Number(byRole.hack?.threads) || 0;
    const growThreads = Number(byRole.grow?.threads) || 0;
    const weakenThreads = Number(byRole.weaken?.threads) || 0;
    const hackChance = safeHackChance(ns, target);

    return (
        (hackThreads * expPerAction * Math.max(0.25, hackChance)) / safeSeconds(ns, "hack", target) +
        (growThreads * expPerAction) / safeSeconds(ns, "grow", target) +
        (weakenThreads * expPerAction) / safeSeconds(ns, "weaken", target)
    );
}

function safeHackChance(ns, target) {
    try {
        return Math.max(0.01, ns.hackAnalyzeChance(target));
    } catch {
        return 0.25;
    }
}

function safeSeconds(ns, type, target) {
    try {
        if (type === "hack") return Math.max(1, ns.getHackTime(target) / 1000);
        if (type === "grow") return Math.max(1, ns.getGrowTime(target) / 1000);
        return Math.max(1, ns.getWeakenTime(target) / 1000);
    } catch {
        return 1;
    }
}

function sameScript(a, b) {
    return normalizeScript(a) === normalizeScript(b);
}

function normalizeScript(path) {
    return String(path ?? "").replace(/^\/+/, "");
}

function getProcessRole(proc) {
    const argRole = String(proc.args?.[1] ?? "");
    if (argRole === "hack" || argRole === "grow" || argRole === "weaken") return argRole;

    const script = normalizeScript(proc.filename);
    if (sameScript(script, EXP_HACK)) return "hack";
    if (sameScript(script, EXP_GROW)) return "grow";
    if (sameScript(script, EXP_WEAKEN)) return "weaken";

    return "unknown";
}

function summarizeCycle(cycle) {
    return Object.fromEntries(
        cycle.map(item => [item.role, item.threads])
    );
}

function emptyRoleCounts() {
    return {
        hack: { processes: 0, threads: 0 },
        grow: { processes: 0, threads: 0 },
        weaken: { processes: 0, threads: 0 },
        unknown: { processes: 0, threads: 0 },
    };
}

function addRoleCounts(target, source = {}) {
    for (const role of Object.keys(target)) {
        target[role].processes += Number(source[role]?.processes) || 0;
        target[role].threads += Number(source[role]?.threads) || 0;
    }
}

function mergeRoleCounts(a = {}, b = {}) {
    const result = emptyRoleCounts();
    addRoleCounts(result, a);
    addRoleCounts(result, b);
    return result;
}
