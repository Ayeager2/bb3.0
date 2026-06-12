const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";

export function buildFactionWorkPlan(ns, options = {}) {
    const plan = readJson(ns, AUGMENTATION_PLAN_FILE);
    const player = ns.getPlayer();

    if (!plan?.nextGoal) {
        return writePlan(ns, {
            updatedAt: Date.now(),
            active: false,
            reason: "No augmentation nextGoal found.",
            targetFaction: null,
            targetRep: null,
            currentRep: null,
            missingRep: null,
            workType: null,
        });
    }

    const goal = plan.nextGoal;
    const currentRep = safeFactionRep(ns, goal.faction);
    const targetRep = goal.rep;
    const missingRep = Math.max(0, targetRep - currentRep);

    if (missingRep <= 0) {
        return writePlan(ns, {
            updatedAt: Date.now(),
            active: false,
            reason: `${goal.faction} already has enough rep for ${goal.name}.`,
            targetFaction: goal.faction,
            targetAugmentation: goal.name,
            targetRep,
            currentRep,
            missingRep: 0,
            workType: null,
        });
    }

    const workType = chooseWorkType(goal, player);

    return writePlan(ns, {
        updatedAt: Date.now(),
        active: true,
        reason: `Need ${formatNumber(missingRep)} rep with ${goal.faction} for ${goal.name}.`,
        targetFaction: goal.faction,
        targetAugmentation: goal.name,
        targetRep,
        currentRep,
        missingRep,
        workType,
        nextGoal: goal,
    });
}

function chooseWorkType(goal, player) {
    const tags = new Set(goal.tags ?? []);
    const theme = goal.theme ?? "general";

    if (tags.has("hacking") || theme === "hacking") {
        return "hacking";
    }

    if (tags.has("combat") || theme === "combat" || theme === "crime") {
        return "field";
    }

    if (tags.has("charisma")) {
        return "field";
    }

    return "hacking";
}

function safeFactionRep(ns, faction) {
    try {
        return ns.singularity.getFactionRep(faction);
    } catch {
        return 0;
    }
}

function writePlan(ns, plan) {
    ns.write(FACTION_WORK_PLAN_FILE, JSON.stringify(plan, null, 2), "w");
    return plan;
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

function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Infinity";
    if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "k";
    return n.toFixed(0);
}
