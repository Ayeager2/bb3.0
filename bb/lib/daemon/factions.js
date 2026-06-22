import { ALL_FACTION_PROFILES } from "/lib/daemon/faction-profiles.js";

export function buildFactionState(ns, options = {}) {
    const singularityEnabled = options.singularityEnabled === true;
    const bitNode = getCurrentBitNode(ns);

    const player = ns.getPlayer();
    const joined = new Set(player.factions ?? []);
    const hackingLevel = ns.getHackingLevel();
    const hacknetTotals = getHacknetTotals(ns);

    const profiles = ALL_FACTION_PROFILES
        .filter(profile => !profile?.requirements?.later)
        .map(profile => buildProfileState(ns, profile, joined, hackingLevel, bitNode, hacknetTotals));

    const spine = profiles
        .filter(x => x.requirements.backdoor === true || x.theme === "hacking" || x.theme === "hacknet" || x.theme === "endgame")
        .sort((a, b) => b.priority - a.priority);

    const next = profiles
        .filter(x => !x.joined)
        .sort((a, b) => {
            if (a.ready && !b.ready) return -1;
            if (!a.ready && b.ready) return 1;
            return b.priority - a.priority;
        })[0] ?? null;

    return {
        updatedAt: Date.now(),
        singularityEnabled,
        bitNode,
        hacknetTotals,
        joined: [...joined],
        hackingLevel,
        profiles,
        spine,
        nextGoal: next
            ? buildNextGoal(next, singularityEnabled)
            : {
                type: "complete",
                message: "All tracked factions joined or no valid faction goals found.",
            },
        automation: {
            canAutoJoin: singularityEnabled,
            canAutoWork: singularityEnabled,
            canAutoBackdoor: singularityEnabled,
            canAutoTravel: singularityEnabled,
        },
    };
}

function buildProfileState(ns, profile, joined, hackingLevel, bitNode, hacknetTotals) {
    const req = profile.requirements ?? {};
    const server = req.server ?? null;

    const exists = server ? safeServerExists(ns, server) : true;
    const rooted = server ? safeHasRoot(ns, server) : true;
    const backdoored = server ? safeBackdoored(ns, server) : req.backdoor !== true;

    const hackReady =
        req.hacking == null ||
        hackingLevel >= req.hacking;

    const moneyReady =
        req.money == null ||
        ns.getPlayer().money >= req.money;

    const combatReady =
        req.combat == null ||
        getCombatLevel(ns) >= req.combat;

    const cityReady =
        req.travel == null ||
        safeCity(ns) === req.travel;

    const augReady =
        req.augmentations == null ||
        safeOwnedAugCount(ns) >= req.augmentations;

    const homeRamReady =
        req.homeRam == null ||
        ns.getServerMaxRam("home") >= req.homeRam;

    const hacknetLevelsReady =
        req.hacknetLevels == null ||
        hacknetTotals.levels >= req.hacknetLevels;

    const hacknetRamReady =
        req.hacknetRam == null ||
        hacknetTotals.ram >= req.hacknetRam;

    const hacknetCoresReady =
        req.hacknetCores == null ||
        hacknetTotals.cores >= req.hacknetCores;

    const backdoorReady =
        req.backdoor !== true ||
        backdoored;

    const joinedFaction = joined.has(profile.faction);
    const priority = getPriority(profile, bitNode);

    const blockers = getBlockers({
        req,
        exists,
        rooted,
        backdoored,
        hackReady,
        moneyReady,
        combatReady,
        cityReady,
        augReady,
        homeRamReady,
        hacknetLevelsReady,
        hacknetRamReady,
        hacknetCoresReady,
        hacknetTotals,
    });

    return {
        faction: profile.faction,
        theme: profile.theme,
        priority,
        priorityByBitNode: profile.priorityByBitNode ?? {},
        requirements: req,

        server,
        exists,
        rooted,
        backdoored,

        hackReady,
        moneyReady,
        combatReady,
        cityReady,
        augReady,
        homeRamReady,
        hacknetLevelsReady,
        hacknetRamReady,
        hacknetCoresReady,
        hacknetTotals,

        joined: joinedFaction,
        ready: blockers.length === 0 && !joinedFaction,
        blockers,

        readyForManualBackdoor:
            req.backdoor === true &&
            exists &&
            rooted &&
            hackReady &&
            !backdoored,

        readyForInvite:
            blockers.length === 0 &&
            !joinedFaction,
    };
}

function buildNextGoal(goal, singularityEnabled) {
    if (goal.joined) {
        return {
            type: "joined",
            faction: goal.faction,
            server: goal.server,
            message: `${goal.faction} already joined.`,
        };
    }

    if (goal.blockers?.length > 0) {
        return {
            type: "blocked",
            faction: goal.faction,
            server: goal.server,
            blockers: goal.blockers,
            message: `${goal.faction} blocked: ${goal.blockers.join(", ")}.`,
        };
    }

    if (goal.readyForManualBackdoor) {
        return {
            type: singularityEnabled ? "auto-backdoor-ready" : "manual-backdoor-ready",
            faction: goal.faction,
            server: goal.server,
            message: singularityEnabled
                ? `${goal.server} is ready for auto-backdoor/join flow.`
                : `Manually connect to ${goal.server}, backdoor it, then join ${goal.faction}.`,
        };
    }

    if (goal.requirements?.travel && !goal.cityReady) {
        return {
            type: singularityEnabled ? "auto-travel-ready" : "manual-travel-needed",
            faction: goal.faction,
            travel: goal.requirements.travel,
            message: singularityEnabled
                ? `Ready to auto-travel to ${goal.requirements.travel} for ${goal.faction}.`
                : `Travel to ${goal.requirements.travel} for ${goal.faction}.`,
        };
    }

    return {
        type: singularityEnabled ? "auto-join-ready" : "manual-join-ready",
        faction: goal.faction,
        server: goal.server,
        message: singularityEnabled
            ? `${goal.faction} is ready for future auto-join flow.`
            : `${goal.faction} requirements appear ready. Join manually if invited.`,
    };
}

