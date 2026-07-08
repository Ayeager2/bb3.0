import { STATE_FILE } from "/lib/daemon/config.js";
import { buildFactionWorkPlan } from "/lib/daemon/faction-work.js";
import { clearStaleFactionPlans } from "/lib/daemon/faction-plan-cleanup.js";
import { describeCharacterActionOverride, readCharacterActionOverride } from "/lib/daemon/character-action-override.js";

const LAST_WORK_FILE = "/data/faction-work-last.txt";
const FACTION_DONATION_PLAN_FILE = "/data/faction-donation-plan.txt";
const FACTION_WORK_SERVICE_STATE_FILE = "/data/faction-work-service-state.txt";

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
        const currentWork = getCurrentWork(ns);
        const characterOverride = readCharacterActionOverride(ns);

        if (characterOverride?.enabled === true) {
            writeServiceState(ns, {
                status: "paused-character-override",
                allowWork: false,
                reason: describeCharacterActionOverride(characterOverride),
                plan,
                currentWork,
                characterOverride,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (!plan.active && isFactionWork(currentWork)) {
            stopCurrentWork(ns);
            clearStaleFactionPlans(ns);
            refreshAugmentationCache(ns);
            const message = `[FACTION WORK] Stopped work. ${plan.reason}`;
            ns.tprint(message);
            ns.toast(message, "success", 8000);
            writeServiceState(ns, {
                status: "stopped",
                allowWork: false,
                reason: plan.reason,
                plan,
                currentWork,
            });

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
            writeServiceState(ns, {
                status: "paused-donation-ready",
                allowWork,
                reason: "Donation ready; faction work paused.",
                plan,
                donationPlan,
                currentWork,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (!plan.active && isAlreadyWorking(currentWork, plan.targetFaction)) {
            stopCurrentWork(ns);

            const message =
                `[FACTION WORK] Stopped work. ${plan.reason}`;

            ns.tprint(message);
            ns.toast(message, "success", 8000);
            writeServiceState(ns, {
                status: "stopped",
                allowWork,
                reason: plan.reason,
                plan,
                currentWork,
            });

            await ns.sleep(refreshMs);
            continue;
        }

        if (!allowWork || !plan.active || !plan.targetFaction || !plan.workType) {
            writeServiceState(ns, {
                status: !allowWork ? "blocked-policy" : "blocked-plan",
                allowWork,
                reason: !allowWork
                    ? "Daemon policy blocks faction work."
                    : plan.reason ?? "No active faction work plan.",
                plan,
                currentWork,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (isAlreadyWorking(currentWork, plan.targetFaction, plan.workType)) {
            writeServiceState(ns, {
                status: "working",
                allowWork,
                reason: `Already working for ${plan.targetFaction}.`,
                plan,
                currentWork,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (isFactionWork(currentWork) && currentWork.factionName !== plan.targetFaction) {
            stopCurrentWork(ns);
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
            writeServiceState(ns, {
                status: "started",
                allowWork,
                reason: message,
                plan,
                currentWork: getCurrentWork(ns),
            });
        } else {
            ns.print(`Failed to start ${plan.workType} work for ${plan.targetFaction}.`);
            writeServiceState(ns, {
                status: "failed",
                allowWork,
                reason: `Failed to start ${plan.workType} work for ${plan.targetFaction}.`,
                plan,
                currentWork: getCurrentWork(ns),
            });
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

function isAlreadyWorking(currentWork, faction, workType = null) {
    if (!isFactionWork(currentWork)) return false;
    if (currentWork.factionName !== faction) return false;
    if (!workType) return true;

    const currentType =
        normalizeWorkType(currentWork.factionWorkType ?? currentWork.workType ?? currentWork.name);
    const desiredType =
        normalizeWorkType(workType);

    return currentType === desiredType || currentType === "unknown";
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

function getCurrentWork(ns) {
    try {
        return ns.singularity.getCurrentWork() ?? null;
    } catch {
        return null;
    }
}

function isFactionWork(work) {
    return work?.type === "FACTION";
}

function normalizeWorkType(value) {
    const text = String(value ?? "").toLowerCase();
    if (text.includes("hack")) return "hacking";
    if (text.includes("field")) return "field";
    if (text.includes("security")) return "security";
    return text || "unknown";
}

function writeServiceState(ns, state) {
    try {
        ns.write(FACTION_WORK_SERVICE_STATE_FILE, JSON.stringify({
            updatedAt: Date.now(),
            updatedAtText: new Date().toLocaleTimeString(),
            source: "faction-work-service",
            ...state,
        }, null, 2), "w");
    } catch {
        // Diagnostics should never break faction work.
    }
}

function refreshAugmentationCache(ns) {
    try {
        ns.run("/tools/augmentation-data-builder.js", 1, "--force");
    } catch (error) {
        console.error(error);
    }
}
