//lib/daemon/augmentations.js
const AUGMENTATION_STATE_FILE = "/data/augmentation-state.txt";
const AUGMENTATION_PLAN_FILE = "/data/augmentation-plan.txt";

import { getAugmentationStagePolicy } from "/lib/daemon/augmentation-stage-policy.js";

const DEFAULT_MAX_PRICE = 1_000_000_000_000; // 1t

const BITNODE_STRATEGIES = {
    4: {
        name: "BN4 Singularity / Hacking",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            hacking: 100,
            hacking_exp: 90,
            faction_rep: 85,
            money: 55,
            company_rep: 20,
            charisma: 15,
            combat: 8,
            crime: 5,
            hacknet: 5,
            bladeburner: 0,
        },
    },

    2: {
        name: "BN2 Crime / Gang",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            combat: 100,
            crime: 100,
            money: 60,
            faction_rep: 55,
            hacking: 35,
            hacking_exp: 30,
            charisma: 25,
            company_rep: 10,
            hacknet: 5,
            bladeburner: 0,
        },
    },

    default: {
        name: "Balanced",
        maxPrice: DEFAULT_MAX_PRICE,
        readyBuyOrder: "cheap-first",
        statWeights: {
            hacking: 70,
            hacking_exp: 60,
            faction_rep: 65,
            money: 55,
            company_rep: 35,
            charisma: 25,
            combat: 30,
            crime: 30,
            hacknet: 20,
            bladeburner: 0,
        },
    },
};

