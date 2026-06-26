// bb/lib/daemon/service-manager.js
import { getEnabledServices, SERVICE_TYPES } from "/lib/daemon/services.js";
import {
    logServiceBlocked,
    logServiceFailure,
} from "/lib/daemon/telemetry.js";

const COMPLETIONS_FILE = "/data/service-completions.txt";
const FAILURE_CACHE = {};
const FAILURE_COOLDOWN_MS = 30 * 1000;

export function manageServices(ns, daemonState) {
    const services = getEnabledServices();
    const results = [];

    for (const service of services) {
        results.push(manageService(ns, service, daemonState));
    }

    return results;
}

function manageService(ns, service, daemonState) {
    const normalized = normalizeService(service);
    const key = getServiceKey(normalized);
    const failureGate = getFailureCooldown(key);
    if (
        normalized.completionFile &&
        ns.fileExists(normalized.completionFile, "home")
    ) {
        return buildResult(normalized, {
            key,
            status: "completed",
            kind: "done",
            running: false,
            pid: 0,
            reason: "completion file exists",
        });
    }
    if (!failureGate.allowed) {
        logServiceBlocked(ns, normalized.id, failureGate.reason, {
            key,
            name: normalized.name,
            host: normalized.host,
            type: normalized.type,
            cooldown: true,
        });

        return buildResult(normalized, {
            key,
            status: "cooldown",
            kind: "locked",
            running: false,
            pid: 0,
            reason: failureGate.reason,
        });
    }

    const gate = getServiceGate(ns, normalized, daemonState);
    const running = getRunningService(ns, normalized);

    if (!gate.allowed) {
        const killed =
            running && normalized.stopWhenBlocked === true;

        if (running && normalized.stopWhenBlocked === true) {
            ns.kill(running.pid);
        }

        logServiceBlocked(ns, normalized.id, gate.reason, {
            key,
            name: normalized.name,
            host: normalized.host,
            type: normalized.type,
            policyFlag: normalized.policyFlag,
            stopWhenBlocked: normalized.stopWhenBlocked,
            wasRunning: !!running,
            killedPid: running && normalized.stopWhenBlocked === true ? running.pid : 0,
            phase: daemonState?.phase ?? daemonState?.mode ?? "unknown",
        });

        return buildResult(normalized, {
            key,
            status: "blocked",
            kind: "locked",
            running: killed ? false : !!running,
            pid: killed ? 0 : running?.pid ?? 0,
            reason: gate.reason,
            gate: gate.diagnostics,
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
            gate: gate.diagnostics,
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

    const existing = ns.ps(normalized.host)
        .filter((p) => normalizePath(p.filename) === normalizePath(normalized.name));

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
        ...normalized.args,
    );

    if (pid === 0) {
        const failureReason = getExecFailureReason(ns, normalized);

        markFailure(key);

        logServiceFailure(ns, normalized.id, failureReason, {
            key,
            name: normalized.name,
            host: normalized.host,
            threads: normalized.threads,
            args: normalized.args,
            type: normalized.type,
            policyFlag: normalized.policyFlag,
            phase: daemonState?.phase ?? daemonState?.mode ?? "unknown",
            scriptRam: safeScriptRam(ns, normalized),
            freeRam: safeFreeRam(ns, normalized.host),
        });

        return buildResult(normalized, {
            key,
            status: "failed",
            kind: "failed",
            running: false,
            pid: 0,
            reason: failureReason,
            gate: gate.diagnostics,
        });
    }

    if (normalized.tail === true) {
        try {
            ns.ui.openTail(pid);
        } catch (error) {
            console.error(error);
        }
    }

    clearFailure(key);

    return buildResult(normalized, {
        key,
        status: "started",
        kind: normalized.type === SERVICE_TYPES.ONE_SHOT ? "once" : "live",
        running: true,
        pid,
        reason: "started by daemon",
        gate: gate.diagnostics,
    });
}

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
        bitNodes: service.bitNodes ?? [],
        requiresRunningService: service.requiresRunningService ?? null,

        stopWhenBlocked: service.stopWhenBlocked ?? false,
        purpose: service.purpose ?? "",
        reason: service.reason ?? "",
        maxHomeRam: service.maxHomeRam ?? 0,
        policyFlag: service.policyFlag ?? null,
        completionFile: service.completionFile ?? null,
    };
}

