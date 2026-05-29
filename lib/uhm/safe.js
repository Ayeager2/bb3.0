export function safeServerExists(ns, server) {
    try { return !!server && ns.serverExists(server); } catch { return false; }
}

export function isUsableTarget(ns, server) {
    try {
        return safeServerExists(ns, server) &&
            ns.hasRootAccess(server) &&
            ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel();
    } catch { return false; }
}

export function safeGetServerMaxRam(ns, server) {
    try { return ns.getServerMaxRam(server); } catch { return 0; }
}

export function safeGetServerUsedRam(ns, server) {
    try { return ns.getServerUsedRam(server); } catch { return 0; }
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