import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const plan = buildFactionWorkPlan(ns);

    ns.tprint("Faction Work Plan");
    ns.tprint("=".repeat(60));
    ns.tprint(`Active: ${plan.active ? "YES" : "NO"}`);
    ns.tprint(`Reason: ${plan.reason}`);

    if (!plan.targetFaction) return;

    ns.tprint("-".repeat(60));
    ns.tprint(`Faction: ${plan.targetFaction}`);
    ns.tprint(`Augmentation: ${plan.targetAugmentation}`);
    ns.tprint(`Current Rep: ${formatNumber(plan.currentRep)}`);
    ns.tprint(`Target Rep: ${formatNumber(plan.targetRep)}`);
    ns.tprint(`Missing Rep: ${formatNumber(plan.missingRep)}`);
    ns.tprint(`Suggested Work: ${plan.workType ?? "none"}`);
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