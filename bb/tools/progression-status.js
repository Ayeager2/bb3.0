const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const FACTION_DONATION_PLAN_FILE = "/data/faction-donation-plan.txt";
const PURCHASE_STATE_FILE = "/data/purchases-state.txt";
const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const BACKDOOR_STATE_FILE = "/data/backdoor-service-state.txt";
const FACTION_JOIN_STATUS_FILE = "/data/faction-join-status.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const daemon = readJson(ns, DAEMON_STATE_FILE);
    const aug = readJson(ns, AUGMENTATION_PLAN_FILE);
    const work = readJson(ns, FACTION_WORK_PLAN_FILE);
    const donation = readJson(ns, FACTION_DONATION_PLAN_FILE);
    const lastPurchase = readJson(ns, PURCHASE_STATE_FILE);
    const backdoor = readJson(ns, BACKDOOR_STATE_FILE);
    const join = readJson(ns, FACTION_JOIN_STATUS_FILE);

    const currentWork = getCurrentWork(ns);
    const factionProgression = daemon.factionProgression ?? {};
    const victoryPlan = daemon.victoryPlan ?? {};

    ns.tprint("Progression Status");
    ns.tprint("=".repeat(70));

    ns.tprint(`Mode: ${daemon.mode ?? "unknown"} | Priority: ${daemon.spendingPolicy?.priority ?? "unknown"}`);
    ns.tprint(`Money: ${formatMoney(ns.getPlayer().money)} | Hacking: ${ns.getHackingLevel()}`);
    ns.tprint(`Current Work: ${formatWork(currentWork)}`);

    ns.tprint("-".repeat(70));
    ns.tprint("BN4 / Faction Progression");
    ns.tprint(`Stage: ${factionProgression.currentFactionStage ?? "unknown"} | Blocker: ${factionProgression.currentBlocker ?? "unknown"}`);
    ns.tprint(`Action: ${factionProgression.nextBestAction ?? "unknown"} | Mode Hint: ${factionProgression.recommendedMode ?? "unknown"}`);
    ns.tprint(`Target Faction: ${factionProgression.targetFaction ?? "none"} | Target Server: ${factionProgression.targetServer ?? "none"}`);
    ns.tprint(`Reason: ${factionProgression.reason ?? "none"}`);
    ns.tprint(`Victory: ${victoryPlan.stage ?? "unknown"} | Daedalus: ${yesNo(victoryPlan.hasDaedalus)} | Red Pill: ${yesNo(victoryPlan.hasRedPill)}`);

    if (factionProgression.daedalusRequirements) {
        const req = factionProgression.daedalusRequirements;
        ns.tprint(
            `Daedalus Req: hack ${req.hacking}/${req.hackingRequired} ${yesNo(req.hackingReady)} | ` +
            `money ${formatMoney(req.money)}/${formatMoney(req.moneyRequired)} ${yesNo(req.moneyReady)} | ` +
            `augs ${req.augmentCount}/${req.augmentRequired} ${yesNo(req.augmentReady)}`
        );
        ns.tprint(
            `Aug Count Detail: total=${req.augmentCount} | ` +
            `non-NeuroFlux=${req.augmentCountExcludingNeuroFlux ?? "?"} | ` +
            `NeuroFlux=${req.neuroFluxCount ?? "?"}`
        );
    }

    ns.tprint("-".repeat(70));
    ns.tprint("Faction Join");
    printServiceStatus(ns, daemon, "faction-join");
    ns.tprint(`Allowed: ${yesNo(join.allowJoin)} | Invites: ${(join.invites ?? []).join(", ") || "none"}`);
    ns.tprint(`Joined: ${(join.joinedFactions ?? ns.getPlayer().factions ?? []).join(", ") || "none"}`);

    ns.tprint("-".repeat(70));
    ns.tprint("Backdoors");
    printServiceStatus(ns, daemon, "backdoor-service");
    ns.tprint(`Next: ${backdoor.nextTarget?.server ?? "none"} | Execute: ${yesNo(backdoor.execute)}`);

    for (const item of backdoor.backdoorState?.progressionServers ?? []) {
        ns.tprint(
            `${item.server}: root ${yesNo(item.rooted)} | backdoor ${yesNo(item.backdoored)} | ` +
            `hack ${item.playerHack}/${item.requiredHack ?? "?"} | ` +
            `ports ${item.availablePorts ?? "?"}/${item.requiredPorts ?? "?"} | ${item.reason}`
        );
    }

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

function yesNo(value) {
    return value === true ? "YES" : "NO";
}

function printServiceStatus(ns, daemon, id) {
    const services = Array.isArray(daemon.services) ? daemon.services : [];
    const service = services.find(item => item.id === id);

    if (!service) {
        ns.tprint(`Service ${id}: not present in daemon state`);
        return;
    }

    ns.tprint(
        `Service ${id}: ${service.status ?? "unknown"} | ` +
        `running ${yesNo(service.running)} | pid ${service.pid ?? 0} | ${service.reason ?? "no reason"}`
    );
}
