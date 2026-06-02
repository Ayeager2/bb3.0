//tools/refresh-augmentation-plans.js
import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";
import { buildFactionDonationPlan } from "/lib/daemon/faction-donations.js";
import { buildAugmentationPlan } from "/lib/daemon/augmentations.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    ns.run("/tools/augmentation-data-builder.js", 1, "--force");

    await ns.sleep(1000);

    const augPlan = buildAugmentationPlan(ns);
    const workPlan = buildFactionWorkPlan(ns);
    const donationPlan = buildFactionDonationPlan(ns);

    ns.tprint("[REFRESH] Augmentation/faction plans refreshed.");
    ns.tprint(`Aug: ${augPlan?.nextGoal?.name ?? "none"} | ${augPlan?.blockedReason ?? "ok"}`);
    ns.tprint(`Work: ${workPlan?.reason ?? "none"}`);
    ns.tprint(`Donation: ${donationPlan?.reason ?? "none"}`);
}