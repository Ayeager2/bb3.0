// /tools/darknet-service.js

const VERSION = "darknet-service-v1";
const STATE_FILE = "/data/darknet-service-state.txt";
const REPORT_FILE = "/data/darknet-service-report.txt";
const CREDENTIAL_FILE = "/data/darknet-credentials.txt";
const WORKER_SCRIPT = "/tools/darknet-worker.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 60000],
        ["depth", 4],
        ["realloc", true],
        ["cache", true],
        ["phish", true],
        ["spread", true],
        ["stasis", false],
        ["migrate", false],
        ["freeze", false],
        ["promote", ""],
        ["tail", false],
    ]);

    const options = {
        refreshMs: Math.max(5000, Number(flags.refresh) || 60000),
        maxDepth: Math.max(1, Number(flags.depth) || 4),
        doRealloc: asBool(flags.realloc),
        doCache: asBool(flags.cache),
        doPhish: asBool(flags.phish),
        doSpread: asBool(flags.spread),
        doStasis: asBool(flags.stasis),
        doMigrate: asBool(flags.migrate),
        doFreeze: asBool(flags.freeze),
        promoteSymbol: String(flags.promote || "").trim().toUpperCase(),
        tail: asBool(flags.tail),
    };

    if (options.tail) openTail(ns);

    while (true) {
        const state = await buildServiceState(ns, options);
        writeJson(ns, STATE_FILE, state);
        ns.write(REPORT_FILE, buildReport(ns, state), "w");
        printSummary(ns, state);
        await sleepForMutationOrTimer(ns, options.refreshMs);
    }
}

async function buildServiceState(ns, options) {
    const credentials = readCredentials(ns);
    const state = {
        schemaVersion: 1,
        diagnosticVersion: VERSION,
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),
        status: "ready",
        host: ns.getHostname(),
        hasNavigator: ns.fileExists("DarkscapeNavigator.exe", "home"),
        hasDnet: hasDnet(ns),
        options: {
            depth: options.maxDepth,
            realloc: options.doRealloc,
            cache: options.doCache,
            phish: options.doPhish,
            spread: options.doSpread,
            stasis: options.doStasis,
            migrate: options.doMigrate,
            freeze: options.doFreeze,
            promote: options.promoteSymbol || null,
        },
        totals: {
            neighbors: 0,
            authenticated: 0,
            sessions: 0,
            launched: 0,
            cachesOpened: 0,
            phishingRuns: 0,
            credentials: Object.keys(credentials.hosts).length,
        },
        records: [],
        launches: [],
        childReports: collectChildReports(ns),
        errors: [],
    };

    if (!state.hasDnet) {
        state.status = "unavailable";
        state.errors.push("ns.dnet API unavailable. Buy DarkscapeNavigator.exe first.");
        return state;
    }

    const neighbors = safeProbe(ns);
    state.totals.neighbors = neighbors.length;

    for (const host of neighbors) {
        const record = await inspectNeighbor(ns, host, credentials, options);
        state.records.push(record);
        if (record.authenticated) state.totals.authenticated++;
        if (record.session?.success === true) state.totals.sessions++;

        if (record.authenticated && options.doSpread) {
            const launch = await launchWorker(ns, host, options);
            state.launches.push(launch);
            if (launch.pid > 0) state.totals.launched++;
        }
    }

    for (const report of state.childReports) {
        state.totals.cachesOpened += Number(report?.openedCaches?.length ?? report?.local?.openedCaches?.length) || 0;
        if (report?.local?.phishing) state.totals.phishingRuns++;
    }

    writeCredentials(ns, credentials);
    state.totals.credentials = Object.keys(credentials.hosts).length;
    return state;
}

