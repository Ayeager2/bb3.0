//tools/refresh-augmentation-plans.js
import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";
import { buildFactionDonationPlan } from "/lib/daemon/faction-donations.js";
import { buildAugmentationPlan } from "/lib/daemon/augmentations.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const builderPid = ns.run("/tools/augmentation-data-builder.js", 1, "--force");

    if (builderPid !== 0) {
        await waitForProcess(ns, builderPid, 10000);
    } else {
        ns.tprint("[REFRESH] Augmentation data builder did not start; using existing augmentation data.");
    }

    const augPlan = buildAugmentationPlan(ns);
    const workPlan = buildFactionWorkPlan(ns);
    const donationPlan = buildFactionDonationPlan(ns);

    ns.tprint("[REFRESH] Augmentation/faction plans refreshed.");
    ns.tprint(`Aug: ${augPlan?.nextGoal?.name ?? "none"} | ${augPlan?.blockedReason ?? "ok"}`);
    ns.tprint(`Work: ${workPlan?.reason ?? "none"}`);
    ns.tprint(`Donation: ${donationPlan?.reason ?? "none"}`);
}

async function waitForProcess(ns, pid, timeoutMs) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            if (!ns.isRunning(pid)) return true;
        } catch {
            return true;
        }

        await ns.sleep(250);
    }

    return false;
}
