// /tools/int-travel-farm.js

const CITIES = [
    "Sector-12",
    "Aevum",
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.ui.openTail();

    const flags = ns.flags([
        ["iterations", 0], // 0 = infinite
        ["status-every", 1000],
    ]);

    if (!ns.singularity?.travelToCity) {
        ns.tprint("[INT TRAVEL] Requires Singularity API.");
        return;
    }

    let loops = 0;
    let cityIndex = 0;

    const startInt = ns.getPlayer().intelligence ?? 0;
    const start = Date.now();

    while (true) {
        const city = CITIES[cityIndex];

        ns.singularity.travelToCity(city);

        loops++;
        cityIndex = (cityIndex + 1) % CITIES.length;

        if (loops % flags["status-every"] === 0) {
            const runtime = (Date.now() - start) / 1000;

            ns.clearLog();
            ns.print("=== INT TRAVEL FARM ===");
            ns.print(`Trips: ${loops.toLocaleString()}`);
            ns.print(`Runtime: ${runtime.toFixed(1)}s`);
            ns.print(`INT: ${ns.getPlayer().intelligence}`);
            ns.print(`INT gained: ${(ns.getPlayer().intelligence - startInt).toFixed(4)}`);
            ns.print(`Trips/sec: ${(loops / runtime).toFixed(2)}`);
        }

        if (
            flags.iterations > 0 &&
            loops >= flags.iterations
        ) {
            break;
        }

        await ns.sleep(0);
    }
}