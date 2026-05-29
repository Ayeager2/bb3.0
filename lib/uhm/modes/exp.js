import {
    weakenScript,
} from "/lib/uhm/config.js";

import {
    safeServerExists,
} from "/lib/uhm/safe.js";

export function runExpFallback(ns, target, hosts) {
    let launchedThreads = 0;

    for (const hostInfo of hosts) {
        if (!safeServerExists(ns, hostInfo.host)) continue;

        const scriptRam = ns.getScriptRam(weakenScript);
        const threads = Math.floor(hostInfo.freeRam / scriptRam);

        if (threads <= 0) continue;

        const pid = ns.exec(weakenScript, hostInfo.host, threads, target, 0);

        if (pid !== 0) {
            hostInfo.freeRam -= threads * scriptRam;
            launchedThreads += threads;
        }
    }

    return launchedThreads;
}