export function buildAugmentationPlan(ns, options = {}) {
    const bitNode = getCurrentBitNode(ns);

    const strategy =
        BITNODE_STRATEGIES[bitNode] ??
        BITNODE_STRATEGIES.default;

    const maxPrice =
        options.maxPrice ??
        strategy.maxPrice ??
        DEFAULT_MAX_PRICE;

    const reserveMoney =
        options.reserveMoney ??
        1_000_000_000;

    const data = readJson(ns, AUGMENTATION_STATE_FILE);

    if (!data?.factions?.length) {
        return writePlan(ns, {
            updatedAt: Date.now(),
            bitNode,
            ready: false,
            strategy,
            nextGoal: null,
            blockedReason:
                "No augmentation-state.txt found. Run /tools/augmentation-data-builder.js --force",
            candidates: [],
        });
    }

    const money = ns.getPlayer().money;
    const spendable = Math.max(0, money - reserveMoney);
    const candidates = [];
    const ownedAugmentations = getOwnedAugmentationSet(ns);
    const neuroFluxPolicy = getNeuroFluxPolicy(ns);

    for (const faction of data.factions) {
        if (!faction.joined) continue;

        for (const aug of faction.augmentations ?? []) {
            if (shouldSkipAug(aug, maxPrice, ownedAugmentations, {
                faction: faction.faction,
                neuroFluxPolicy,
            })) continue;

            const live =
                getLiveAugmentationSnapshot(ns, faction.faction, aug.name);
            const price =
                live.price ?? aug.price;
            const rep =
                live.rep ?? aug.rep;
            const factionRep =
                live.factionRep ?? aug.factionRep;
            const hasRep = factionRep >= rep;
            const affordable = spendable >= price;
            const hasPrereqs = hasPrereqsMet(data, aug);

            if (
                isNeuroFlux(aug.name) &&
                !isAllowedNeuroFluxFaction(faction.faction, neuroFluxPolicy)
            ) {
                continue;
            }

            if (
                isNeuroFlux(aug.name) &&
                faction.faction === "BitRunners" &&
                (!hasRep || !affordable)
            ) {
                continue;
            }

            const statScore = scoreStats(aug.stats ?? {}, strategy.statWeights);
            const strategicScore = scoreStrategicValue(aug.name, faction, aug, strategy);
            const readinessScore = scoreReadiness({ hasRep, affordable, hasPrereqs });
            const stagePolicy = getAugmentationStagePolicy({
                name: aug.name,
                faction: faction.faction,
            });
            const priorityClass = getAugPriorityClass({
                statBreakdown: getStatBreakdown(aug.stats ?? {}, strategy.statWeights),
            });
            const pricePenalty = Math.log10(Math.max(10, price)) * 8;
            const repPenalty = Math.log10(Math.max(10, rep)) * 3;
            const neuroFluxBoost =
                isNeuroFlux(aug.name) && isAllowedNeuroFluxFaction(faction.faction, neuroFluxPolicy)
                    ? 650
                    : 0;

            const score =
                statScore +
                strategicScore +
                stagePolicy.priority +
                readinessScore -
                pricePenalty -
                repPenalty +
                neuroFluxBoost;

            candidates.push({
                name: aug.name,
                faction: faction.faction,
                theme: faction.theme,
                price,
                rep,
                factionRep,
                hasRep,
                affordable,
                hasPrereqs,
                prereqs: aug.prereqs ?? [],
                stats: aug.stats ?? {},
                statBreakdown: getStatBreakdown(aug.stats ?? {}, strategy.statWeights),
                priorityClass,
                stagePolicy,
                repeatable: isNeuroFlux(aug.name),
                favorLoop: isNeuroFlux(aug.name) && isAllowedNeuroFluxFaction(faction.faction, neuroFluxPolicy)
                    ? neuroFluxPolicy
                    : null,
                tags: aug.tags ?? [],
                score,
            });
        }
    }

    if (candidates.length === 0) {
        candidates.push(
            ...buildLiveFallbackCandidates(ns, {
                strategy,
                maxPrice,
                spendable,
                ownedAugmentations,
                neuroFluxPolicy,
            })
        );
    }

    candidates.sort((a, b) => compareForPurchase(a, b, strategy));

    const daedalusNeuroFluxGoal =
        getDaedalusNeuroFluxGoal(candidates, neuroFluxPolicy);

    const forcedRedPill = getForcedRedPillGoal(ns);

    const nextGoal =
        daedalusNeuroFluxGoal ??
        forcedRedPill ??
        candidates[0] ??
        null;

    return writePlan(ns, {
        updatedAt: Date.now(),
        bitNode,
        strategy,
        money,
        reserveMoney,
        spendable,
        maxPrice,
        ready: !!nextGoal && nextGoal.hasRep && nextGoal.affordable && nextGoal.hasPrereqs,
        nextGoal,
        blockedReason: getBlockedReason(nextGoal),
        neuroFluxPolicy,
        candidates: candidates.slice(0, 25),
    });
}

function shouldSkipAug(aug, maxPrice, ownedAugmentations = new Set(), context = {}) {
    if (!aug) return true;
    const neuroFlux =
        isNeuroFlux(aug.name);

    if (neuroFlux) {
        return !(
            isAllowedNeuroFluxFaction(context?.faction, context?.neuroFluxPolicy) &&
            context?.neuroFluxPolicy?.enabled === true
        );
    }

    if (aug.owned || aug.installed || aug.queued) return true;
    if (ownedAugmentations.has(aug.name)) return true;
    if (!Number.isFinite(aug.price) || aug.price <= 0) return true;
    // Do not skip expensive augments entirely.
    // Keep them visible as blocked goals unless they are absurdly beyond policy.
    if (aug.price > maxPrice * 10) return true;
    return false;
}

