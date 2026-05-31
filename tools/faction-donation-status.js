import { buildFactionDonationPlan } from "/lib/daemon/faction-donations.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["reserve", 1_000_000_000],
    ]);

    const plan = buildFactionDonationPlan(ns, {
        reserveMoney: Number(flags.reserve) || 1_000_000_000,
    });

    ns.tprint("Faction Donation Plan");
    ns.tprint("=".repeat(60));
    ns.tprint(`Active: ${plan.active ? "YES" : "NO"}`);
    ns.tprint(`Ready: ${plan.ready ? "YES" : "NO"}`);
    ns.tprint(`Reason: ${plan.reason}`);

    if (!plan.active) return;

    ns.tprint("-".repeat(60));
    ns.tprint(`Faction: ${plan.targetFaction}`);
    ns.tprint(`Augmentation: ${plan.targetAugmentation}`);
    ns.tprint(`Missing Rep: ${formatNumber(plan.missingRep)}`);
    ns.tprint(`Favor: ${formatNumber(plan.favor)} / ${formatNumber(plan.favorToDonate)}`);
    ns.tprint(`Spendable: ${formatMoney(plan.spendable)}`);
    ns.tprint(`Estimated Donation: ${formatMoney(plan.estimatedDonation)}`);
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