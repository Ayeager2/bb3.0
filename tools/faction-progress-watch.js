import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";
import { buildFactionDonationPlan } from "/lib/daemon/faction-donations.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const workPlan = buildFactionWorkPlan(ns);
    const donationPlan = buildFactionDonationPlan(ns);

    ns.tprint("Faction Progress");
    ns.tprint("=".repeat(60));
    ns.tprint(buildStatus(workPlan, donationPlan));

    if (!workPlan?.targetFaction) return;

    ns.tprint("-".repeat(60));
    ns.tprint(`Faction: ${workPlan.targetFaction}`);
    ns.tprint(`Augmentation: ${workPlan.targetAugmentation}`);
    ns.tprint(`Current Rep: ${formatNumber(workPlan.currentRep)}`);
    ns.tprint(`Target Rep: ${formatNumber(workPlan.targetRep)}`);
    ns.tprint(`Missing Rep: ${formatNumber(workPlan.missingRep)}`);
    ns.tprint(`Work Type: ${workPlan.workType ?? "none"}`);

    ns.tprint("-".repeat(60));
    ns.tprint(`Donation Active: ${donationPlan.active ? "YES" : "NO"}`);
    ns.tprint(`Donation Ready: ${donationPlan.ready ? "YES" : "NO"}`);
    ns.tprint(`Donation Reason: ${donationPlan.reason ?? "none"}`);

    if (donationPlan.active) {
        ns.tprint(`Favor: ${formatNumber(donationPlan.favor)} / ${formatNumber(donationPlan.favorToDonate)}`);
        ns.tprint(`Estimated Donation: ${formatMoney(donationPlan.estimatedDonation)}`);
        ns.tprint(`Spendable: ${formatMoney(donationPlan.spendable)}`);
    }
}

function buildStatus(workPlan, donationPlan) {
    if (!workPlan?.targetFaction) {
        return "No active faction rep target.";
    }

    if (workPlan.missingRep <= 0) {
        return `${workPlan.targetFaction} rep target met for ${workPlan.targetAugmentation}.`;
    }

    if (donationPlan?.ready === true) {
        return `${workPlan.targetFaction}: donation ready for ${workPlan.targetAugmentation}.`;
    }

    return `${workPlan.targetFaction}: need ${formatNumber(workPlan.missingRep)} more rep for ${workPlan.targetAugmentation}.`;
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