//tools/augmentation-data-builder.js
import { ALL_FACTION_PROFILES } from "/lib/daemon/faction-profiles.js";

const AUGMENTATION_STATE_FILE = "/data/augmentation-state.txt";
const AUGMENTATION_CACHE_FILE = "/data/augmentation-cache.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["force", false],
        ["max-age", 60 * 60 * 1000],
    ]);

    const force = flags.force === true;
    const maxAge = Number(flags["max-age"]) || 60 * 60 * 1000;

    const existing = readJson(ns, AUGMENTATION_CACHE_FILE);

    if (!force && existing?.updatedAt && Date.now() - existing.updatedAt < maxAge) {
        ns.tprint(`[AUG DATA] Using existing cache from ${new Date(existing.updatedAt).toLocaleTimeString()}.`);
        ns.write(AUGMENTATION_STATE_FILE, JSON.stringify(existing, null, 2), "w");
        return;
    }

    const state = buildAugmentationData(ns);

    ns.write(AUGMENTATION_CACHE_FILE, JSON.stringify(state, null, 2), "w");
    ns.write(AUGMENTATION_STATE_FILE, JSON.stringify(state, null, 2), "w");

    // ns.tprint(
    //     `[AUG DATA] Built cache: ` +
    //     `${state.factions.length} factions, ` +
    //     `${state.augmentationCount} faction-augmentation entries, ` +
    //     `${state.uniqueAugmentationCount} unique augmentations.`
    // );
}

function getJoinedFactions(ns, player) {
    try {
        return ns.singularity.getOwnedFactions();
    } catch (error) {
    console.error(error);
}

    try {
        return player.factions ?? [];
    } catch (error) {
    console.error(error);
}

    return [];
}

function buildAugmentationData(ns) {
    const player = ns.getPlayer();
    const joinedFactions = getJoinedFactions(ns, player);
    const joined = new Set(joinedFactions);
    const ownedQueued = new Set(safeOwnedAugmentations(ns, true));
    const ownedInstalled = new Set(safeOwnedAugmentations(ns, false));

    const factions = [];
    const uniqueAugmentations = new Map();

    for (const profile of ALL_FACTION_PROFILES) {
        const faction = profile.faction;
        const factionRep = safeFactionRep(ns, faction);
        const augmentationNames = safeAugmentationsFromFaction(ns, faction);

        const augmentations = [];

        for (const name of augmentationNames) {
            const data = buildAugmentationEntry(ns, name, faction, factionRep, ownedQueued, ownedInstalled);

            augmentations.push(data);

            if (!uniqueAugmentations.has(name)) {
                uniqueAugmentations.set(name, {
                    name,
                    factions: [],
                    price: data.price,
                    rep: data.rep,
                    prereqs: data.prereqs,
                    stats: data.stats,
                    tags: inferAugmentationTags(name, data.stats),
                    owned: data.owned,
                    installed: data.installed,
                    queued: data.queued,
                });
            }

            uniqueAugmentations.get(name).factions.push(faction);
        }

        factions.push({
            faction,
            theme: profile.theme,
            source: profile.source ?? "manual-profile",
            joined: joined.has(faction),
            priorityByBitNode: profile.priorityByBitNode ?? {},
            requirements: profile.requirements ?? {},
            rep: factionRep,
            augmentations,
        });
    }

    const unique = [...uniqueAugmentations.values()]
        .sort((a, b) => a.name.localeCompare(b.name));

    return {
        updatedAt: Date.now(),
        source: "live-singularity-api-cache",
        note: "Generated once on startup or with --force. Prices should be rechecked before purchase.",
        player: {
            money: player.money,
            city: player.city,
            factions: joinedFactions,
        },
        factionCount: factions.length,
        augmentationCount: factions.reduce((sum, f) => sum + f.augmentations.length, 0),
        uniqueAugmentationCount: unique.length,
        factions,
        uniqueAugmentations: unique,
    };
}

function buildAugmentationEntry(ns, name, faction, factionRep, ownedQueued, ownedInstalled) {
    const price = safeAugmentationPrice(ns, name);
    const rep = safeAugmentationRepReq(ns, name);
    const stats = safeAugmentationStats(ns, name);
    const prereqs = safeAugmentationPrereqs(ns, name);

    const installed = ownedInstalled.has(name);
    const owned = ownedQueued.has(name);
    const queued = owned && !installed;

    return {
        name,
        faction,
        price,
        rep,
        factionRep,
        hasRep: factionRep >= rep,
        affordableAtBuild: ns.getPlayer().money >= price,
        installed,
        owned,
        queued,
        prereqs,
        stats,
        tags: inferAugmentationTags(name, stats),
    };
}

function inferAugmentationTags(name, stats = {}) {
    const lowerName = String(name ?? "").toLowerCase();
    const tags = new Set();

    for (const [rawKey, rawValue] of Object.entries(stats ?? {})) {
        if (typeof rawValue !== "number") continue;
        if (rawValue <= 1) continue;

        const key = rawKey.toLowerCase();

        if (key.includes("hacknet")) tags.add("hacknet");
        else if (key.includes("bladeburner")) tags.add("bladeburner");
        else if (key.includes("hacking") || key.includes("hack")) tags.add("hacking");
        else if (key.includes("faction")) tags.add("faction");
        else if (key.includes("company")) tags.add("company");
        else if (key.includes("charisma")) tags.add("charisma");
        else if (key.includes("crime")) tags.add("crime");
        else if (
            key.includes("strength") ||
            key.includes("defense") ||
            key.includes("dexterity") ||
            key.includes("agility")
        ) {
            tags.add("combat");
        }
        else if (key.includes("money") || key.includes("cash")) tags.add("money");
    }

    if (lowerName.includes("neuroflux")) tags.add("repeatable");
    if (lowerName.includes("red pill")) tags.add("progression");

    if (tags.size === 0) tags.add("misc");

    return [...tags];
}

function safeOwnedAugmentations(ns, includeQueued) {
    try {
        return ns.singularity.getOwnedAugmentations(includeQueued);
    } catch {
        return [];
    }
}

function safeAugmentationsFromFaction(ns, faction) {
    try {
        return ns.singularity.getAugmentationsFromFaction(faction);
    } catch {
        return [];
    }
}

function safeFactionRep(ns, faction) {
    try {
        return ns.singularity.getFactionRep(faction);
    } catch {
        return 0;
    }
}

function safeAugmentationPrice(ns, name) {
    try {
        return ns.singularity.getAugmentationPrice(name);
    } catch {
        return Infinity;
    }
}

function safeAugmentationRepReq(ns, name) {
    try {
        return ns.singularity.getAugmentationRepReq(name);
    } catch {
        return Infinity;
    }
}

function safeAugmentationStats(ns, name) {
    try {
        return ns.singularity.getAugmentationStats(name);
    } catch {
        return {};
    }
}

function safeAugmentationPrereqs(ns, name) {
    try {
        return ns.singularity.getAugmentationPrereq(name);
    } catch {
        return [];
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