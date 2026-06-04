import { STATE_FILE } from "/lib/daemon/config.js";
import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";
import { clearStaleFactionPlans } from "/lib/daemon/faction-plan-cleanup.js";

const LAST_WORK_FILE = "/data/faction-work-last.txt";
const FACTION_DONATION_PLAN_FILE = "/data/faction-donation-plan.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["force", "false"],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const force = String(flags.force).toLowerCase() === "true";

    while (true) {
        const daemonState = readJson(ns, STATE_FILE);
        const policy = daemonState?.spendingPolicy ?? {};

        const plan = buildFactionWorkPlan(ns);
        const donationPlan = readJson(ns, FACTION_DONATION_PLAN_FILE);

        if (!plan.active && isWorkingForFaction(ns)) {
            stopCurrentWork(ns);
            clearStaleFactionPlans(ns);
            refreshAugmentationCache(ns);
            const message = `[FACTION WORK] Stopped work. ${plan.reason}`;
            ns.tprint(message);
            ns.toast(message, "success", 8000);

            await ns.sleep(refreshMs);
            continue;
        }

        const allowWork =
            policy.allowFactionWork === true ||
            force === true;

        ns.clearLog();
        ns.print("Faction Work Service");
        ns.print("=".repeat(60));
        ns.print(`Allow Work: ${allowWork ? "YES" : "NO"}`);
        ns.print(`Active Plan: ${plan.active ? "YES" : "NO"}`);
        ns.print(`Reason: ${plan.reason}`);

        if (donationPlan?.ready === true) {
            ns.print("Donation ready; faction work paused.");
            await ns.sleep(refreshMs);
            continue;
        }

        if (!plan.active && isAlreadyWorking(ns, plan.targetFaction)) {
            stopCurrentWork(ns);

            const message =
                `[FACTION WORK] Stopped work. ${plan.reason}`;

            ns.tprint(message);
            ns.toast(message, "success", 8000);

            await ns.sleep(refreshMs);
            continue;
        }

        if (!allowWork || !plan.active || !plan.targetFaction || !plan.workType) {
            await ns.sleep(refreshMs);
            continue;
        }

        if (isAlreadyWorking(ns, plan.targetFaction)) {
            await ns.sleep(refreshMs);
            continue;
        }

        const started = startFactionWork(ns, plan.targetFaction, plan.workType);

        if (started) {
            const message =
                `[FACTION WORK] Started ${plan.workType} work for ${plan.targetFaction} targeting ${plan.targetAugmentation}.`;

            const last = readText(ns, LAST_WORK_FILE);

            if (last !== message) {
                ns.tprint(message);
                ns.toast(message, "success", 8000);
                ns.write(LAST_WORK_FILE, message, "w");
            }
        } else {
            ns.print(`Failed to start ${plan.workType} work for ${plan.targetFaction}.`);
        }

        await ns.sleep(refreshMs);
    }
}

function startFactionWork(ns, faction, workType) {
    const candidates = getWorkTypeCandidates(workType);

    for (const type of candidates) {
        try {
            if (ns.singularity.workForFaction(faction, type, false)) {
                return true;
            }
        } catch (error) {
    console.error(error);
}
    }

    return false;
}

function getWorkTypeCandidates(workType) {
    if (workType === "hacking") {
        return ["hacking", "Hacking Contracts", "field", "Field Work"];
    }

    if (workType === "field") {
        return ["field", "Field Work", "hacking", "Hacking Contracts"];
    }

    if (workType === "security") {
        return ["security", "Security Work", "field", "Field Work"];
    }

    return [workType, "hacking", "Hacking Contracts", "field", "Field Work"];
}

function isAlreadyWorking(ns, faction) {
    try {
        const work = ns.singularity.getCurrentWork();

        return (
            work &&
            work.type === "FACTION" &&
            work.factionName === faction
        );
    } catch {
        return false;
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

function readText(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return "";
        return ns.read(file).trim();
    } catch {
        return "";
    }
}

function stopCurrentWork(ns) {
    try {
        return ns.singularity.stopAction();
    } catch (error) {
    console.error(error);
}

    try {
        return ns.singularity.stopWork();
    } catch (error) {
    console.error(error);
}

    return false;
}

function isWorkingForFaction(ns) {
    try {
        const work = ns.singularity.getCurrentWork();
        return work?.type === "FACTION";
    } catch {
        return false;
    }
}

function refreshAugmentationCache(ns) {
    try {
        ns.run("/tools/augmentation-data-builder.js", 1, "--force");
    } catch (error) {
    console.error(error);
}
}