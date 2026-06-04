import { homeReserveRam } from "/lib/uhm/config.js";
import { safeServerExists, isUsableTarget } from "/lib/uhm/safe.js";

const EXP_WEAKEN = "/workers/exp-weaken.js";
const EXP_GROW = "/workers/exp-grow.js";

export function runExpOverdrive(ns, target, hosts, options = {}) {
    const maxProcesses = options.maxProcesses ?? 100;
    const growRatio = options.growRatio ?? 0.15;
    const reserveHomeRam = options.homeReserveRam ?? homeReserveRam;

    if (!isUsableTarget(ns, target)) {
        return result("INVALID_TARGET", 0, 0, 0, {
            target,
            maxProcesses,
            growRatio,
        });
    }

    const active = countActiveExpWorkers(ns, hosts);

    if (active >= maxProcesses) {
        return result("PROCESS_CAP", 0, 0, active, {
            target,
            maxProcesses,
            growRatio,
        });
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
            growRatio,
        }
    );
}

function isExpWorkerRunning(ns, host, target) {
    try {
        return ns.ps(host).some(p =>
            (
                sameScript(p.filename, EXP_WEAKEN) ||
                sameScript(p.filename, EXP_GROW)
            ) &&
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
                sameScript(p.filename, EXP_WEAKEN) ||
                sameScript(p.filename, EXP_GROW)
            ).length;
        } catch {
            // ignore stale host
        }
    }

    return count;
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