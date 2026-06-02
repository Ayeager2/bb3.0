import { STATE_FILE } from "/lib/daemon/config.js";

const FACTION_JOIN_STATUS_FILE =
    "/data/faction-join-status.txt";

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

        const invites = getInvitations(ns);

        writeStatus(ns, {
            updatedAt: Date.now(),
            updatedAtText: new Date().toLocaleTimeString(),

            allowJoin,
            invites,

            joinedFactions:
                ns.getPlayer().factions ?? [],
        });

        if (!allowJoin) {
            await ns.sleep(refreshMs);
            continue;
        }

        for (const faction of invites) {
            const joined = joinFaction(ns, faction);

            if (!joined) continue;

            const message =
                `[FACTION JOIN] Joined ${faction}.`;

            ns.tprint(message);

            ns.toast(
                `Joined faction: ${faction}`,
                "success",
                10000
            );

            writeStatus(ns, {
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),

                allowJoin,

                joined: faction,

                invites: getInvitations(ns),

                joinedFactions:
                    ns.getPlayer().factions ?? [],
            });
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

function writeStatus(ns, status) {
    try {
        ns.write(
            FACTION_JOIN_STATUS_FILE,
            JSON.stringify(status, null, 2),
            "w"
        );
    } catch { }
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