function getServiceGate(ns, service, daemonState) {
    const diagnostics = buildGateDiagnostics(ns, service, daemonState);

    if (service.enabled !== true) {
        return block("disabled", diagnostics);
    }

    if (!service.name || !ns.fileExists(service.name, service.host)) {
        return block("script missing", diagnostics);
    }

    if (
        service.policyFlag &&
        daemonState?.spendingPolicy?.[service.policyFlag] !== true
    ) {
        return block(`${service.policyFlag} blocked by policy`, diagnostics);
    }

    if (service.requiresTixApi && !hasTixApi(ns)) {
        return block("requires TIX API", diagnostics);
    }

    if (service.minMoney > 0 && ns.getPlayer().money < service.minMoney) {
        return block(`requires $${ns.format.number(service.minMoney)}`, diagnostics);
    }

    if (service.minHomeRam > 0 && ns.getServerMaxRam("home") < service.minHomeRam) {
        return block(`requires ${ns.format.ram(service.minHomeRam)} home RAM`, diagnostics);
    }

    if (service.maxHomeRam > 0 && ns.getServerMaxRam("home") >= service.maxHomeRam) {
        return block(`disabled after ${ns.format.ram(service.maxHomeRam)} home RAM`, diagnostics);
    }

    if (
        service.bitNodes.length > 0 &&
        !service.bitNodes.includes(getCurrentBitNode(ns))
    ) {
        return block(`disabled in BN${getCurrentBitNode(ns)}`, diagnostics);
    }

    if (
        service.requiresRunningService &&
        !isScriptRunningOnHost(ns, service.requiresRunningService, service.host)
    ) {
        return block(`requires ${service.requiresRunningService} running`, diagnostics);
    }

    const phase = daemonState?.phase ?? "unknown";
    const mode = daemonState?.mode ?? "unknown";
    const serviceContexts = new Set([phase, mode]);

    if (
        service.phases.length > 0 &&
        !service.phases.some(x => serviceContexts.has(x))
    ) {
        return block(`phase ${phase} / mode ${mode} not allowed`, diagnostics);
    }

    if (
        service.disabledPhases.some(x => serviceContexts.has(x))
    ) {
        return block(`disabled during phase ${phase} / mode ${mode}`, diagnostics);
    }

    return {
        allowed: true,
        reason: "allowed",
        diagnostics,
    };
}

function block(reason, diagnostics = null) {
    return {
        allowed: false,
        reason,
        diagnostics,
    };
}

function buildGateDiagnostics(ns, service, daemonState) {
    const host = service.host ?? "home";
    const scriptRam = safeScriptRam(ns, service);
    const freeRam = safeFreeRam(ns, host);

    return {
        homeRam: safeMaxRam(ns, "home"),
        hostMaxRam: safeMaxRam(ns, host),
        hostFreeRam: freeRam,
        scriptRam,
        neededRam: scriptRam * (service.threads ?? 1),
        minHomeRam: service.minHomeRam ?? 0,
        maxHomeRam: service.maxHomeRam ?? 0,
        policyFlag: service.policyFlag ?? null,
        policyValue:
            service.policyFlag
                ? daemonState?.spendingPolicy?.[service.policyFlag] === true
                : null,
        requiresSingularity: service.requiresSingularity === true,
        singularity: true,
        singularityGate: "sf4-unlocked",
        requiresTixApi: service.requiresTixApi === true,
        tixApi: service.requiresTixApi === true ? hasTixApi(ns) : null,
        scriptExists:
            !!service.name &&
            safeFileExists(ns, service.name, host),
        phase: daemonState?.phase ?? "unknown",
        mode: daemonState?.mode ?? "unknown",
        priority: daemonState?.spendingPolicy?.priority ?? "unknown",
        bitNode: getCurrentBitNode(ns),
        bitNodes: service.bitNodes ?? [],
    };
}

function getRunningService(ns, service) {
    try {
        const processes = ns.ps(service.host);

        const matches = processes.filter((p) =>
            normalizePath(p.filename) === normalizePath(service.name)
        );

        if (matches.length === 0) return null;

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

function getServiceKey(service) {
    return `${service.host}:${service.name}:${JSON.stringify(service.args ?? [])}`;
}

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
        gate: extra.gate ?? null,
    };
}

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
        return ns.stock.hasTixApiAccess();
    } catch {
        return false;
    }
}

function getExecFailureReason(ns, service) {
    try {
        const host = service.host ?? "home";
        const script = service.name;
        const scriptRam = ns.getScriptRam(script, host);
        const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
        const neededRam = scriptRam * (service.threads ?? 1);

        if (scriptRam <= 0) {
            return "script RAM unavailable or script not found";
        }

        if (freeRam < neededRam) {
            return `not enough RAM: needs ${ns.format.ram(neededRam)}, free ${ns.format.ram(freeRam)}`;
        }

        return "ns.exec returned 0 for unknown reason";
    } catch (error) {
        return `exec failure check failed: ${String(error)}`;
    }
}

function safeScriptRam(ns, service) {
    try {
        return ns.getScriptRam(service.name, service.host ?? "home");
    } catch {
        return 0;
    }
}

function safeFreeRam(ns, host = "home") {
    try {
        return ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    } catch {
        return 0;
    }
}

function safeMaxRam(ns, host = "home") {
    try {
        return ns.getServerMaxRam(host);
    } catch {
        return 0;
    }
}

function safeFileExists(ns, file, host = "home") {
    try {
        return ns.fileExists(file, host);
    } catch {
        return false;
    }
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function getFailureCooldown(key) {
    const entry = FAILURE_CACHE[key];

    if (!entry) {
        return {
            allowed: true,
            reason: "no failures",
        };
    }

    const age = Date.now() - entry.lastFailure;

    if (age >= FAILURE_COOLDOWN_MS) {
        return {
            allowed: true,
            reason: "cooldown expired",
        };
    }

    return {
        allowed: false,
        reason: `failure cooldown ${Math.ceil((FAILURE_COOLDOWN_MS - age) / 1000)}s remaining`,
    };
}

function markFailure(key) {
    FAILURE_CACHE[key] = {
        lastFailure: Date.now(),
    };
}

function clearFailure(key) {
    delete FAILURE_CACHE[key];
}

function isScriptRunningOnHost(ns, script, host = "home") {
    try {
        return ns.ps(host)
            .some(proc => normalizePath(proc.filename) === normalizePath(script));
    } catch {
        return false;
    }
}
