//augmentation-decision.js
const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const FACTION_DONATION_PLAN_FILE = "/data/faction-donation-plan.txt";

export function getAugmentationDecision(ns) {
    const augPlan = readJson(ns, AUGMENTATION_PLAN_FILE);
    const factionWork = readJson(ns, FACTION_WORK_PLAN_FILE);
    const donationPlan = readJson(ns, FACTION_DONATION_PLAN_FILE);

    const goal = augPlan?.nextGoal ?? null;

    if (!goal) {
        return {
            modeHint: "money",
            priorityHint: "income",
            reason: "No augmentation goal found.",
            shouldWorkFaction: false,
            shouldDonateFaction: false,
            shouldEarnMoney: true,
            shouldBuyAugment: false,
        };
    }

    if (augPlan.ready === true) {
        return {
            modeHint: "progression",
            priorityHint: "progression",
            reason: `${goal.name} is ready to buy.`,
            shouldWorkFaction: false,
            shouldDonateFaction: false,
            shouldEarnMoney: false,
            shouldBuyAugment: true,
            targetFaction: goal.faction,
            targetAugmentation: goal.name,
        };
    }

    if (donationPlan?.ready === true) {
        return {
            modeHint: "progression",
            priorityHint: "progression",
            reason: donationPlan.reason,
            shouldWorkFaction: false,
            shouldDonateFaction: true,
            shouldEarnMoney: false,
            shouldBuyAugment: false,
            targetFaction: donationPlan.targetFaction,
            targetAugmentation: donationPlan.targetAugmentation,
            missingRep: donationPlan.missingRep,
            estimatedDonation: donationPlan.estimatedDonation,
        };
    }

    if (factionWork?.active === true && factionWork?.missingRep > 0) {
        return {
            modeHint: "progression",
            priorityHint: "progression",
            reason: factionWork.reason,
            shouldWorkFaction: true,
            shouldDonateFaction: false,
            shouldEarnMoney: false,
            shouldBuyAugment: false,
            targetFaction: factionWork.targetFaction,
            targetAugmentation: factionWork.targetAugmentation,
            missingRep: factionWork.missingRep,
        };
    }

    if (goal.hasRep === true && goal.affordable !== true) {
        return {
            modeHint: "money",
            priorityHint: "income",
            reason: `Need money for ${goal.name}.`,
            shouldWorkFaction: false,
            shouldDonateFaction: false,
            shouldEarnMoney: true,
            shouldBuyAugment: false,
            targetFaction: goal.faction,
            targetAugmentation: goal.name,
            missingMoney: Math.max(0, goal.price - (augPlan.spendable ?? 0)),
        };
    }

    return {
        modeHint: "money",
        priorityHint: "income",
        reason: augPlan.blockedReason ?? "Augmentation goal blocked.",
        shouldWorkFaction: false,
        shouldDonateFaction: false,
        shouldEarnMoney: true,
        shouldBuyAugment: false,
    };
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