const FACTION_STAGE_BY_FACTION = {
    CyberSec: "cybersec",
    NiteSec: "nitesec",
    "The Black Hand": "black-hand",
    BitRunners: "bitrunners",
    Daedalus: "daedalus",
};

const STAGE_PRIORITY = {
    "red-pill": 1000,
    daedalus: 900,
    bitrunners: 800,
    "black-hand": 700,
    nitesec: 600,
    cybersec: 500,
    side: 100,
};

export function getAugmentationStagePolicy(goal = {}) {
    const name = String(goal?.name ?? "");
    const lowerName = name.toLowerCase();
    const faction = goal?.faction ?? null;

    if (lowerName.includes("red pill")) {
        return makePolicy("red-pill", {
            priority: STAGE_PRIORITY["red-pill"],
            urgency: "critical",
            buyReadiness: "finish-now",
            factionWork: "full",
            moneyWork: "full",
            reason: "The Red Pill is the BN4 win condition unlock.",
        });
    }

    const stage = FACTION_STAGE_BY_FACTION[faction] ?? "side";

    if (stage === "daedalus") {
        return makePolicy(stage, {
            priority: STAGE_PRIORITY.daedalus,
            urgency: "high",
            buyReadiness: "finish-now",
            factionWork: "full",
            moneyWork: "full",
            reason: "Daedalus augmentations are late BN4 progression goals.",
        });
    }

    if (stage !== "side") {
        return makePolicy(stage, {
            priority: STAGE_PRIORITY[stage],
            urgency: stage === "bitrunners" ? "high" : "medium",
            buyReadiness: "stage-progress",
            factionWork: "background-until-close",
            moneyWork: "money-primary",
            reason: `${faction} is part of the BN4 hacking faction path.`,
        });
    }

    return makePolicy(stage, {
        priority: STAGE_PRIORITY.side,
        urgency: "low",
        buyReadiness: "opportunistic",
        factionWork: "background",
        moneyWork: "money-primary",
        reason: "This augmentation is not on the primary BN4 hacking faction path.",
    });
}

function makePolicy(stage, data) {
    return {
        stage,
        priority: data.priority,
        urgency: data.urgency,
        buyReadiness: data.buyReadiness,
        factionWork: data.factionWork,
        moneyWork: data.moneyWork,
        reason: data.reason,
    };
}
