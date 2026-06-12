const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const FACTION_DONATION_PLAN_FILE = "/data/faction-donation-plan.txt";

const DEFAULT_RESERVE = 1_000_000_000;
const REP_TO_MONEY = 1_000_000; // rough Bitburner donation estimate

export function buildFactionDonationPlan(ns, options = {}) {
    const reserveMoney = options.reserveMoney ?? DEFAULT_RESERVE;
    const workPlan = readJson(ns, FACTION_WORK_PLAN_FILE);

    if (!workPlan?.active || !workPlan.targetFaction || workPlan.missingRep <= 0) {
        return writePlan(ns, {
            updatedAt: Date.now(),
            active: false,
            ready: false,
            reason: "No faction rep gap found.",
            targetFaction: null,
        });
    }

    const faction = workPlan.targetFaction;
    const missingRep = Number(workPlan.missingRep) || 0;
    const favor = safeFactionFavor(ns, faction);
    const favorToDonate = safeFavorToDonate(ns);
    const canDonate = favor >= favorToDonate;

    const money = ns.getPlayer().money;
    const spendable = Math.max(0, money - reserveMoney);
    const estimatedDonation = Math.ceil(missingRep * REP_TO_MONEY);

    const ready =
        canDonate &&
        spendable >= estimatedDonation &&
        estimatedDonation > 0;

    return writePlan(ns, {
        updatedAt: Date.now(),
        active: true,
        ready,
        reason: ready
            ? `Ready to donate for ${faction} rep.`
            : getBlockedReason({ canDonate, favor, favorToDonate, spendable, estimatedDonation, faction }),
        targetFaction: faction,
        targetAugmentation: workPlan.targetAugmentation,
        currentRep: workPlan.currentRep,
        targetRep: workPlan.targetRep,
        missingRep,
        favor,
        favorToDonate,
        canDonate,
        money,
        reserveMoney,
        spendable,
        estimatedDonation,
    });
}

function getBlockedReason(state) {
    if (!state.canDonate) {
        return `${state.faction} favor too low for donation: ${formatNumber(state.favor)} / ${formatNumber(state.favorToDonate)}.`;
    }

    if (state.spendable < state.estimatedDonation) {
        return `Need ${formatMoney(state.estimatedDonation)} donation money; spendable ${formatMoney(state.spendable)}.`;
    }

    return "Donation blocked.";
}

function safeFactionFavor(ns, faction) {
    try {
        return ns.singularity.getFactionFavor(faction);
    } catch {
        return 0;
    }
}

function safeFavorToDonate(ns) {
    try {
        return ns.singularity.getFavorToDonate();
    } catch {
        return 150;
    }
}

function writePlan(ns, plan) {
    ns.write(FACTION_DONATION_PLAN_FILE, JSON.stringify(plan, null, 2), "w");
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

function formatMoney(value) {
    return "$" + formatNumber(value);
}

function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Infinity";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "t";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "b";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "m";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "k";
    return n.toFixed(0);
}