function compareForPurchase(a, b) {
    const aStage = a.stagePolicy?.priority ?? 0;
    const bStage = b.stagePolicy?.priority ?? 0;

    if (aStage !== bStage) return bStage - aStage;

    if (a.hasRep && !b.hasRep) return -1;
    if (!a.hasRep && b.hasRep) return 1;

    if (a.hasPrereqs && !b.hasPrereqs) return -1;
    if (!a.hasPrereqs && b.hasPrereqs) return 1;

    const aReady = a.hasRep && a.affordable && a.hasPrereqs;
    const bReady = b.hasRep && b.affordable && b.hasPrereqs;

    if (aReady && !bReady) return -1;
    if (!aReady && bReady) return 1;

    const aRepReadyMoneyBlocked = a.hasRep && !a.affordable && a.hasPrereqs;
    const bRepReadyMoneyBlocked = b.hasRep && !b.affordable && b.hasPrereqs;

    if (aRepReadyMoneyBlocked && !bRepReadyMoneyBlocked) return -1;
    if (!aRepReadyMoneyBlocked && bRepReadyMoneyBlocked) return 1;

    if ((aReady && bReady) || (aRepReadyMoneyBlocked && bRepReadyMoneyBlocked)) {
        const aClass = getAugPriorityClass(a);
        const bClass = getAugPriorityClass(b);

        if (aClass !== bClass) return bClass - aClass;

        return a.price - b.price;
    }

    return b.score - a.score;
}

function getAugPriorityClass(item) {
    const breakdown = item.statBreakdown ?? {};

    if ((breakdown.hacking ?? 0) > 0 || (breakdown.hacking_exp ?? 0) > 0) return 4;
    if ((breakdown.faction_rep ?? 0) > 0) return 3;
    if ((breakdown.money ?? 0) > 0) return 2;
    if ((breakdown.company_rep ?? 0) > 0) return 1;

    return 0;
}

function scoreReadiness(readiness) {
    let score = 0;

    if (readiness.hasRep) score += 500;
    if (readiness.affordable) score += 300;
    if (readiness.hasPrereqs) score += 200;

    return score;
}

function scoreStrategicValue(name, faction, aug, strategy) {
    let score = 0;
    const lower = String(name).toLowerCase();

    if (lower.includes("neuroflux governor") && faction.faction === "Daedalus") score += 900;
    if (lower.includes("neuroflux governor") && faction.faction === "BitRunners") score += 500;
    if (lower.includes("red pill")) score += 5000;
    if (lower.includes("bitwire")) score += 400;
    if (lower.includes("cranial")) score += 350;
    if (lower.includes("synaptic")) score += 300;
    if (lower.includes("neurotrainer")) score += 250;
    if (lower.includes("datajack")) score += 250;

    // Faction theme matters, but less than actual stats.
    if (faction.theme === "hacking") score += strategy.statWeights.hacking ?? 0;
    if (faction.theme === "crime") score += strategy.statWeights.crime ?? 0;
    if (faction.theme === "combat") score += strategy.statWeights.combat ?? 0;
    if (faction.theme === "company") score += strategy.statWeights.company_rep ?? 0;

    return score;
}

