const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";

export function getAugmentationDecision(ns) {
    const augPlan = readJson(ns, AUGMENTATION_PLAN_FILE);
    const factionWork = readJson(ns, FACTION_WORK_PLAN_FILE);

    const goal = augPlan?.nextGoal ?? null;

    if (!goal) {
        return {
            modeHint: "money",
            priorityHint: "income",
            reason: "No augmentation goal found.",
            shouldWorkFaction: false,
            shouldEarnMoney: true,
            shouldBuyAugment: false,
        };
    }

    if (factionWork?.active === true && factionWork?.missingRep > 0) {
        return {
            modeHint: "faction",
            priorityHint: "faction",
            reason: factionWork.reason,
            shouldWorkFaction: true,
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
            shouldEarnMoney: true,
            shouldBuyAugment: false,
            targetFaction: goal.faction,
            targetAugmentation: goal.name,
            missingMoney: Math.max(0, goal.price - (augPlan.spendable ?? 0)),
        };
    }

    if (augPlan.ready === true) {
        return {
            modeHint: "faction",
            priorityHint: "faction",
            reason: `${goal.name} is ready to buy.`,
            shouldWorkFaction: false,
            shouldEarnMoney: false,
            shouldBuyAugment: true,
            targetFaction: goal.faction,
            targetAugmentation: goal.name,
        };
    }

    return {
        modeHint: "money",
        priorityHint: "income",
        reason: augPlan.blockedReason ?? "Augmentation goal blocked.",
        shouldWorkFaction: false,
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