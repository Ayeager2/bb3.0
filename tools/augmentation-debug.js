const AUGMENTATION_STATE_FILE = "/data/augmentation-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    const state = readJson(ns, AUGMENTATION_STATE_FILE);
    const playerFactions = new Set(ns.getPlayer().factions ?? []);

    ns.tprint("Augmentation Debug");
    ns.tprint("=".repeat(60));
    ns.tprint(`Factions in cache: ${state?.factions?.length ?? 0}`);
    ns.tprint(`Player factions: ${[...playerFactions].join(", ") || "none"}`);

    for (const faction of state.factions ?? []) {
        if (!playerFactions.has(faction.faction)) continue;

        const augs = faction.augmentations ?? [];

        const available = augs.filter(a =>
            !a.owned &&
            !a.installed &&
            !a.queued &&
            a.name !== "NeuroFlux Governor"
        );

        ns.tprint("-".repeat(60));
        ns.tprint(`${faction.faction}`);
        ns.tprint(`Total: ${augs.length}`);
        ns.tprint(`Available non-owned: ${available.length}`);

        for (const aug of available.slice(0, 10)) {
            ns.tprint(
                `${aug.name} | price=${formatMoney(aug.price)} | rep=${formatNumber(aug.rep)} | ` +
                `hasRep=${aug.hasRep ? "YES" : "NO"} | owned=${aug.owned ? "YES" : "NO"} | queued=${aug.queued ? "YES" : "NO"}`
            );
        }
    }
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

function formatMoney(value) {
    return "$" + formatNumber(value);
}

function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "∞";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "t";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "b";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "m";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "k";
    return n.toFixed(0);
}