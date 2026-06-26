import {
    maxExpThreadsPerProcess,
    weakenScript,
} from "/lib/uhm/config.js";

import {
    safeServerExists,
} from "/lib/uhm/safe.js";

// Legacy fallback. Active EXP mode now uses the precise HGW batch path in
// runner.js. Keep this file only as an emergency rollback reference.
export function runExpFallback(ns, target, hosts) {
    let launchedThreads = 0;

    for (const hostInfo of hosts) {
        if (!safeServerExists(ns, hostInfo.host)) continue;

        const scriptRam = ns.getScriptRam(weakenScript);

        while (true) {
            const threads = Math.min(
                maxExpThreadsPerProcess,
                Math.floor(hostInfo.freeRam / scriptRam)
            );

            if (threads <= 0) break;

            const pid = ns.exec(weakenScript, hostInfo.host, threads, target, launchedThreads);

            if (pid === 0) break;

            hostInfo.freeRam -= threads * scriptRam;
            launchedThreads += threads;
        }
    }

    return launchedThreads;
}
