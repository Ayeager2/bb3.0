import { getEnabledServices, SERVICE_TYPES } from "/lib/daemon/services.js";

const COMPLETIONS_FILE = "/data/service-completions.txt";

/**
 * Main service orchestration entry.
 *
 * Called once per daemon loop.
 * Returns rich service state for dashboard/state files.
 */
export function manageServices(ns, daemonState) {
    const services = getEnabledServices();
    const results = [];

    for (const service of services) {
        results.push(manageService(ns, service, daemonState));
    }

    return results;
}

/**
 * Handles one service:
 * - checks gates
 * - detects running PID
 * - respects one-shot completion
 * - starts service if allowed
 * - returns dashboard-friendly status
 */
function manageService(ns, service, daemonState) {
    const normalized = normalizeService(service);
    const key = getServiceKey(normalized);

    const gate = getServiceGate(ns, normalized, daemonState);
    const running = getRunningService(ns, normalized);

    if (!gate.allowed) {
        if (running && normalized.stopWhenBlocked === true) {
            ns.kill(running.pid);
        }

        return buildResult(normalized, {
            key,
            status: "blocked",
            kind: "locked",
            running: !!running,
            pid: running?.pid ?? 0,
            reason: gate.reason,
        });
    }

    if (running) {
        return buildResult(normalized, {
            key,
            status: "running",
            kind: "live",
            running: true,
            pid: running.pid,
            threads: running.threads,
            args: running.args,
            reason: "already running",
        });
    }

    if (normalized.type === SERVICE_TYPES.ONE_SHOT && wasOneShotCompleted(ns, key)) {
        return buildResult(normalized, {
            key,
            status: "completed",
            kind: "done",
            running: false,
            pid: 0,
            reason: "one-shot completed",
        });
    }
    // HARD DUPLICATE PROTECTION
    const existing = ns.ps(normalized.host)
        .filter(p => normalizePath(p.filename) === normalizePath(normalized.name));

    if (existing.length > 0) {
        return buildResult(normalized, {
            key,
            status: "running",
            kind: "live",
            running: true,
            pid: existing[0].pid,
            threads: existing[0].threads,
            args: existing[0].args ?? [],
            reason: "already running (duplicate protection)",
        });
    }
    const pid = ns.exec(
        normalized.name,
        normalized.host,
        normalized.threads,
        ...normalized.args
    );

    if (pid === 0) {
        return buildResult(normalized, {
            key,
            status: "failed",
            kind: "failed",
            running: false,
            pid: 0,
            reason: "ns.exec returned 0",
        });
    }

    if (normalized.tail === true) {
        try {
            ns.ui.openTail(pid);
        } catch { }
    }

    return buildResult(normalized, {
        key,
        status: "started",
        kind: normalized.type === SERVICE_TYPES.ONE_SHOT ? "once" : "live",
        running: true,
        pid,
        reason: "started by daemon",
    });
}

/**
 * Normalizes optional fields so the rest of the file can be simple.
 */
function normalizeService(service) {
    return {
        id: service.id ?? service.name,
        name: service.name,
        host: service.host ?? "home",
        threads: service.threads ?? 1,
        args: service.args ?? [],
        tail: service.tail ?? false,
        keepAlive: service.keepAlive ?? false,
        enabled: service.enabled === true,
        type: service.type ?? SERVICE_TYPES.CONDITIONAL,

        requiresSingularity: service.requiresSingularity ?? false,
        requiresTixApi: service.requiresTixApi ?? false,
        minMoney: service.minMoney ?? 0,
        minHomeRam: service.minHomeRam ?? 0,
        phases: service.phases ?? [],
        disabledPhases: service.disabledPhases ?? [],

        stopWhenBlocked: service.stopWhenBlocked ?? false,
        purpose: service.purpose ?? "",
        reason: service.reason ?? "",
        maxHomeRam: service.maxHomeRam ?? 0,
    };
}

/**
 * All service gating lives here.
 *
 * Add future gates here:
 * - requires4SApi
 * - requiresTor
 * - requiresBitNode
 * - requiresFaction
 * - maxPhase
 */
