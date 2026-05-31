const FACTION_STATE_FILE = "/data/faction-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const state = readJson(ns, FACTION_STATE_FILE);

    if (!state?.spine) {
        ns.tprint("No faction-state.txt found. Is faction-observer-service.js running?");
        return;
    }

    ns.tprint("Faction Status");
    ns.tprint("=".repeat(60));
    ns.tprint(`Hacking: ${state.hackingLevel}`);
    ns.tprint(`Singularity: ${state.singularityEnabled ? "ON" : "OFF"}`);
    ns.tprint(`Joined: ${state.joined?.join(", ") || "none"}`);
    ns.tprint("-".repeat(60));

    for (const item of state.spine) {
        ns.tprint(
            `${item.joined ? "[x]" : "[ ]"} ${item.faction} ` +
            `server=${item.server} ` +
            `root=${item.rooted ? "YES" : "NO"} ` +
            `hack=${item.hackReady ? "YES" : "NO"}`
        );
    }

    ns.tprint("-".repeat(60));
    ns.tprint(`Next: ${state.nextGoal?.message ?? "unknown"}`);
}

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};
        const raw = ns.read(file);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}