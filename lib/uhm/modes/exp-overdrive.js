import { homeReserveRam } from "/lib/uhm/config.js";
import { safeServerExists, isUsableTarget } from "/lib/uhm/safe.js";

const EXP_WEAKEN = "/workers/exp-weaken.js";
const EXP_GROW = "/workers/exp-grow.js";

export function runExpOverdrive(ns, target, hosts, options = {}) {
    if (!isUsableTarget(ns, target)) {
        return result("INVALID_TARGET", 0, 0, 0);
    }

    const maxProcesses = options.maxProcesses ?? 100;
    const growRatio = options.growRatio ?? 0.15;
    const reserveHomeRam = options.homeReserveRam ?? homeReserveRam;

    const active = countActiveExpWorkers(ns, hosts);

    if (active >= maxProcesses) {
        return result("PROCESS_CAP", 0, 0, active);
    }

    let launched = 0;
    let threads = 0;

    for (const host of hosts) {
        if (launched >= maxProcesses) break;
        if (!safeServerExists(ns, host.host)) continue;

        const script = Math.random() < growRatio ? EXP_GROW : EXP_WEAKEN;

        if (isExpWorkerRunning(ns, host.host, target)) continue;

        const maxRam = ns.getServerMaxRam(host.host);
        const usedRam = ns.getServerUsedRam(host.host);
        const reserve = host.host === "home" ? reserveHomeRam : 0;
        const freeRam = Math.max(0, maxRam - usedRam - reserve);
        const scriptRam = ns.getScriptRam(script, host.host);

        if (scriptRam <= 0 || freeRam < scriptRam) continue;

        const threadCount = Math.floor(freeRam / scriptRam);
        if (threadCount <= 0) continue;

        const pid = ns.exec(script, host.host, threadCount, target);
        if (pid === 0) continue;

        launched++;
        threads += threadCount;
    }

    return result(launched > 0 ? "EXP_OVERDRIVE" : "NO_RAM", launched, threads, active + launched);
}

function isExpWorkerRunning(ns, host, target) {
    try {
        return ns.ps(host).some(p =>
            (p.filename === EXP_WEAKEN || p.filename === EXP_GROW) &&
            String(p.args?.[0] ?? "") === target
        );
    } catch {
        return false;
    }
}

function countActiveExpWorkers(ns, hosts) {
    let count = 0;

    for (const host of hosts) {
        try {
            count += ns.ps(host.host).filter(p =>
                p.filename === EXP_WEAKEN ||
                p.filename === EXP_GROW
            ).length;
        } catch { }
    }

    return count;
}

function result(status, launched, threads, activeProcesses) {
    return { status, launched, threads, activeProcesses };
}