function getServiceGate(ns, service, daemonState) {
    if (service.enabled !== true) {
        return block("disabled");
    }

    if (!service.name || !ns.fileExists(service.name, service.host)) {
        return block("script missing");
    }

    if (service.requiresSingularity && daemonState?.capabilities?.singularity !== true) {
        return block("requires Singularity");
    }

    if (service.requiresTixApi && !hasTixApi(ns)) {
        return block("requires TIX API");
    }

    if (service.minMoney > 0 && ns.getPlayer().money < service.minMoney) {
        return block(`requires $${ns.format.number(service.minMoney)}`);
    }

    if (service.minHomeRam > 0 && ns.getServerMaxRam("home") < service.minHomeRam) {
        return block(`requires ${ns.format.ram(service.minHomeRam)} home RAM`);
    }

    if (service.maxHomeRam > 0 && ns.getServerMaxRam("home") >= service.maxHomeRam) {
        return block(`disabled after ${ns.format.ram(service.maxHomeRam)} home RAM`);
    }

    const phase = daemonState?.phase ?? daemonState?.mode ?? "unknown";

    if (service.phases.length > 0 && !service.phases.includes(phase)) {
        return block(`phase ${phase} not allowed`);
    }

    if (service.disabledPhases.includes(phase)) {
        return block(`disabled during ${phase}`);
    }

    if (service.id === "stock-trader" && daemonState?.spendingPolicy?.allowStockTrading !== true) {
        return block("stock trading blocked by policy");
    }

    return {
        allowed: true,
        reason: "allowed",
    };
}

function block(reason) {
    return {
        allowed: false,
        reason,
    };
}

/**
 * Finds running service and returns PID/thread info.
 */
function getRunningService(ns, service) {
    try {
        const processes = ns.ps(service.host);

        const matches = processes.filter(p =>
            normalizePath(p.filename) === normalizePath(service.name)
        );

        if (matches.length === 0) return null;

        // Safety: if duplicates already exist, kill extras.
        // Keep the oldest/first one.
        for (let i = 1; i < matches.length; i++) {
            ns.kill(matches[i].pid);
        }

        const proc = matches[0];

        return {
            pid: proc.pid,
            filename: proc.filename,
            threads: proc.threads,
            args: proc.args ?? [],
        };
    } catch {
        return null;
    }
}

function normalizePath(path) {
    return String(path ?? "").replace(/^\/+/, "");
}
/**
 * Stable key for one-shot completion and dashboard identity.
 */
function getServiceKey(service) {
    return `${service.host}:${service.name}:${JSON.stringify(service.args ?? [])}`;
}

/**
 * Dashboard/state-friendly result shape.
 */
function buildResult(service, extra) {
    return {
        id: service.id,
        name: service.name,
        host: service.host,
        threads: extra.threads ?? service.threads,
        args: extra.args ?? service.args,
        type: service.type,
        keepAlive: service.keepAlive,
        enabled: service.enabled,
        tail: service.tail,
        purpose: service.purpose,
        key: extra.key,

        status: extra.status,
        kind: extra.kind,
        running: extra.running,
        pid: extra.pid,
        reason: extra.reason,
    };
}

/**
 * Future-ready one-shot completion check.
 *
 * For now this reads a simple JSON object:
 * {
 *   "home:/tools/worm-update.js:[]": true
 * }
 */
function wasOneShotCompleted(ns, key) {
    const completions = readJson(ns, COMPLETIONS_FILE);
    return completions?.[key] === true;
}

export function markOneShotCompleted(ns, serviceResult) {
    if (!serviceResult?.key) return;

    const completions = readJson(ns, COMPLETIONS_FILE);
    completions[serviceResult.key] = true;

    writeJson(ns, COMPLETIONS_FILE, completions);
}

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};
        const raw = ns.read(file);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}

function hasTixApi(ns) {
    try {
        return ns.stock.hasTIXAPIAccess();
    } catch {
        return false;
    }
}

