import {
    maxExpThreadsPerProcess,
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