function buildLiveFallbackCandidates(ns, context) {
    const player = ns.getPlayer();
    const joinedFactions = player.factions ?? [];
    const seen = new Set();
    const fallback = [];
    const needsDaedalusInviteAugs =
        !joinedFactions.includes("Daedalus") &&
        getOwnedAugmentationCountForInvite(ns) < 30;

    for (const faction of joinedFactions) {
        const names = getFactionAugmentations(ns, faction);
        const factionRep = safeNumber(() => ns.singularity.getFactionRep(faction), 0);

        for (const name of names) {
            const neuroFlux = isNeuroFlux(name);

            if (!neuroFlux && seen.has(name)) continue;
            if (!neuroFlux) seen.add(name);

            if (!neuroFlux && context.ownedAugmentations.has(name)) continue;
            if (
                neuroFlux &&
                !isAllowedNeuroFluxFaction(faction, context.neuroFluxPolicy) &&
                !needsDaedalusInviteAugs
            ) {
                continue;
            }

            const price = safeNumber(() => ns.singularity.getAugmentationPrice(name), Infinity);
            const rep = safeNumber(() => ns.singularity.getAugmentationRepReq(name), Infinity);

            if (!Number.isFinite(price) || price <= 0) continue;
            if (!neuroFlux && price > context.maxPrice * 10) continue;

            const hasRep = factionRep >= rep;
            const affordable = context.spendable >= price;
            const stats = safeAugStats(ns, name);
            const statBreakdown = getStatBreakdown(stats, context.strategy.statWeights);
            const stagePolicy = getAugmentationStagePolicy({ name, faction });
            const priorityClass = getAugPriorityClass({ statBreakdown });
            const tags = neuroFlux ? ["repeatable"] : [];
            const score =
                scoreStats(stats, context.strategy.statWeights) +
                scoreStrategicValue(name, { faction, theme: "live" }, { tags }, context.strategy) +
                stagePolicy.priority +
                scoreReadiness({ hasRep, affordable, hasPrereqs: true }) +
                (
                    neuroFlux && needsDaedalusInviteAugs
                        ? 1200
                        : 0
                );

            fallback.push({
                name,
                faction,
                theme: "live",
                price,
                rep,
                factionRep,
                hasRep,
                affordable,
                hasPrereqs: true,
                prereqs: [],
                stats,
                statBreakdown,
                priorityClass,
                stagePolicy,
                repeatable: neuroFlux,
                favorLoop: neuroFlux
                    ? {
                        ...(context.neuroFluxPolicy ?? {}),
                        stage: needsDaedalusInviteAugs
                            ? "daedalus-invite-augmentation-count"
                            : context.neuroFluxPolicy?.stage,
                        reason: needsDaedalusInviteAugs
                            ? "NeuroFlux is being used as an augmentation-count filler to unlock Daedalus."
                            : context.neuroFluxPolicy?.reason,
                    }
                    : null,
                tags,
                score,
                source: "live-fallback",
            });
        }
    }

    return fallback;
}

function isNeuroFlux(name) {
    return String(name ?? "") === "NeuroFlux Governor";
}

function isAllowedNeuroFluxFaction(faction, policy) {
    if (!policy?.enabled) return false;
    if (faction === policy.targetFaction) return true;
    return faction === "Daedalus" && policy.allowDaedalus === true;
}

function getNeuroFluxPolicy(ns) {
    try {
        const player = ns.getPlayer();
        const joinedBitRunners =
            player.factions?.includes("BitRunners") === true;
        const joinedDaedalus =
            player.factions?.includes("Daedalus") === true;
        const owned =
            ns.singularity.getOwnedAugmentations(true);
        const hasRedPill =
            owned.includes("The Red Pill");
        const bitRunnersFavorState =
            buildFactionFavorState(ns, "BitRunners");
        const daedalusFavorState =
            buildFactionFavorState(ns, "Daedalus");

        if (
            joinedDaedalus &&
            !hasRedPill &&
            daedalusFavorState.favorReady !== true
        ) {
            return {
                enabled: true,
                stage: "daedalus-neuroflux",
                targetFaction: "Daedalus",
                targetAugmentation: "NeuroFlux Governor",
                allowDaedalus: true,
                favor: daedalusFavorState.currentFavor,
                favorToDonate: daedalusFavorState.favorToDonate,
                favorRemaining: daedalusFavorState.missingProjectedFavor,
                donationUnlocked: daedalusFavorState.currentFavor >= daedalusFavorState.favorToDonate,
                projectedDonationUnlocked: daedalusFavorState.favorReady,
                moneyModePreferred: false,
                installRequiredForFavor: true,
                favorState: daedalusFavorState,
                reason: "Daedalus NeuroFlux is prioritized before Red Pill until projected Daedalus favor reaches the donation unlock threshold.",
            };
        }

        return {
            enabled:
                joinedBitRunners &&
                !hasRedPill,
            stage: "bitrunners-neuroflux",
            targetFaction: "BitRunners",
            targetAugmentation: "NeuroFlux Governor",
            allowDaedalus: false,
            favor: bitRunnersFavorState.currentFavor,
            favorToDonate: bitRunnersFavorState.favorToDonate,
            favorRemaining: bitRunnersFavorState.missingProjectedFavor,
            donationUnlocked: bitRunnersFavorState.currentFavor >= bitRunnersFavorState.favorToDonate,
            projectedDonationUnlocked: bitRunnersFavorState.favorReady,
            moneyModePreferred: true,
            installRequiredForFavor: true,
            favorState: bitRunnersFavorState,
            reason:
                joinedBitRunners
                    ? "Pre-Red-Pill BitRunners NeuroFlux loop is eligible; queue NFG opportunistically while money remains primary."
                    : "BitRunners not joined; NeuroFlux favor loop unavailable.",
        };
    } catch (error) {
        return {
            enabled: false,
            stage: "bitrunners-neuroflux",
            targetFaction: "BitRunners",
            targetAugmentation: "NeuroFlux Governor",
            allowDaedalus: false,
            reason: `Unable to evaluate BitRunners NeuroFlux loop: ${String(error)}`,
        };
    }
}

