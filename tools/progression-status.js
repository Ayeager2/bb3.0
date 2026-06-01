const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const FACTION_DONATION_PLAN_FILE = "/data/faction-donation-plan.txt";
const PURCHASE_STATE_FILE = "/data/purchases-state.txt";
const DAEMON_STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const daemon = readJson(ns, DAEMON_STATE_FILE);
    const aug = readJson(ns, AUGMENTATION_PLAN_FILE);
    const work = readJson(ns, FACTION_WORK_PLAN_FILE);
    const donation = readJson(ns, FACTION_DONATION_PLAN_FILE);
    const lastPurchase = readJson(ns, PURCHASE_STATE_FILE);

    const currentWork = getCurrentWork(ns);

    ns.tprint("Progression Status");
    ns.tprint("=".repeat(70));

    ns.tprint(`Mode: ${daemon.mode ?? "unknown"} | Priority: ${daemon.spendingPolicy?.priority ?? "unknown"}`);
    ns.tprint(`Money: ${formatMoney(ns.getPlayer().money)} | Hacking: ${ns.getHackingLevel()}`);
    ns.tprint(`Current Work: ${formatWork(currentWork)}`);

    ns.tprint("-".repeat(70));
    ns.tprint("Augmentation");
    ns.tprint(`Goal: ${aug?.nextGoal?.name ?? "none"}`);
    ns.tprint(`Faction: ${aug?.nextGoal?.faction ?? "none"}`);
    ns.tprint(`Ready: ${aug?.ready ? "YES" : "NO"}`);
    ns.tprint(`Status: ${aug?.blockedReason ?? "unknown"}`);

    if (aug?.nextGoal) {
        ns.tprint(`Price: ${formatMoney(aug.nextGoal.price)} | Rep: ${formatNumber(aug.nextGoal.rep)}`);
        ns.tprint(`Has Rep: ${aug.nextGoal.hasRep ? "YES" : "NO"} | Affordable: ${aug.nextGoal.affordable ? "YES" : "NO"}`);
    }

    ns.tprint("-".repeat(70));
    ns.tprint("Faction Work");
    ns.tprint(`Active: ${work?.active ? "YES" : "NO"}`);
    ns.tprint(`Reason: ${work?.reason ?? "none"}`);

    if (work?.targetFaction) {
        ns.tprint(`Faction: ${work.targetFaction}`);
        ns.tprint(`Aug: ${work.targetAugmentation}`);
        ns.tprint(`Missing Rep: ${formatNumber(work.missingRep)}`);
        ns.tprint(`Work Type: ${work.workType ?? "none"}`);
    }

    ns.tprint("-".repeat(70));
    ns.tprint("Faction Donation");
    ns.tprint(`Active: ${donation?.active ? "YES" : "NO"}`);
    ns.tprint(`Ready: ${donation?.ready ? "YES" : "NO"}`);
    ns.tprint(`Reason: ${donation?.reason ?? "none"}`);

    if (donation?.active) {
        ns.tprint(`Favor: ${formatNumber(donation.favor)} / ${formatNumber(donation.favorToDonate)}`);
        ns.tprint(`Estimated Donation: ${formatMoney(donation.estimatedDonation)}`);
    }

    ns.tprint("-".repeat(70));
    ns.tprint("Last Purchase");
    if (lastPurchase?.timeText) {
        ns.tprint(`[${lastPurchase.timeText}] ${lastPurchase.source} | ${lastPurchase.item}`);
        ns.tprint(`Cost: ${formatMoney(lastPurchase.cost)} | After: ${formatMoney(lastPurchase.moneyAfter)}`);
    } else {
        ns.tprint("none");
    }
}

function getCurrentWork(ns) {
    try {
        return ns.singularity.getCurrentWork();
    } catch {
        return null;
    }
}

function formatWork(work) {
    if (!work) return "none";

    if (work.type === "FACTION") {
        return `FACTION ${work.factionName} / ${work.factionWorkType}`;
    }

    if (work.type === "CRIME") {
        return `CRIME ${work.crimeType}`;
    }

    if (work.type === "COMPANY") {
        return `COMPANY ${work.companyName}`;
    }

    return work.type ?? "unknown";
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
    if (!Number.isFinite(n)) return "∞";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "t";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "b";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "m";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "k";
    return n.toFixed(0);
}