const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const AUGMENTATION_STATE_FILE = "/data/augmentation-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const plan = readJson(ns, AUGMENTATION_PLAN_FILE);
    const state = readJson(ns, AUGMENTATION_STATE_FILE);

    if (!plan?.updatedAt) {
        ns.tprint("No augmentation plan found.");
        ns.tprint("Run:");
        ns.tprint("run /tools/augmentation-data-builder.js --force");
        ns.tprint("run /tools/augmentation-buyer-service.js --force-buy false");
        return;
    }

    ns.tprint("Augmentation Status");
    ns.tprint("=".repeat(60));
    ns.tprint(`Updated: ${new Date(plan.updatedAt).toLocaleTimeString()}`);
    ns.tprint(`BitNode: ${plan.bitNode ?? "unknown"}`);
    ns.tprint(`Money: ${formatMoney(plan.money ?? 0)}`);
    ns.tprint(`Reserve: ${formatMoney(plan.reserveMoney ?? 0)}`);
    ns.tprint(`Spendable: ${formatMoney(plan.spendable ?? 0)}`);
    ns.tprint(`Max Price: ${formatMoney(plan.maxPrice ?? 0)}`);
    ns.tprint(`Cached Factions: ${state?.factionCount ?? 0}`);
    ns.tprint(`Unique Augs: ${state?.uniqueAugmentationCount ?? 0}`);
    ns.tprint("-".repeat(60));

    if (!plan.nextGoal) {
        ns.tprint(`No next goal: ${plan.blockedReason ?? "unknown"}`);
        return;
    }

    const g = plan.nextGoal;

    ns.tprint(`Next Goal: ${g.name}`);
    ns.tprint(`Faction: ${g.faction}`);
    ns.tprint(`Theme: ${g.theme}`);
    ns.tprint(`Tags: ${(g.tags ?? []).join(", ")}`);
    if (g.statBreakdown) {
        ns.tprint("Stat Breakdown:");

        for (const [key, value] of Object.entries(g.statBreakdown)) {
            if (Number(value) > 0) {
                ns.tprint(`  ${key}: ${Number(value).toFixed(2)}`);
            }
        }
    }
    ns.tprint(`Score: ${Number(g.score ?? 0).toFixed(2)}`);
    ns.tprint(`Price: ${formatMoney(g.price)}`);
    ns.tprint(`Rep Required: ${formatNumber(g.rep)}`);
    ns.tprint(`Faction Rep: ${formatNumber(g.factionRep)}`);
    ns.tprint(`Has Rep: ${g.hasRep ? "YES" : "NO"}`);
    ns.tprint(`Affordable: ${g.affordable ? "YES" : "NO"}`);
    ns.tprint(`Prereqs: ${g.hasPrereqs ? "OK" : (g.prereqs ?? []).join(", ")}`);
    ns.tprint("-".repeat(60));
    ns.tprint(`Ready: ${plan.ready ? "YES" : "NO"}`);
    ns.tprint(`Status: ${plan.blockedReason ?? "unknown"}`);

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
    if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "k";
    return n.toFixed(0);
}