function getDaedalusNeuroFluxGoal(candidates, neuroFluxPolicy) {
    if (neuroFluxPolicy?.enabled !== true) return null;
    if (neuroFluxPolicy.stage !== "daedalus-neuroflux") return null;
    if (neuroFluxPolicy.favorState?.favorReady === true) return null;

    return candidates.find(candidate =>
        candidate.faction === "Daedalus" &&
        isNeuroFlux(candidate.name)
    ) ?? null;
}

function buildFactionFavorState(ns, faction) {
    const currentFavor =
        safeNumber(() => ns.singularity.getFactionFavor(faction), 0);
    const currentRep =
        safeNumber(() => ns.singularity.getFactionRep(faction), 0);
    const favorToDonate =
        safeNumber(() => ns.singularity.getFavorToDonate(), 150);

    const projectedFavorGain =
        safeNumber(
            () => ns.formulas.reputation.calculateRepToFavor(currentRep),
            null
        );
    const requiredRepForFavorTarget =
        safeNumber(
            () => ns.formulas.reputation.calculateFavorToRep(
                Math.max(0, favorToDonate - currentFavor)
            ),
            null
        );
    const projectedFavor =
        projectedFavorGain === null
            ? currentFavor
            : currentFavor + projectedFavorGain;
    const missingProjectedFavor =
        Math.max(0, favorToDonate - projectedFavor);
    const missingRepForFavorTarget =
        requiredRepForFavorTarget === null
            ? null
            : Math.max(0, requiredRepForFavorTarget - currentRep);

    return {
        faction,
        currentFavor,
        currentRep,
        favorToDonate,
        targetFavor: favorToDonate,
        projectedFavorGain,
        projectedFavor,
        missingProjectedFavor,
        requiredRepForFavorTarget,
        missingRepForFavorTarget,
        favorReady: projectedFavor >= favorToDonate,
        formulaSource:
            projectedFavorGain === null || requiredRepForFavorTarget === null
                ? "unavailable"
                : "formulas.reputation",
    };
}

