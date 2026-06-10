/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["target", "n00dles"],
        ["stop-home-ram", 64],
        ["reserve", 8],
    ]);

    const target = String(flags.target);
    const stopHomeRam = Number(flags["stop-home-ram"]) || 64;
    const reserveRam = Number(flags.reserve) || 8;

    while (true) {
        if (ns.getServerMaxRam("home") >= stopHomeRam) {
            ns.tprint(`[BOOTSTRAP] Complete. Home RAM reached ${ns.format.ram(ns.getServerMaxRam("home"))}.`);
            return;
        }

        if (!ns.hasRootAccess(target)) {
            try { ns.nuke(target); } catch (error) {
    console.error(error);
}
        }

        const maxRam = ns.getServerMaxRam("home");
        const usedRam = ns.getServerUsedRam("home");
        const freeRam = Math.max(0, maxRam - usedRam - reserveRam);

        const worker = "/workers/tiny-worker.js";
        const ramPerThread = ns.getScriptRam(worker, "home");

        if (ramPerThread <= 0 || freeRam < ramPerThread) {
            await ns.sleep(5000);
            continue;
        }

        const threads = Math.min(8, Math.floor(freeRam / ramPerThread));

        if (threads > 0) {
            ns.write("/data/bootstrap-target.txt", target, "w");
            ns.exec(worker, "home", threads, "auto", Date.now());
        }

        await ns.sleep(5000);
    }
}
