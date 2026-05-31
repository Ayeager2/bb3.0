import { STATE_FILE } from "/lib/daemon/config.js";
import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";

const LAST_WORK_FILE = "/data/faction-work-last.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["force", "false"],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const force =
        String(flags.force).toLowerCase() === "true";

    while (true) {
        const daemonState = readJson(ns, STATE_FILE);
        const policy = daemonState?.spendingPolicy ?? {};

        const plan = buildFactionWorkPlan(ns);

        const allowWork =
            policy.allowFactionWork === true ||
            force === true;

        ns.clearLog();
        ns.print("Faction Work Service");
        ns.print("=".repeat(60));
        ns.print(`Allow Work: ${allowWork ? "YES" : "NO"}`);
        ns.print(`Active Plan: ${plan.active ? "YES" : "NO"}`);
        ns.print(`Reason: ${plan.reason}`);

        if (!allowWork || !plan.active || !plan.targetFaction || !plan.workType) {
            await ns.sleep(refreshMs);
            continue;
        }

        const alreadyWorking = isAlreadyWorking(ns, plan.targetFaction);

        if (!alreadyWorking) {
            const started = safeWorkForFaction(ns, plan.targetFaction, plan.workType);

            if (started) {
                const message =
                    `[FACTION WORK] Started ${plan.workType} work for ${plan.targetFaction} targeting ${plan.targetAugmentation}.`;

                const last = readText(ns, LAST_WORK_FILE);

                if (last !== message) {
                    ns.tprint(message);
                    ns.toast(message, "success", 8000);
                    ns.write(LAST_WORK_FILE, message, "w");
                }
            }
        }

        await ns.sleep(refreshMs);
    }
}

function safeWorkForFaction(ns, faction, workType) {
    try {
        return ns.singularity.workForFaction(faction, workType, false);
    } catch {
        return false;
    }
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