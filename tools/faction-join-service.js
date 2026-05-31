import { STATE_FILE } from "/lib/daemon/config.js";

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
        const state = readJson(ns, STATE_FILE);
        const policy = state?.spendingPolicy ?? {};

        const allowJoin =
            policy.allowFactionJoin === true ||
            force === true;

        if (!allowJoin) {
            await ns.sleep(refreshMs);
            continue;
        }

        const invites = getInvitations(ns);

        for (const faction of invites) {
            const joined = joinFaction(ns, faction);

            if (joined) {
                const message = `[FACTION JOIN] Joined ${faction}.`;
                ns.tprint(message);
                ns.toast(message, "success", 8000);
            }
        }

        await ns.sleep(refreshMs);
    }
}

function getInvitations(ns) {
    try {
        return ns.singularity.checkFactionInvitations();
    } catch {
        return [];
    }
}

function joinFaction(ns, faction) {
    try {
        return ns.singularity.joinFaction(faction);
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