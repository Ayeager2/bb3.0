import { getPidFromCache, buildProcessCache, getScriptKey } from "/lib/daemon/safe.js";

export function killOtherDaemonInstances(ns) {
    const currentPid = ns.pid;
    const currentScript = ns.getScriptName();

    for (const proc of ns.ps("home")) {
        if (proc.filename !== currentScript) continue;
        if (proc.pid === currentPid) continue;

        ns.kill(proc.pid);
    }
}

export function cleanDaemonManagedProcesses(ns, scripts) {
    for (const script of scripts) {
        if (script.name === ns.getScriptName()) continue;
        ns.scriptKill(script.name, script.host ?? "home");
    }

    ns.scriptKill("/workers/share-worker.js", "home");
}

export function manageShareWorkers(ns, state) {
    if (!state.sharePolicy?.enabled) {
        ns.scriptKill("/workers/share-worker.js", "home");
        return;
    }

    const maxRam = ns.getServerMaxRam("home");
    const usedRam = ns.getServerUsedRam("home");
    const freeRam = Math.max(0, maxRam - usedRam);

    const reserve = maxRam * state.sharePolicy.reserveRamPercent;
    const usableRam = Math.max(0, freeRam - reserve);

    const ramPerThread = ns.getScriptRam("/workers/share-worker.js");
    if (ramPerThread <= 0) return;

    const threads = Math.floor(usableRam / ramPerThread);
    const current = ns.getRunningScript("/workers/share-worker.js", "home");

    if (threads <= 0) {
        ns.scriptKill("/workers/share-worker.js", "home");
        return;
    }

    if (current?.threads === threads) return;

    ns.scriptKill("/workers/share-worker.js", "home");
    ns.exec("/workers/share-worker.js", "home", threads);
}

export function startScripts(ns, scripts, startedOnce, completedOnce, openedTails, state) {
    for (const script of scripts) {
        script.host ??= "home";
        script.threads ??= 1;
        script.args ??= [];
        script.tail ??= false;
        script.keepAlive ??= false;

        if (script.requiresSingularity && !state.capabilities?.singularity) continue;
        if (!ns.fileExists(script.name, script.host)) continue;

        if (script.name === "/economy/scaleingServerPurchase.js" && !state.spendingPolicy.allowServerPurchases) continue;
        if (script.name === "/economy/stock-trader.js" && !state.spendingPolicy.allowStockTrading) continue;
        if (script.name === "justhacknet.js" && !state.spendingPolicy.allowHacknet) continue;

        const running = ns.isRunning(script.name, script.host, ...script.args);
        if (running) continue;

        const key = getScriptKey(script);
        const hasStartedBefore = startedOnce.has(key);
        const shouldRestart = script.keepAlive === true;

        if (hasStartedBefore && !shouldRestart) continue;
        if (completedOnce.has(key) && !shouldRestart) continue;

        const pid = ns.exec(script.name, script.host, script.threads, ...script.args);
        if (pid === 0) continue;

        startedOnce.add(key);

        if (script.tail && !openedTails.has(pid)) {
            ns.ui.openTail(pid);
            openedTails.add(pid);
        }
    }
}

export function updateCompletedStatus(ns, scripts, startedOnce, completedOnce) {
    for (const script of scripts) {
        script.host ??= "home";
        script.threads ??= 1;
        script.args ??= [];
        script.tail ??= false;
        script.keepAlive ??= false;

        const key = getScriptKey(script);
        if (!startedOnce.has(key)) continue;
        if (script.keepAlive === true) continue;

        const running = ns.isRunning(script.name, script.host, ...script.args);
        if (!running) completedOnce.add(key);
    }
}

export function layoutRunningTails(ns, scripts, openedTails) {
    const processCache = buildProcessCache(ns, scripts);

    for (const script of scripts) {
        script.host ??= "home";
        script.threads ??= 1;
        script.args ??= [];
        script.tail ??= false;
        script.keepAlive ??= false;

        if (!script.tail) continue;

        const pid = getPidFromCache(processCache, script);
        if (pid === 0) continue;

        if (!openedTails.has(pid)) {
            ns.ui.openTail(pid);
            openedTails.add(pid);
        }
    }
}