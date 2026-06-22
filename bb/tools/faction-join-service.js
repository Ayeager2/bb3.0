import { STATE_FILE } from "/lib/daemon/config.js";
import { ALL_FACTION_PROFILES } from "/lib/daemon/faction-profiles.js";

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

        const rawInvites = getInvitations(ns);
        const joinPlan = buildJoinPlan(ns, rawInvites);
        const invites = joinPlan.invites;

        writeStatus(ns, {
            updatedAt: Date.now(),
            updatedAtText: new Date().toLocaleTimeString(),

            allowJoin,
            bitNode: joinPlan.bitNode,
            joinPriority: joinPlan.priority,
            rawInvites,
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
                bitNode: joinPlan.bitNode,
                joinPriority: joinPlan.priority,

                joined: faction,

                rawInvites: getInvitations(ns),
                invites: buildJoinPlan(ns, getInvitations(ns)).invites,

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
    } catch (error) {
    console.error(error);
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

function buildJoinPlan(ns, invites) {
    const bitNode = getCurrentBitNode(ns);
    const priority = Object.fromEntries(
        invites.map(faction => [faction, getFactionPriority(faction, bitNode)])
    );

    return {
        bitNode,
        priority,
        invites: [...invites].sort((a, b) => {
            const byPriority =
                getFactionPriority(b, bitNode) - getFactionPriority(a, bitNode);
            if (byPriority !== 0) return byPriority;
            return a.localeCompare(b);
        }),
    };
}

function getFactionPriority(faction, bitNode) {
    const profile =
        ALL_FACTION_PROFILES.find(x => x.faction === faction);

    if (!profile) return bitNode === 9 && faction === "Netburners" ? 1000 : 0;

    return profile.priorityByBitNode?.[bitNode] ??
        profile.priorityByBitNode?.default ??
        0;
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? 0;
    } catch {
        return 0;
    }
}
