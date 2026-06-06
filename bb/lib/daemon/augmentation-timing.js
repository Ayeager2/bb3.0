import { getCloudFleetStatus } from "/lib/daemon/cloud-fleet.js";

export const AUGMENTATION_TIMING_THRESHOLDS = {
    value: {
        high: 1200,
        medium: 500,
    },
    rep: {
        close: 100_000,
        medium: 1_000_000,
    },
    money: {
        closeFlat: 1_000_000_000,
        closeCurrentMoneyRatio: 0.25,
        mediumFlat: 5_000_000_000,
        mediumCurrentMoneyRatio: 1.0,
    },
    cloud: {
        soonCostToMoneyRatio: 1.5,
        farCostToMoneyRatio: 10,
    },
};

export function buildAugmentationTiming(ns, options = {}) {
    const augPlan = options.augPlan ?? {};
    const factionWork = options.factionWork ?? {};
    const donationPlan = options.donationPlan ?? {};
    const cloudFleet = options.cloudFleet ?? getCloudFleetStatus(ns);
    const player = ns.getPlayer();
    const goal = augPlan?.nextGoal ?? null;

    if (!goal) {
        return {
            recommendation: "money-heavy",
            shouldFullFaction: false,
            allowBackgroundFaction: false,
            stayMoneyHeavy: true,
            reason: "No augmentation goal found; keep money as the default.",
            thresholds: AUGMENTATION_TIMING_THRESHOLDS,
        };
    }

    const missingRep =
        Math.max(
            0,
            Number(factionWork?.missingRep) ||
            Number(goal.rep ?? 0) - Number(goal.factionRep ?? 0)
        );
    const missingMoney =
        Math.max(
            0,
            Number(goal.price ?? 0) -
            Number(augPlan?.spendable ?? player.money ?? 0)
        );

    const valueScore = getAugmentationValueScore(goal);
    const valueBucket = getValueBucket(valueScore, goal);
    const repBucket = getRepBucket(missingRep);
    const moneyBucket = getMoneyBucket(missingMoney, player.money);
    const cloudBucket = getCloudBucket(cloudFleet, player.money);

    const highValue =
        valueBucket === "critical" ||
        valueBucket === "high";
    const stagePolicy = goal.stagePolicy ?? null;
    const criticalStage =
        stagePolicy?.buyReadiness === "finish-now" ||
        stagePolicy?.urgency === "critical";
    const repClose =
        missingRep > 0 &&
        (repBucket === "close" || repBucket === "medium");
    const moneyClose =
        missingMoney > 0 &&
        (moneyBucket === "close" || moneyBucket === "medium");
    const cloudSoon =
        cloudBucket === "now" ||
        cloudBucket === "soon";
    const cloudFar =
        cloudBucket === "complete" ||
        cloudBucket === "far" ||
        cloudBucket === "unknown";

    if (augPlan.ready === true) {
        return makeTiming({
            recommendation: "buy-now",
            shouldFullFaction: true,
            allowBackgroundFaction: false,
            stayMoneyHeavy: false,
            reason: `${goal.name} is ready to buy.`,
            goal,
            missingRep,
            missingMoney,
            valueScore,
            valueBucket,
            repBucket,
            moneyBucket,
            cloudBucket,
            cloudFleet,
        });
    }

    if (donationPlan?.ready === true) {
        return makeTiming({
            recommendation: "donate-now",
            shouldFullFaction: true,
            allowBackgroundFaction: false,
            stayMoneyHeavy: false,
            reason: `Donation is ready for ${goal.faction}; finish reputation now.`,
            goal,
            missingRep,
            missingMoney,
            valueScore,
            valueBucket,
            repBucket,
            moneyBucket,
            cloudBucket,
            cloudFleet,
        });
    }

    if (missingRep > 0) {
        const shouldFullFaction =
            (criticalStage || highValue) &&
            repClose &&
            (cloudFar || cloudFleet.maxed === true);

        return makeTiming({
            recommendation: shouldFullFaction
                ? "full-faction"
                : "background-faction",
            shouldFullFaction,
            allowBackgroundFaction: true,
            stayMoneyHeavy: !shouldFullFaction,
            reason: shouldFullFaction
                ? `${goal.name} is ${stagePolicy?.stage ?? "high-value"} stage work and the rep gap is close enough; switch fully to faction work.`
                : `${goal.name} still needs rep; work it in the background while money remains primary.`,
            goal,
            missingRep,
            missingMoney,
            valueScore,
            valueBucket,
            repBucket,
            moneyBucket,
            cloudBucket,
            cloudFleet,
        });
    }

    if (missingMoney > 0) {
        const shouldFullFaction =
            (criticalStage || highValue) &&
            moneyClose &&
            cloudFar;

        return makeTiming({
            recommendation: shouldFullFaction
                ? "full-faction"
                : "money-heavy",
            shouldFullFaction,
            allowBackgroundFaction: false,
            stayMoneyHeavy: !shouldFullFaction || cloudSoon,
            reason: shouldFullFaction
                ? `${goal.name} is ${stagePolicy?.stage ?? "high-value"} stage work and nearly affordable; progression can lead.`
                : `${goal.name} needs money; keep money lanes primary.`,
            goal,
            missingRep,
            missingMoney,
            valueScore,
            valueBucket,
            repBucket,
            moneyBucket,
            cloudBucket,
            cloudFleet,
        });
    }

    return makeTiming({
        recommendation: "wait",
        shouldFullFaction: false,
        allowBackgroundFaction: false,
        stayMoneyHeavy: true,
        reason: `${goal.name} is blocked by prerequisites or unavailable plan state.`,
        goal,
        missingRep,
        missingMoney,
        valueScore,
        valueBucket,
        repBucket,
        moneyBucket,
        cloudBucket,
        cloudFleet,
    });
}

