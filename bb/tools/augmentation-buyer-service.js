//tools/augmentation-buyer-service.js
import { STATE_FILE } from "/lib/daemon/config.js";
import { buildAugmentationPlan } from "/lib/daemon/augmentations.js";
import { clearStaleFactionPlans } from "/lib/daemon/faction-plan-cleanup.js";

const AUGMENTATION_EVENTS_FILE = "/data/augmentation-events.txt";
const AUGMENTATION_BUYER_STATE_FILE = "/data/augmentation-buyer-state.txt";

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
        const baseState = {
            updatedAt: Date.now(),
            mode: daemonState?.mode ?? "unknown",
            priority: policy.priority ?? "unknown",
            allowBuying,
            forceBuy,
            policyAllowAugmentPurchases: policy.allowAugmentPurchases === true,
            reserveMoney,
            maxPrice,
            planReady: plan.ready === true,
            nextGoal: summarizeGoal(plan.nextGoal),
            planBlockedReason: plan.blockedReason ?? "unknown",
        };

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
            writeBuyerState(ns, {
                ...baseState,
                status: "blocked",
                blockedReason: plan.blockedReason ?? "No augmentation goal.",
            });
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
            writeBuyerState(ns, {
                ...baseState,
                status: "blocked",
                blockedReason:
                    !allowBuying
                        ? "Daemon policy has augmentation purchases turned off."
                        : plan.blockedReason ?? "Augmentation plan is not ready.",
            });
            await ns.sleep(refreshMs);
            continue;
        }

        const livePrice = safeAugPrice(ns, goal.name);
        const liveRepReq = safeAugRepReq(ns, goal.name);
        const liveFactionRep = safeFactionRep(ns, goal.faction);

        const spendable =
            Math.max(0, ns.getPlayer().money - reserveMoney);

        if (livePrice > maxPrice) {
            writeBuyerState(ns, {
                ...baseState,
                status: "blocked",
                blockedReason: `${goal.name} is above max price.`,
                livePrice,
                liveRepReq,
                liveFactionRep,
                spendable,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (liveFactionRep < liveRepReq) {
            writeBuyerState(ns, {
                ...baseState,
                status: "blocked",
                blockedReason: `Need more live rep with ${goal.faction}.`,
                livePrice,
                liveRepReq,
                liveFactionRep,
                spendable,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (spendable < livePrice) {
            writeBuyerState(ns, {
                ...baseState,
                status: "blocked",
                blockedReason: `Need more spendable money for ${goal.name}.`,
                livePrice,
                liveRepReq,
                liveFactionRep,
                spendable,
            });
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

            // Rebuild augmentation cache/data.
            ns.run("/tools/augmentation-data-builder.js", 1, "--force");

            // IMPORTANT:
            // Immediately rebuild all progression plans.
            ns.run("/tools/refresh-augmentation-plans.js", 1);

            // Give filesystem time to update.
            await ns.sleep(2000);

            ns.print("[AUG] Progression plans refreshed after purchase.");
            writeBuyerState(ns, {
                ...baseState,
                status: "purchased",
                blockedReason: "",
                purchased: goal.name,
                purchasedFaction: goal.faction,
                livePrice,
                liveRepReq,
                liveFactionRep,
                spendable,
            });
        } else {
            writeBuyerState(ns, {
                ...baseState,
                status: "failed",
                blockedReason: `purchaseAugmentation returned false for ${goal.name}.`,
                livePrice,
                liveRepReq,
                liveFactionRep,
                spendable,
            });
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

function writeBuyerState(ns, state) {
    ns.write(AUGMENTATION_BUYER_STATE_FILE, JSON.stringify(state, null, 2), "w");
}

function summarizeGoal(goal) {
    if (!goal) return null;

    return {
        name: goal.name,
        faction: goal.faction,
        price: goal.price,
        rep: goal.rep,
        factionRep: goal.factionRep,
        hasRep: goal.hasRep === true,
        affordable: goal.affordable === true,
        hasPrereqs: goal.hasPrereqs === true,
    };
}
function stopFactionWorkIfRunning(ns) {
    try {
        const work = ns.singularity.getCurrentWork();

        if (work?.type === "FACTION") {
            ns.singularity.stopAction();
            ns.tprint("[AUG] Stopped faction work after augmentation purchase.");
        }
    } catch (error) {
    console.error(error);
}
}

