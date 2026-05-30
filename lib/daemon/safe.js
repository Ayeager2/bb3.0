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
    try {
        return ns.getServerMaxMoney(server);
    } catch {
        return 0;
    }
}

export function safeGetServerMoneyAvailable(ns, server) {
    try {
        return ns.getServerMoneyAvailable(server);
    } catch {
        return 0;
    }
}

export function safeGetServerSecurityLevel(ns, server) {
    try {
        return ns.getServerSecurityLevel(server);
    } catch {
        return 999;
    }
}

export function safeGetServerMinSecurityLevel(ns, server) {
    try {
        return ns.getServerMinSecurityLevel(server);
    } catch {
        return 1;
    }
}

export function safeGetServerGrowth(ns, server) {
    try {
        return ns.getServerGrowth(server);
    } catch {
        return 0;
    }
}

export function safeGetWeakenTime(ns, server) {
    try {
        return ns.getWeakenTime(server);
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

export function safeHackAnalyzeChance(ns, server) {
    try {
        return ns.hackAnalyzeChance(server);
    } catch {
        return 0;
    }
}

export function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}

export function readJson(ns, file, fallback = {}) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;

        const raw = ns.read(file);
        if (!raw.trim()) return fallback;

        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function formatMoney(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "$0";

    if (n >= 1_000_000_000_000) return "$" + (n / 1_000_000_000_000).toFixed(2) + "t";
    if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "b";
    if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "m";
    if (n >= 1_000) return "$" + (n / 1_000).toFixed(2) + "k";

    return "$" + n.toFixed(0);
}

export function formatNumberShort(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "0";

    if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
    if (n >= 1_000) return (n / 1_000).toFixed(2) + "k";

    return n.toFixed(0);
}