async function inspectNeighbor(ns, host, credentials, options) {
    const record = {
        host,
        details: null,
        logs: [],
        session: null,
        auth: null,
        authenticated: false,
        realloc: null,
        migration: null,
        freeze: null,
        error: null,
    };

    try {
        record.details = ns.dnet.getServerDetails(host);
    } catch (error) {
        record.error = `details failed: ${String(error?.message ?? error)}`;
    }

    const storedPassword = credentials.hosts?.[host]?.password;
    if (typeof storedPassword === "string") {
        record.session = callSync(() => ns.dnet.connectToSession(host, storedPassword));
        record.authenticated = record.session?.success === true || record.details?.hasSession === true;
    }

    if (!record.authenticated) {
        for (const password of getPasswordCandidates(host, record.details, storedPassword)) {
            const auth = await callAsync(() => ns.dnet.authenticate(host, password, 0));
            record.auth = auth;
            if (auth?.success === true) {
                record.authenticated = true;
                credentials.hosts[host] = {
                    password,
                    modelId: record.details?.modelId ?? null,
                    passwordHint: record.details?.passwordHint ?? null,
                    authenticatedAt: Date.now(),
                    source: "darknet-service",
                };
                break;
            }
        }
    }

    const heartbleed = await callAsync(() => ns.dnet.heartbleed(host, { peek: true }));
    if (Array.isArray(heartbleed?.logs)) record.logs = heartbleed.logs;

    if (record.authenticated && options.doRealloc) {
        record.realloc = await callAsync(() => ns.dnet.memoryReallocation(host));
    }

    if (record.authenticated && options.doMigrate) {
        record.migration = await callAsync(() => ns.dnet.induceServerMigration(host));
    }

    if (record.authenticated && options.doFreeze) {
        record.freeze = await callAsync(() => ns.dnet.freezeServer(host));
    }

    return record;
}

async function launchWorker(ns, host, options) {
    const launch = {
        host,
        copied: false,
        copiedCredentials: false,
        pid: 0,
        freeRam: 0,
        scriptRam: 0,
        reason: "",
    };

    try {
        launch.copied = await ns.scp(WORKER_SCRIPT, host, "home");
        if (ns.fileExists(CREDENTIAL_FILE, "home")) {
            launch.copiedCredentials = await ns.scp(CREDENTIAL_FILE, host, "home");
        }
    } catch (error) {
        launch.reason = `copy failed: ${String(error?.message ?? error)}`;
        return launch;
    }

    if (isScriptRunning(ns, host, WORKER_SCRIPT)) {
        launch.reason = "worker already running";
        return launch;
    }

    launch.freeRam = safeMaxRam(ns, host) - safeUsedRam(ns, host);
    launch.scriptRam = safeScriptRam(ns, WORKER_SCRIPT, host);

    if (launch.scriptRam <= 0) {
        launch.reason = "worker RAM unavailable";
        return launch;
    }

    if (launch.freeRam < launch.scriptRam) {
        launch.reason = `not enough RAM: needs ${formatRam(ns, launch.scriptRam)}, free ${formatRam(ns, launch.freeRam)}`;
        return launch;
    }

    try {
        launch.pid = ns.exec(
            WORKER_SCRIPT,
            host,
            1,
            "--origin", "home",
            "--refresh", options.refreshMs,
            "--realloc", options.doRealloc,
            "--cache", options.doCache,
            "--phish", options.doPhish,
            "--stasis", options.doStasis,
            "--migrate", options.doMigrate,
            "--freeze", options.doFreeze,
            "--promote", options.promoteSymbol,
        );
        launch.reason = launch.pid > 0 ? "worker started" : "exec returned 0";
    } catch (error) {
        launch.reason = `exec failed: ${String(error?.message ?? error)}`;
    }

    return launch;
}

function collectChildReports(ns) {
    return safeLs(ns, "/data/darknet-worker-")
        .map(file => readJson(ns, file, null))
        .filter(Boolean);
}

function getPasswordCandidates(host, details, storedPassword) {
    const values = [
        storedPassword,
        "",
        String(host ?? ""),
        String(details?.passwordHint ?? ""),
        String(details?.modelId ?? ""),
    ];

    return [...new Set(values.filter(value => typeof value === "string"))];
}

async function sleepForMutationOrTimer(ns, refreshMs) {
    try {
        if (ns.dnet?.nextMutation) {
            await ns.dnet.nextMutation();
            return;
        }
    } catch {
        // Fall back to normal service cadence.
    }

    await ns.sleep(refreshMs);
}

function safeProbe(ns) {
    try {
        return ns.dnet.probe(false) ?? [];
    } catch {
        return [];
    }
}

function hasDnet(ns) {
    return !!(ns.dnet && typeof ns.dnet.probe === "function");
}

function readCredentials(ns) {
    const parsed = readJson(ns, CREDENTIAL_FILE, { schemaVersion: 1, hosts: {} });
    return {
        schemaVersion: 1,
        hosts: parsed?.hosts && typeof parsed.hosts === "object" ? parsed.hosts : {},
    };
}

function writeCredentials(ns, credentials) {
    credentials.updatedAt = Date.now();
    credentials.updatedAtText = new Date().toLocaleTimeString();
    ns.write(CREDENTIAL_FILE, JSON.stringify(credentials, null, 2), "w");
}

