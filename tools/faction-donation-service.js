import { STATE_FILE } from "/lib/daemon/config.js";
import { buildFactionDonationPlan } from "/lib/daemon/faction-donations.js";
import { clearStaleFactionPlans } from "/lib/daemon/faction-plan-cleanup.js";

const DONATION_EVENTS_FILE = "/data/faction-donation-events.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["reserve", 1_000_000_000],
        ["force", "false"],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const fallbackReserve = Number(flags.reserve) || 1_000_000_000;
    const force = String(flags.force).toLowerCase() === "true";

    while (true) {
        const daemonState = readJson(ns, STATE_FILE);
        const policy = daemonState?.spendingPolicy ?? {};
        const reserveMoney = Number.isFinite(policy.reserveMoney)
            ? policy.reserveMoney
            : fallbackReserve;

        const plan = buildFactionDonationPlan(ns, { reserveMoney });

        const allowDonation =
            policy.allowFactionDonation === true ||
            force === true;

        ns.clearLog();
        ns.print("Faction Donation Service");
        ns.print("=".repeat(60));
        ns.print(`Allow Donation: ${allowDonation ? "YES" : "NO"}`);
        ns.print(`Ready: ${plan.ready ? "YES" : "NO"}`);
        ns.print(`Reason: ${plan.reason}`);

        if (!allowDonation || !plan.ready) {
            await ns.sleep(refreshMs);
            continue;
        }

        const moneyBefore = ns.getPlayer().money;
        const donated = safeDonate(ns, plan.targetFaction, plan.estimatedDonation);
        const moneyAfter = ns.getPlayer().money;

        if (donated) {
            const actualCost = Math.max(0, moneyBefore - moneyAfter);
            const message =
                `[FACTION DONATION] Donated ${ns.format.number(actualCost)} to ${plan.targetFaction} for ${plan.targetAugmentation}.`;

            ns.tprint(message);
            ns.toast(message, "success", 8000);
            ns.write(DONATION_EVENTS_FILE, `[${new Date().toLocaleTimeString()}] ${message}\n`, "a");

            logPurchase(ns, {
                source: "faction-donation",
                type: "faction-rep",
                item: `${plan.targetFaction} rep for ${plan.targetAugmentation}`,
                cost: actualCost,
                moneyBefore,
                moneyAfter,
                message,
            });
            clearStaleFactionPlans(ns);
            refreshAugmentationCache(ns);
        }

        await ns.sleep(refreshMs);
    }
}

function safeDonate(ns, faction, amount) {
    try {
        return ns.singularity.donateToFaction(faction, amount);
    } catch {
        return false;
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

function refreshAugmentationCache(ns) {
    try {
        ns.run("/tools/augmentation-data-builder.js", 1, "--force");
    } catch (error) {
    console.error(error);
}
}