function getBlockers(state) {
    const req = state.req;
    const blockers = [];
    const hacknetTotals = state.hacknetTotals ?? {
        levels: 0,
        ram: 0,
        cores: 0,
        maxRam: 0,
        maxCores: 0,
    };

    if (req.server && !state.exists) blockers.push(`discover ${req.server}`);
    if (req.server && !state.rooted) blockers.push(`root ${req.server}`);
    if (req.backdoor === true && !state.backdoored) blockers.push(`backdoor ${req.server}`);
    if (!state.hackReady) blockers.push(`hacking ${req.hacking}`);
    if (!state.moneyReady) blockers.push(`money ${formatMoney(req.money)}`);
    if (!state.combatReady) blockers.push(`combat ${req.combat}`);
    if (!state.cityReady) blockers.push(`travel ${req.travel}`);
    if (!state.augReady) blockers.push(`${req.augmentations} augmentations`);
    if (!state.homeRamReady) blockers.push(`home RAM ${req.homeRam}GB`);

    if (req.company) blockers.push(`company rep ${req.company}`);
    if (req.companyRole) blockers.push(`company role ${req.companyRole}`);
    if (req.karma != null) blockers.push(`karma ${req.karma}`);
    if (req.kills != null) blockers.push(`${req.kills} kills`);
    if (!state.hacknetLevelsReady) blockers.push(`Hacknet levels ${hacknetTotals.levels}/${req.hacknetLevels}`);
    if (!state.hacknetRamReady) blockers.push(`Hacknet RAM ${hacknetTotals.ram}/${req.hacknetRam}`);
    if (!state.hacknetCoresReady) blockers.push(`Hacknet cores ${hacknetTotals.cores}/${req.hacknetCores}`);

    return blockers;
}

function getPriority(profile, bitNode) {
    return profile.priorityByBitNode?.[bitNode] ??
        profile.priorityByBitNode?.default ??
        0;
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? 0;
    } catch {
        // Fall back below.
    }

    try {
        return ns.getPlayer().bitNodeN ?? 0;
    } catch {
        return 0;
    }
}

function safeServerExists(ns, server) {
    try {
        return !!server && ns.serverExists(server);
    } catch {
        return false;
    }
}

function safeHasRoot(ns, server) {
    try {
        return !!server && ns.serverExists(server) && ns.hasRootAccess(server);
    } catch {
        return false;
    }
}

function safeBackdoored(ns, server) {
    try {
        if (!server || !ns.serverExists(server)) return false;
        return ns.getServer(server).backdoorInstalled === true;
    } catch {
        return false;
    }
}

function safeOwnedAugCount(ns) {
    try {
        return ns.singularity.getOwnedAugmentations(true).length;
    } catch {
        return 0;
    }
}

function safeCity(ns) {
    try {
        return ns.getPlayer().city ?? null;
    } catch {
        return null;
    }
}

function getCombatLevel(ns) {
    try {
        const p = ns.getPlayer();

        return Math.min(
            p.skills?.strength ?? p.strength ?? 0,
            p.skills?.defense ?? p.defense ?? 0,
            p.skills?.dexterity ?? p.dexterity ?? 0,
            p.skills?.agility ?? p.agility ?? 0
        );
    } catch {
        return 0;
    }
}

function formatMoney(value) {
    if (value == null) return "-";

    if (value >= 1_000_000_000_000) return "$" + (value / 1_000_000_000_000).toFixed(2) + "t";
    if (value >= 1_000_000_000) return "$" + (value / 1_000_000_000).toFixed(2) + "b";
    if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "m";
    if (value >= 1_000) return "$" + (value / 1_000).toFixed(2) + "k";

    return "$" + value.toFixed(0);
}

function getHacknetTotals(ns) {
    try {
        const count = ns.hacknet?.numNodes?.() ?? 0;
        let levels = 0;
        let ram = 0;
        let cores = 0;
        let maxRam = 0;
        let maxCores = 0;
        let production = 0;

        for (let i = 0; i < count; i++) {
            const node = ns.hacknet.getNodeStats(i);
            levels += Number(node.level) || 0;
            ram += Number(node.ram) || 0;
            cores += Number(node.cores) || 0;
            maxRam = Math.max(maxRam, Number(node.ram) || 0);
            maxCores = Math.max(maxCores, Number(node.cores) || 0);
            production += Number(node.production) || 0;
        }

        return {
            count,
            levels,
            ram,
            cores,
            maxRam,
            maxCores,
            production,
        };
    } catch {
        return {
            count: 0,
            levels: 0,
            ram: 0,
            cores: 0,
            maxRam: 0,
            maxCores: 0,
            production: 0,
        };
    }
}
