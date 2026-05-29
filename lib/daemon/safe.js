export function safeGetPurchasedServers(ns) {
    try {
        return ns.getPurchasedServers();
    } catch {
        return [];
    }
}

export function safeGetCloudServers(ns) {
    try {
        return ns.cloud.getServerNames();
    } catch {
        return [];
    }
}

export function safeServerExists(ns, server) {
    try {
        return !!server && ns.serverExists(server);
    } catch {
        return false;
    }
}

export function safeGetServerMaxMoney(ns, server) {
    try { return ns.getServerMaxMoney(server); } catch { return 0; }
}

export function safeGetServerMoneyAvailable(ns, server) {
    try { return ns.getServerMoneyAvailable(server); } catch { return 0; }
}

export function safeGetServerSecurityLevel(ns, server) {
    try { return ns.getServerSecurityLevel(server); } catch { return 999; }
}

export function safeGetServerMinSecurityLevel(ns, server) {
    try { return ns.getServerMinSecurityLevel(server); } catch { return 1; }
}

export function safeGetServerGrowth(ns, server) {
    try { return ns.getServerGrowth(server); } catch { return 0; }
}

export function safeGetWeakenTime(ns, server) {
    try { return ns.getWeakenTime(server); } catch { return Number.MAX_SAFE_INTEGER; }
}

export function safeHackAnalyzeChance(ns, server) {
    try { return ns.hackAnalyzeChance(server); } catch { return 0; }
}

export function getPidFromCache(processCache, script) {
    script.host ??= "home";
    script.args ??= [];

    const processes = processCache.get(script.host) ?? [];

    const proc = processes.find(p =>
        p.filename === script.name &&
        sameArgs(p.args, script.args)
    );

    return proc ? proc.pid : 0;
}

export function buildProcessCache(ns, scripts) {
    const cache = new Map();
    const hosts = [...new Set(scripts.map(s => s.host ?? "home"))];

    for (const host of hosts) {
        try {
            cache.set(host, ns.ps(host));
        } catch {
            cache.set(host, []);
        }
    }

    return cache;
}

export function getScriptKey(script) {
    return `${script.host}:${script.name}:${JSON.stringify(script.args)}`;
}

export function sameArgs(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}

export function formatMoney(value) {
    if (value >= 1_000_000_000_000) return "$" + (value / 1_000_000_000_000).toFixed(2) + "t";
    if (value >= 1_000_000_000) return "$" + (value / 1_000_000_000).toFixed(2) + "b";
    if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "m";
    if (value >= 1_000) return "$" + (value / 1_000).toFixed(2) + "k";
    return "$" + value.toFixed(0);
}