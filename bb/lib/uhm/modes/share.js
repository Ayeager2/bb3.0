import { SHARE_WORKER, homeReserveRam } from "/lib/uhm/config.js";

/** @param {NS} ns **/
export async function runShareMode(ns, hosts, reserveRam = homeReserveRam, ramRatio = 1) {
    let launched = 0;
    let threadsLaunched = 0;

    const scriptRam = ns.getScriptRam(SHARE_WORKER, "home");

    for (const hostInfo of hosts) {
        const hostname =
            typeof hostInfo === "string"
                ? hostInfo
                : hostInfo.host ?? hostInfo.hostname ?? hostInfo.name;

        if (!hostname) continue;

        const maxRam = ns.getServerMaxRam(hostname);
        const usedRam = ns.getServerUsedRam(hostname);
        const freeRam = maxRam - usedRam;

        const reserved = hostname === "home" ? reserveRam : 0;
        const phaseBudget = maxRam * ramRatio;
        const usableRam = Math.max(0, Math.min(freeRam - reserved, phaseBudget));

        if (usableRam < scriptRam) continue;

        const threads = Math.floor(usableRam / scriptRam);
        if (threads <= 0) continue;

        const pid = ns.exec(SHARE_WORKER, hostname, threads);

        if (pid !== 0) {
            launched++;
            threadsLaunched += threads;
        }
    }

    return {
        launched,
        threadsLaunched,
    };
}