async function callAsync(fn) {
    try {
        const result = await fn();
        return compactResult(result);
    } catch (error) {
        return {
            success: false,
            error: String(error?.message ?? error),
        };
    }
}

function callSync(fn) {
    try {
        return compactResult(fn());
    } catch (error) {
        return {
            success: false,
            error: String(error?.message ?? error),
        };
    }
}

function compactResult(result) {
    if (!result || typeof result !== "object") return result;
    return {
        success: result.success,
        message: result.message,
        error: result.error,
        logs: result.logs,
        money: result.money,
        exp: result.exp,
    };
}

function buildReport(ns, state) {
    const lines = [
        "Darknet Service",
        "=".repeat(64),
        `Updated: ${state.updatedAtText}`,
        `Status: ${state.status}`,
        `DarkscapeNavigator.exe: ${state.hasNavigator ? "YES" : "NO"}`,
        `Credentials: ${state.totals.credentials}`,
        `Neighbors: ${state.totals.neighbors}`,
        `Authenticated: ${state.totals.authenticated}`,
        `Sessions reused: ${state.totals.sessions}`,
        `Workers launched: ${state.totals.launched}`,
        `Caches opened: ${state.totals.cachesOpened}`,
        `Phishing runs: ${state.totals.phishingRuns}`,
        "",
        "Targets",
        "-".repeat(64),
    ];

    for (const record of state.records) {
        lines.push(`${record.host} model=${record.details?.modelId ?? "unknown"} online=${record.details?.isOnline ?? "unknown"} auth=${record.authenticated}`);
        lines.push(`  hint=${record.details?.passwordHint ?? "none"}`);
        if (record.session?.message) lines.push(`  session=${record.session.message}`);
        if (record.auth?.message) lines.push(`  auth=${record.auth.message}`);
        if (record.realloc?.message) lines.push(`  realloc=${record.realloc.message}`);
        if (record.migration?.message) lines.push(`  migration=${record.migration.message}`);
        if (record.freeze?.message) lines.push(`  freeze=${record.freeze.message}`);
        for (const log of record.logs ?? []) lines.push(`  log=${log}`);
    }

    if (state.launches.length > 0) {
        lines.push("");
        lines.push("Launches");
        lines.push("-".repeat(64));
        for (const launch of state.launches) {
            lines.push(`${launch.host} pid=${launch.pid} copied=${launch.copied} creds=${launch.copiedCredentials} ${launch.reason}`);
            lines.push(`  ram=${formatRam(ns, launch.scriptRam)}/${formatRam(ns, launch.freeRam)}`);
        }
    }

    return lines.join("\n");
}

function printSummary(ns, state) {
    ns.clearLog();
    ns.print("Darknet Service");
    ns.print("=".repeat(50));
    ns.print(`Status: ${state.status}`);
    ns.print(`Navigator: ${state.hasNavigator ? "YES" : "NO"}`);
    ns.print(`Credentials: ${state.totals.credentials}`);
    ns.print(`Authenticated: ${state.totals.authenticated}`);
    ns.print(`Workers: ${state.totals.launched}`);
    ns.print(`Report: ${REPORT_FILE}`);
    for (const error of state.errors ?? []) ns.print(`ERROR: ${error}`);
}

function isScriptRunning(ns, host, script) {
    try {
        return ns.ps(host).some(process => normalizePath(process.filename) === normalizePath(script));
    } catch {
        return false;
    }
}

function safeLs(ns, pattern) {
    try {
        return ns.ls("home", pattern);
    } catch {
        return [];
    }
}

function readJson(ns, file, fallback) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;
        const raw = ns.read(file);
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}

function safeMaxRam(ns, host) {
    try {
        return ns.getServerMaxRam(host);
    } catch {
        return 0;
    }
}

function safeUsedRam(ns, host) {
    try {
        return ns.getServerUsedRam(host);
    } catch {
        return 0;
    }
}

function safeScriptRam(ns, script, host) {
    try {
        return ns.getScriptRam(script, host);
    } catch {
        return 0;
    }
}

function formatRam(ns, value) {
    try {
        return ns.format.ram(Number(value) || 0);
    } catch {
        return String(value ?? 0);
    }
}

function openTail(ns) {
    try {
        ns.tail();
        ns.resizeTail(680, 520);
    } catch {
        // Tail controls are UI-only.
    }
}

function normalizePath(path) {
    const value = String(path ?? "").replace(/\\/g, "/");
    return value.startsWith("/") ? value : `/${value}`;
}

function asBool(value) {
    return value === true || value === "true";
}