function makeTiming(data) {
    return {
        recommendation: data.recommendation,
        shouldFullFaction: data.shouldFullFaction,
        allowBackgroundFaction: data.allowBackgroundFaction,
        stayMoneyHeavy: data.stayMoneyHeavy,
        reason: data.reason,
        targetFaction: data.goal?.faction ?? null,
        targetAugmentation: data.goal?.name ?? null,
        missingRep: data.missingRep,
        missingMoney: data.missingMoney,
        valueScore: data.valueScore,
        valueBucket: data.valueBucket,
        repBucket: data.repBucket,
        moneyBucket: data.moneyBucket,
        cloudBucket: data.cloudBucket,
        cloudNextAction: data.cloudFleet?.nextAction ?? null,
        thresholds: AUGMENTATION_TIMING_THRESHOLDS,
    };
}

function getAugmentationValueScore(goal) {
    if (!goal) return 0;
    if (String(goal.name).toLowerCase().includes("red pill")) {
        return Number.MAX_SAFE_INTEGER;
    }

    const statValue =
        Object.values(goal.statBreakdown ?? {})
            .reduce((sum, value) => sum + (Number(value) || 0), 0);

    return Math.max(
        Number(goal.score) || 0,
        statValue
    );
}

function getValueBucket(score, goal) {
    const tags = new Set(goal?.tags ?? []);

    if (
        tags.has("red-pill") ||
        tags.has("progression") ||
        score === Number.MAX_SAFE_INTEGER
    ) {
        return "critical";
    }

    if (score >= AUGMENTATION_TIMING_THRESHOLDS.value.high) return "high";
    if (score >= AUGMENTATION_TIMING_THRESHOLDS.value.medium) return "medium";
    return "low";
}

function getRepBucket(missingRep) {
    if (missingRep <= 0) return "ready";
    if (missingRep <= AUGMENTATION_TIMING_THRESHOLDS.rep.close) return "close";
    if (missingRep <= AUGMENTATION_TIMING_THRESHOLDS.rep.medium) return "medium";
    return "far";
}

function getMoneyBucket(missingMoney, currentMoney) {
    if (missingMoney <= 0) return "ready";
    if (
        missingMoney <= Math.max(
            AUGMENTATION_TIMING_THRESHOLDS.money.closeFlat,
            currentMoney * AUGMENTATION_TIMING_THRESHOLDS.money.closeCurrentMoneyRatio
        )
    ) {
        return "close";
    }

    if (
        missingMoney <= Math.max(
            AUGMENTATION_TIMING_THRESHOLDS.money.mediumFlat,
            currentMoney * AUGMENTATION_TIMING_THRESHOLDS.money.mediumCurrentMoneyRatio
        )
    ) {
        return "medium";
    }
    return "far";
}

function getCloudBucket(cloudFleet, currentMoney) {
    if (!cloudFleet?.available || cloudFleet?.maxed) return "complete";
    if (cloudFleet?.nextActionAffordable) return "now";

    const cost = Number(cloudFleet?.nextAction?.cost ?? 0);
    if (!Number.isFinite(cost) || cost <= 0) return "unknown";
    if (
        cost <=
        currentMoney * AUGMENTATION_TIMING_THRESHOLDS.cloud.soonCostToMoneyRatio
    ) {
        return "soon";
    }

    if (
        cost >=
        currentMoney * AUGMENTATION_TIMING_THRESHOLDS.cloud.farCostToMoneyRatio
    ) {
        return "far";
    }

    return "medium";
}
