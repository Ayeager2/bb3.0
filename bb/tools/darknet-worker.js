// /tools/darknet-worker.js

const VERSION = "darknet-worker-v1";
const CREDENTIAL_FILE = "/data/darknet-credentials.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 60000],
        ["once", false],
        ["origin", "home"],
        ["realloc", true],
        ["cache", true],
        ["phish", true],
        ["stasis", false],
        ["migrate", false],
        ["freeze", false],
        ["promote", ""],
    ]);

    const options = {
        refreshMs: Math.max(5000, Number(flags.refresh) || 60000),
        once: asBool(flags.once),
        origin: String(flags.origin || "home"),
        doRealloc: asBool(flags.realloc),
        doCache: asBool(flags.cache),
        doPhish: asBool(flags.phish),
        doStasis: asBool(flags.stasis),
        doMigrate: asBool(flags.migrate),
        doFreeze: asBool(flags.freeze),
        promoteSymbol: String(flags.promote || "").trim().toUpperCase(),
    };

    while (true) {
        const state = await buildWorkerState(ns, options);
        const file = `/data/darknet-worker-${safePart(state.host)}.txt`;
        ns.write(file, JSON.stringify(state, null, 2), "w");
        await copyHome(ns, file);

        if (options.once) return;
        await sleepForMutationOrTimer(ns, options.refreshMs);
    }
}

async function buildWorkerState(ns, options) {
    const host = ns.getHostname();
    const credentials = readCredentials(ns);
    const state = {
        schemaVersion: 1,
        diagnosticVersion: VERSION,
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),
        host,
        origin: options.origin,
        status: "ready",
        hasDnet: hasDnet(ns),
        neighbors: [],
        local: {
            caches: [],
            openedCaches: [],
            phishing: null,
            stasis: null,
            promotedStock: null,
        },
        targets: [],
        errors: [],
    };

    if (!state.hasDnet) {
        state.status = "unavailable";
        state.errors.push("ns.dnet API unavailable.");
        return state;
    }

    state.neighbors = safeProbe(ns);

    if (options.doCache) {
        state.local.caches = safeLs(ns, ".cache");
        for (const file of state.local.caches) {
            state.local.openedCaches.push(await openCache(ns, file));
        }
    }

    if (options.doPhish && isCurrentHostDarknet(ns)) {
        state.local.phishing = await callAsync(ns, () => ns.dnet.phishingAttack());
    }

    if (options.doStasis && isCurrentHostDarknet(ns)) {
        state.local.stasis = await callAsync(ns, () => ns.dnet.setStasisLink(true));
    }

    if (options.promoteSymbol && isCurrentHostDarknet(ns)) {
        state.local.promotedStock = await callAsync(ns, () => ns.dnet.promoteStock(options.promoteSymbol));
    }

    for (const target of state.neighbors) {
        const record = await inspectNeighbor(ns, target, credentials, options);
        state.targets.push(record);
    }

    writeCredentials(ns, credentials);
    await copyHome(ns, CREDENTIAL_FILE);
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
        record.session = callSync(ns, () => ns.dnet.connectToSession(host, storedPassword));
        record.authenticated = record.session?.success === true || record.details?.hasSession === true;
    }

    if (!record.authenticated) {
        for (const password of getPasswordCandidates(host, record.details, storedPassword)) {
            const auth = await callAsync(ns, () => ns.dnet.authenticate(host, password, 0));
            record.auth = auth;
            if (auth?.success === true) {
                record.authenticated = true;
                credentials.hosts[host] = {
                    password,
                    modelId: record.details?.modelId ?? null,
                    passwordHint: record.details?.passwordHint ?? null,
                    authenticatedAt: Date.now(),
                    source: "darknet-worker",
                };
                break;
            }
        }
    }

    const heartbleed = await callAsync(ns, () => ns.dnet.heartbleed(host, { peek: true }));
    if (Array.isArray(heartbleed?.logs)) record.logs = heartbleed.logs;

    if (record.authenticated && options.doRealloc) {
        record.realloc = await callAsync(ns, () => ns.dnet.memoryReallocation(host));
    }

    if (record.authenticated && options.doMigrate) {
        record.migration = await callAsync(ns, () => ns.dnet.induceServerMigration(host));
    }

    if (record.authenticated && options.doFreeze) {
        record.freeze = await callAsync(ns, () => ns.dnet.freezeServer(host));
    }

    return record;
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

async function openCache(ns, file) {
    return callAsync(ns, () => ns.dnet.openCache(file, true));
}

async function copyHome(ns, file) {
    if (ns.getHostname() === "home") return true;
    return callAsync(ns, () => ns.scp(file, "home", ns.getHostname()));
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

function safeLs(ns, pattern) {
    try {
        return ns.ls(ns.getHostname(), pattern);
    } catch {
        return [];
    }
}

function isCurrentHostDarknet(ns) {
    try {
        return ns.dnet.isDarknetServer(ns.getHostname()) === true;
    } catch {
        return false;
    }
}

function hasDnet(ns) {
    return !!(ns.dnet && typeof ns.dnet.probe === "function");
}

function readCredentials(ns) {
    try {
        if (!ns.fileExists(CREDENTIAL_FILE, ns.getHostname())) return { schemaVersion: 1, hosts: {} };
        const raw = ns.read(CREDENTIAL_FILE);
        if (!raw.trim()) return { schemaVersion: 1, hosts: {} };
        const parsed = JSON.parse(raw);
        return {
            schemaVersion: 1,
            hosts: parsed?.hosts && typeof parsed.hosts === "object" ? parsed.hosts : {},
        };
    } catch {
        return { schemaVersion: 1, hosts: {} };
    }
}

function writeCredentials(ns, credentials) {
    credentials.updatedAt = Date.now();
    credentials.updatedAtText = new Date().toLocaleTimeString();
    ns.write(CREDENTIAL_FILE, JSON.stringify(credentials, null, 2), "w");
}

async function callAsync(ns, fn) {
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

function callSync(ns, fn) {
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
        money: result.money,
        exp: result.exp,
    };
}

function asBool(value) {
    return value === true || value === "true";
}

function safePart(value) {
    return String(value ?? "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}
