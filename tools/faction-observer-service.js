import { buildFactionState } from "/lib/daemon/factions.js";
import { ALL_FACTION_PROFILES } from "/lib/daemon/faction-profiles.js";

const FACTION_STATE_FILE = "/data/faction-state.txt";
const BACKDOOR_STATE_FILE = "/data/backdoor-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["singularity", false],
        ["auto-backdoor", false],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const singularityEnabled = flags.singularity === true;
    const autoBackdoor = flags["auto-backdoor"] === true;

    while (true) {
        const factionState = buildFactionState(ns, {
            singularityEnabled,
        });

        const backdoorState = await buildBackdoorState(ns, {
            singularityEnabled,
            autoBackdoor,
        });

        const combinedState = {
            ...factionState,
            profiles: ALL_FACTION_PROFILES,
            backdoors: backdoorState,
        };

        ns.write(FACTION_STATE_FILE, JSON.stringify(combinedState, null, 2), "w");
        ns.write(BACKDOOR_STATE_FILE, JSON.stringify(backdoorState, null, 2), "w");

        ns.clearLog();
        ns.print("Faction / Backdoor Observer");
        ns.print("=".repeat(60));
        ns.print(`Hacking: ${combinedState.hackingLevel}`);
        ns.print(`Singularity: ${singularityEnabled ? "ON" : "OFF"}`);
        ns.print(`Auto Backdoor: ${autoBackdoor ? "ON" : "OFF"}`);
        ns.print(`Joined: ${combinedState.joined.join(", ") || "none"}`);
        ns.print("-".repeat(60));
        ns.print(`Next: ${combinedState.nextGoal.message}`);

        const nextBackdoor = backdoorState.servers.find(x =>
            x.exists &&
            x.rooted &&
            x.hackReady &&
            !x.backdoored
        );

        if (nextBackdoor) {
            ns.print(`Backdoor Ready: ${nextBackdoor.server} -> ${nextBackdoor.faction}`);
        }

        await ns.sleep(refreshMs);
    }
}

async function buildBackdoorState(ns, options = {}) {
    const singularityEnabled = options.singularityEnabled === true;
    const autoBackdoor = options.autoBackdoor === true;

    const previous = readJson(ns, BACKDOOR_STATE_FILE);
    const announced = new Set(previous.announced ?? []);
    const backdoorTargets = getBackdoorTargets();

    const current = {
        updatedAt: Date.now(),
        singularityEnabled,
        autoBackdoor,
        announced: [...announced],
        servers: [],
    };

    for (const item of backdoorTargets) {
        const status = getBackdoorStatus(ns, item.server, item.minHack);

        const serverState = {
            ...item,
            ...status,
        };

        if (
            singularityEnabled &&
            autoBackdoor &&
            status.exists &&
            status.rooted &&
            status.hackReady &&
            !status.backdoored
        ) {
            const attempted = await tryAutoBackdoor(ns, item.server);

            if (attempted) {
                const refreshed = getBackdoorStatus(ns, item.server, item.minHack);
                serverState.backdoored = refreshed.backdoored;
                serverState.autoAttempted = true;
            }
        }

        if (serverState.backdoored && !announced.has(item.server)) {
            const message =
                `[BACKDOOR] ${item.server} backdoored -> ${item.faction} progression unlocked.`;

            ns.tprint(message);
            ns.toast(message, "success", 8000);

            announced.add(item.server);
        }

        current.servers.push(serverState);
    }

    current.announced = [...announced];

    return current;
}

function getBackdoorTargets() {
    return ALL_FACTION_PROFILES
        .filter(profile =>
            profile?.requirements?.backdoor === true &&
            profile?.requirements?.server
        )
        .map(profile => ({
            faction: profile.faction,
            theme: profile.theme,
            server: profile.requirements.server,
            minHack: profile.requirements.hacking ?? 0,
            priorityByBitNode: profile.priorityByBitNode ?? {},
        }));
}

async function tryAutoBackdoor(ns, target) {
    try {
        const path = findPath(ns, "home", target);
        if (!path) return false;

        for (const server of path) {
            ns.singularity.connect(server);
        }

        await ns.singularity.installBackdoor();
        ns.singularity.connect("home");

        return true;
    } catch {
        try {
            ns.singularity.connect("home");
        } catch (error) {
    console.error(error);
}

        return false;
    }
}

function getBackdoorStatus(ns, server, minHack) {
    try {
        if (!ns.serverExists(server)) {
            return {
                exists: false,
                rooted: false,
                hackReady: false,
                backdoored: false,
            };
        }

        const info = ns.getServer(server);

        return {
            exists: true,
            rooted: ns.hasRootAccess(server),
            hackReady: ns.getHackingLevel() >= minHack,
            backdoored: info.backdoorInstalled === true,
        };
    } catch {
        return {
            exists: false,
            rooted: false,
            hackReady: false,
            backdoored: false,
        };
    }
}

function findPath(ns, start, target) {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current === target) return path;

        for (const next of ns.scan(current)) {
            if (visited.has(next)) continue;
            if (next.startsWith("box-")) continue;

            visited.add(next);
            queue.push([...path, next]);
        }
    }

    return null;
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