function safeNumber(fn, fallback) {
    try {
        const value = fn();
        return Number.isFinite(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

function scoreStats(stats, weights) {
    return Object.values(getStatBreakdown(stats, weights))
        .reduce((sum, value) => sum + value, 0);
}

function getStatBreakdown(stats, weights) {
    const result = {
        hacking: 0,
        hacking_exp: 0,
        faction_rep: 0,
        money: 0,
        company_rep: 0,
        charisma: 0,
        combat: 0,
        crime: 0,
        hacknet: 0,
        bladeburner: 0,
        misc: 0,
    };

    for (const [rawKey, rawValue] of Object.entries(stats ?? {})) {
        if (typeof rawValue !== "number") continue;
        if (rawValue <= 1) continue;

        const key = rawKey.toLowerCase();
        const gain = rawValue - 1;

        const category = getStatCategory(key);
        const weight = weights[category] ?? weights.misc ?? 0;

        result[category] += gain * weight * 100;
    }

    return result;
}

function getStatCategory(key) {
    if (key.includes("hacknet")) return "hacknet";
    if (key.includes("bladeburner")) return "bladeburner";

    if (key.includes("hacking_exp") || key.includes("hackingexp")) return "hacking_exp";
    if (key.includes("hacking")) return "hacking";
    if (key.includes("hack")) return "hacking";

    if (key.includes("faction")) return "faction_rep";
    if (key.includes("company")) return "company_rep";

    if (key.includes("charisma")) return "charisma";
    if (key.includes("crime")) return "crime";

    if (
        key.includes("strength") ||
        key.includes("defense") ||
        key.includes("dexterity") ||
        key.includes("agility")
    ) {
        return "combat";
    }

    if (key.includes("money") || key.includes("cash")) return "money";

    return "misc";
}

function hasPrereqsMet(data, aug) {
    const prereqs = aug.prereqs ?? [];
    if (prereqs.length === 0) return true;

    const owned = new Set();

    for (const item of data.uniqueAugmentations ?? []) {
        if (item.owned || item.installed || item.queued) {
            owned.add(item.name);
        }
    }

    return prereqs.every(x => owned.has(x));
}

function getBlockedReason(goal) {
    if (!goal) return "No valid augmentation candidate found.";
    if (!goal.hasPrereqs) return `Missing prereq for ${goal.name}: ${goal.prereqs.join(", ")}`;
    if (!goal.hasRep) return `Need more rep with ${goal.faction}.`;
    if (!goal.affordable) return `Need more money for ${goal.name}.`;
    return "Ready to buy.";
}

function writePlan(ns, plan) {
    ns.write(AUGMENTATION_PLAN_FILE, JSON.stringify(plan, null, 2), "w");
    return plan;
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer().bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function getFactionAugmentations(ns, faction) {
    try {
        return ns.singularity.getAugmentationsFromFaction(faction) ?? [];
    } catch {
        return [];
    }
}

function getOwnedAugmentationCountForInvite(ns) {
    try {
        return ns.singularity.getOwnedAugmentations(true).length;
    } catch {
        return 0;
    }
}

function safeAugStats(ns, name) {
    try {
        return ns.singularity.getAugmentationStats(name) ?? {};
    } catch {
        return {};
    }
}

function getForcedRedPillGoal(ns) {
    try {
        const player = ns.getPlayer();

        if (!player.factions.includes("Daedalus")) {
            return null;
        }

        const owned =
            ns.singularity.getOwnedAugmentations(true);

        if (owned.includes("The Red Pill")) {
            return null;
        }

        const rep =
            ns.singularity.getFactionRep("Daedalus");

        const repReq =
            ns.singularity.getAugmentationRepReq("The Red Pill");

        const price =
            ns.singularity.getAugmentationPrice("The Red Pill");

        return {
            name: "The Red Pill",
            faction: "Daedalus",
            theme: "endgame",

            price,
            rep: repReq,
            factionRep: rep,

            hasRep: rep >= repReq,
            affordable: player.money >= price,
            hasPrereqs: true,
            prereqs: [],

            stats: {},
            statBreakdown: {},
            priorityClass: 999,
            stagePolicy: getAugmentationStagePolicy({
                name: "The Red Pill",
                faction: "Daedalus",
            }),

            tags: ["red-pill", "endgame"],

            score: Number.MAX_SAFE_INTEGER,
        };
    } catch {
        return null;
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

function getOwnedAugmentationSet(ns) {
    try {
        return new Set(ns.singularity.getOwnedAugmentations(true));
    } catch {
        return new Set();
    }
}

function getLiveAugmentationSnapshot(ns, faction, aug) {
    try {
        return {
            price: ns.singularity.getAugmentationPrice(aug),
            rep: ns.singularity.getAugmentationRepReq(aug),
            factionRep: ns.singularity.getFactionRep(faction),
        };
    } catch {
        return {};
    }
}
