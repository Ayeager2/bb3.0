//tools/augmentation-buyer-service.js
import { STATE_FILE } from "/lib/daemon/config.js";
import { buildAugmentationPlan } from "/lib/daemon/augmentations.js";
import { clearStaleFactionPlans } from "/lib/daemon/faction-plan-cleanup.js";

const AUGMENTATION_EVENTS_FILE = "/data/augmentation-events.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["max-price", 1_000_000_000_000],
        ["reserve", 1_000_000_000],

        ["use-policy-reserve", "true"],

        // Emergency/manual override only.
        ["force-buy", "false"],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const maxPrice = Number(flags["max-price"]) || 1_000_000_000_000;
    const fallbackReserve = Number(flags.reserve) || 1_000_000_000;

    const usePolicyReserve =
        String(flags["use-policy-reserve"]).toLowerCase() !== "false";

    const forceBuy =
        String(flags["force-buy"]).toLowerCase() === "true";

    while (true) {
        const daemonState = readJson(ns, STATE_FILE);
        const policy = daemonState?.spendingPolicy ?? {};

        const reserveMoney =
            usePolicyReserve && Number.isFinite(policy.reserveMoney)
                ? policy.reserveMoney
                : fallbackReserve;

        const allowBuying =
            policy.allowAugmentPurchases === true ||
            forceBuy === true;
        // ns.tprint(
        //     `[AUG DEBUG] usePolicyReserve=${usePolicyReserve} ` +
        //     `fallbackReserve=${fallbackReserve} ` +
        //     `reserveMoney=${reserveMoney}`
        // );
        const plan = buildAugmentationPlan(ns, {
            maxPrice,
            reserveMoney,
        });

        ns.clearLog();
        ns.print("Augmentation Buyer");
        ns.print("=".repeat(60));
        ns.print(`Mode: ${daemonState?.mode ?? "unknown"}`);
        ns.print(`Buying: ${allowBuying ? "ON" : "OFF"}`);
        ns.print(`Reserve: ${ns.format.number(reserveMoney)}`);
        ns.print(`Max Price: ${ns.format.number(maxPrice)}`);
        ns.print("-".repeat(60));

        if (!plan.nextGoal) {
            ns.print(plan.blockedReason);
            await ns.sleep(refreshMs);
            continue;
        }

        const goal = plan.nextGoal;

        ns.print(`Next: ${goal.name}`);
        ns.print(`Faction: ${goal.faction}`);
        ns.print(`Price: ${ns.format.number(goal.price)}`);
        ns.print(`Rep: ${ns.format.number(goal.rep)}`);
        ns.print(`Status: ${plan.blockedReason}`);

        if (!allowBuying || !plan.ready) {
            await ns.sleep(refreshMs);
            continue;
        }

        const livePrice = safeAugPrice(ns, goal.name);
        const liveRepReq = safeAugRepReq(ns, goal.name);
        const liveFactionRep = safeFactionRep(ns, goal.faction);

        const spendable =
            Math.max(0, ns.getPlayer().money - reserveMoney);

        if (livePrice > maxPrice) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (liveFactionRep < liveRepReq) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (spendable < livePrice) {
            await ns.sleep(refreshMs);
            continue;
        }

        const bought =
            safePurchaseAug(ns, goal.faction, goal.name);

        if (bought) {
            const message =
                `[AUG] Purchased ${goal.name} from ${goal.faction} for ${ns.format.number(livePrice)}.`;

            ns.tprint(message);
            ns.toast(message, "success", 8000);

            ns.write(
                AUGMENTATION_EVENTS_FILE,
                `[${new Date().toLocaleTimeString()}] ${message}\n`,
                "a"
            );
            stopFactionWorkIfRunning(ns);
            clearStaleFactionPlans(ns);
            ns.run("/tools/augmentation-data-builder.js", 1, "--force");
        }
        await ns.sleep(refreshMs);
    }
}

function safePurchaseAug(ns, faction, aug) {
    try {
        return ns.singularity.purchaseAugmentation(faction, aug);
    } catch {
        return false;
    }
}

function safeAugPrice(ns, aug) {
    try {
        return ns.singularity.getAugmentationPrice(aug);
    } catch {
        return Infinity;
    }
}

function safeAugRepReq(ns, aug) {
    try {
        return ns.singularity.getAugmentationRepReq(aug);
    } catch {
        return Infinity;
    }
}

function safeFactionRep(ns, faction) {
    try {
        return ns.singularity.getFactionRep(faction);
    } catch {
        return 0;
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
function stopFactionWorkIfRunning(ns) {
    try {
        const work = ns.singularity.getCurrentWork();

        if (work?.type === "FACTION") {
            ns.singularity.stopAction();
            ns.tprint("[AUG] Stopped faction work after augmentation purchase.");
        }
    } catch { }
}

