const SELL_FOR_MONEY = "Sell for Money";
const IMPROVE_STUDYING = "Improve Studying";
const REDUCE_MIN_SECURITY = "Reduce Minimum Security";
const INCREASE_MAX_MONEY = "Increase Maximum Money";

const BN9_CASH_FLOOR = 25_000_000;
const BN9_TARGET_BOOST_CASH_FLOOR = 100_000_000;
const BN9_STABLE_HASH_RATE = 1;
const BN9_SECURITY_BOOST_SPENDS = 5;
const BN9_MONEY_BOOST_SPENDS = 3;

export function chooseHacknetHashUpgrade(ns, options = {}) {
    const manualUpgrade =
        normalizeManualUpgrade(options.manualUpgrade);

    if (manualUpgrade) {
        return {
            upgradeName: manualUpgrade,
            target: normalizeTarget(options.manualTarget),
            source: "manual",
            reason: `Manual hash upgrade override: ${manualUpgrade}.`,
        };
    }

    const daemonState =
        options.daemonState ?? {};
    const bootstrapTarget =
        readText(ns, "/data/bootstrap-target.txt");
    const target =
        chooseHashTarget(ns, daemonState, bootstrapTarget);
    const currentWork =
        getCurrentWork(ns);
    const mode =
        daemonState.mode ?? "bootstrap";
    const priority =
        daemonState.spendingPolicy?.priority ?? "bootstrap";
    const factionProgression =
        daemonState.factionProgression ?? {};
    const factionWork =
        readJson(ns, "/data/faction-work-plan.txt");
    const factionDonation =
        readJson(ns, "/data/faction-donation-plan.txt");
    const hacknetState =
        readJson(ns, "/data/hacknet-state.txt");
    const expPolicy =
        factionProgression.expPolicy ?? {};
    const hasDaemonState =
        Number.isFinite(Number(daemonState.updatedAt));
    const bitNode =
        getCurrentBitNode(ns);

    if (isStudying(currentWork)) {
        return {
            upgradeName: IMPROVE_STUDYING,
            target: null,
            source: "current-work",
            reason: "Player is currently studying; hashes improve study gains.",
        };
    }

    if (bitNode === 9) {
        const bn9Choice =
            chooseBn9HashUpgrade(ns, {
                mode,
                priority,
                target,
                hasDaemonState,
                factionWork,
                factionDonation,
                factionProgression,
                expPolicy,
                hacknetState,
            });

        if (bn9Choice) return bn9Choice;
    }

    if (shouldFuelFactionProgression(priority, mode, factionWork, factionDonation, factionProgression)) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: "faction-fuel",
            reason: getFactionFuelReason(factionWork, factionDonation, factionProgression),
        };
    }

    if (
        !hasDaemonState ||
        mode === "bootstrap" ||
        mode === "exp" ||
        priority === "leveling" ||
        expPolicy.shouldLevelNow === true
    ) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: hasDaemonState ? "leveling-no-study" : "bootstrap",
            reason:
                hasDaemonState
                    ? "Leveling is active but player is not studying; sell hashes to fund home/Hacknet growth."
                    : "Full daemon state is not available yet; sell hashes to fund bootstrap/Hacknet growth.",
        };
    }

    if (target && shouldReduceSecurity(ns, target)) {
        return {
            upgradeName: REDUCE_MIN_SECURITY,
            target,
            source: "target-prep",
            reason: `${target} minimum security is still worth reducing for BN9 money/prep.`,
        };
    }

    if (target && shouldIncreaseMaxMoney(ns, target, daemonState)) {
        return {
            upgradeName: INCREASE_MAX_MONEY,
            target,
            source: "target-growth",
            reason: `${target} is the current money target; increase max money when security is already clean.`,
        };
    }

    return {
        upgradeName: SELL_FOR_MONEY,
        target: null,
        source: "default",
        reason: "No higher-value hash target is ready; sell hashes for money to feed BN9 growth.",
    };
}

function chooseBn9HashUpgrade(ns, context) {
    const economy =
        getHashEconomySnapshot(ns);

    if (shouldFuelFactionProgression(
        context.priority,
        context.mode,
        context.factionWork,
        context.factionDonation,
        context.factionProgression
    )) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: "bn9-faction-fuel",
            phase: "cash",
            reason: getFactionFuelReason(context.factionWork, context.factionDonation, context.factionProgression),
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    if (shouldFuelHacknetSnowball(context.hacknetState)) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: "bn9-hacknet-snowball",
            phase: "cash",
            reason:
                getHacknetSnowballReason(context.hacknetState),
            hacknetStatus: context.hacknetState?.status ?? "unknown",
            nextHacknetAction:
                context.hacknetState?.nextAction?.label ??
                context.hacknetState?.roi?.bestCandidate?.label ??
                null,
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    if (economy.money < BN9_CASH_FLOOR) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: "bn9-cash-ignition",
            phase: "cash",
            reason: `BN9 cash is below ${formatMoney(BN9_CASH_FLOOR)}; sell hashes aggressively to escape crime/bootstrap money.`,
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    if (!context.target) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: "bn9-no-target",
            phase: "cash",
            reason: "BN9 has no useful hash target yet; sell hashes for money.",
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    if (economy.production < BN9_STABLE_HASH_RATE || economy.money < BN9_TARGET_BOOST_CASH_FLOOR) {
        return {
            upgradeName: SELL_FOR_MONEY,
            target: null,
            source: "bn9-hash-snowball",
            phase: "cash",
            reason:
                `BN9 hash rate/cash is still building; sell hashes until production is at least ` +
                `${BN9_STABLE_HASH_RATE}/s and cash is above ${formatMoney(BN9_TARGET_BOOST_CASH_FLOOR)}.`,
            targetCandidate: context.target,
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    if (shouldReduceSecurity(ns, context.target)) {
        return {
            upgradeName: REDUCE_MIN_SECURITY,
            target: context.target,
            fallbackUpgradeName: SELL_FOR_MONEY,
            fallbackTarget: null,
            maxSpendsPerCycle: BN9_SECURITY_BOOST_SPENDS,
            source: "bn9-target-security",
            phase: "target-boost",
            reason:
                `${context.target} is the selected BN9 money target; spend a small hash slice reducing security, then sell leftovers.`,
            targetStats: getTargetStats(ns, context.target),
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    if (shouldIncreaseMaxMoney(ns, context.target, { mode: "money", spendingPolicy: { priority: "income" } })) {
        return {
            upgradeName: INCREASE_MAX_MONEY,
            target: context.target,
            fallbackUpgradeName: SELL_FOR_MONEY,
            fallbackTarget: null,
            maxSpendsPerCycle: BN9_MONEY_BOOST_SPENDS,
            source: "bn9-target-money",
            phase: "target-boost",
            reason:
                `${context.target} is clean enough; spend a small hash slice increasing max money, then sell leftovers.`,
            targetStats: getTargetStats(ns, context.target),
            money: economy.money,
            hashProduction: economy.production,
        };
    }

    return {
        upgradeName: SELL_FOR_MONEY,
        target: null,
        source: context.hasDaemonState ? "bn9-default" : "bn9-bootstrap-default",
        phase: "cash",
        reason: "BN9 target is already clean enough for now; sell hashes for augments, home upgrades, stocks, and Hacknet compounding.",
        targetCandidate: context.target,
        money: economy.money,
        hashProduction: economy.production,
    };
}

function shouldFuelHacknetSnowball(hacknetState = {}) {
    if (!hacknetState || Object.keys(hacknetState).length === 0) return true;
    if (hacknetState.status === "unavailable" || hacknetState.status === "missing") return true;
    if (hacknetState.allowed === false) return false;
    if (hacknetState.complete === true) return false;

    return true;
}

function getHacknetSnowballReason(hacknetState = {}) {
    const next =
        hacknetState?.nextAction?.label ??
        hacknetState?.roi?.bestCandidate?.label ??
        "the next Hacknet upgrade";
    const status =
        hacknetState?.status ?? "unknown";

    return `BN9 snowball active: sell hashes for cash so Hacknet buyer can buy ${next}. Buyer status: ${status}.`;
}

function shouldFuelFactionProgression(priority, mode, factionWork, factionDonation, factionProgression) {
    const progressionPriority =
        priority === "progression" ||
        priority === "faction" ||
        mode === "progression" ||
        mode === "faction";

    if (!progressionPriority) return false;

    return (
        factionWork?.active === true ||
        factionDonation?.active === true ||
        factionProgression?.progressionAction?.type === "reputation" ||
        factionProgression?.progressionAction?.type === "donation"
    );
}

function getFactionFuelReason(factionWork, factionDonation, factionProgression) {
    if (factionDonation?.active === true) {
        return `Faction donation is the current bottleneck for ${factionDonation.targetFaction ?? "the target faction"}; sell hashes for cash.`;
    }

    if (factionWork?.active === true) {
        return `Faction reputation is the current bottleneck for ${factionWork.targetFaction ?? "the target faction"}; sell hashes for money while faction work/share earns rep.`;
    }

    return `Faction progression action is ${factionProgression?.progressionAction?.type ?? "active"}; sell hashes for money instead of spending them on server prep.`;
}

function normalizeManualUpgrade(value) {
    const text =
        String(value ?? "").trim();

    if (!text || text.toLowerCase() === "auto") return null;

    return text;
}

function normalizeTarget(value) {
    const text =
        String(value ?? "").trim();

    return text || null;
}

function chooseHashTarget(ns, daemonState, bootstrapTarget) {
    const candidates = [
        daemonState?.laneTargets?.primary,
        daemonState?.target,
        daemonState?.targetPlan?.target,
        bootstrapTarget,
    ];

    return candidates
        .map(normalizeTarget)
        .find(target => isUsefulServerTarget(ns, target)) ?? null;
}

function isUsefulServerTarget(ns, target) {
    try {
        return (
            target &&
            target !== "home" &&
            ns.serverExists(target) &&
            ns.getServerMaxMoney(target) > 0
        );
    } catch {
        return false;
    }
}

function shouldReduceSecurity(ns, target) {
    try {
        const minSecurity =
            ns.getServerMinSecurityLevel(target);
        const currentSecurity =
            ns.getServerSecurityLevel(target);

        return currentSecurity - minSecurity > 2;
    } catch {
        return false;
    }
}

function shouldIncreaseMaxMoney(ns, target, daemonState) {
    try {
        const mode =
            daemonState.mode ?? "money";
        const priority =
            daemonState.spendingPolicy?.priority ?? "income";
        const maxMoney =
            ns.getServerMaxMoney(target);
        const minSecurity =
            ns.getServerMinSecurityLevel(target);
        const currentSecurity =
            ns.getServerSecurityLevel(target);

        return (
            maxMoney > 0 &&
            currentSecurity - minSecurity <= 2 &&
            (
                mode === "money" ||
                priority === "income" ||
                mode === "bootstrap"
            )
        );
    } catch {
        return false;
    }
}

function getHashEconomySnapshot(ns) {
    return {
        money: safePlayerMoney(ns),
        production: getTotalHashProduction(ns),
        hashes: safeNumHashes(ns),
        capacity: safeHashCapacity(ns),
    };
}

function getTargetStats(ns, target) {
    try {
        const maxMoney =
            ns.getServerMaxMoney(target);
        const money =
            ns.getServerMoneyAvailable(target);
        const minSecurity =
            ns.getServerMinSecurityLevel(target);
        const security =
            ns.getServerSecurityLevel(target);

        return {
            money,
            maxMoney,
            moneyRatio: maxMoney > 0 ? money / maxMoney : 0,
            security,
            minSecurity,
            securityGap: security - minSecurity,
        };
    } catch {
        return null;
    }
}

function getTotalHashProduction(ns) {
    try {
        const count =
            ns.hacknet?.numNodes?.() ?? 0;

        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Number(ns.hacknet.getNodeStats(i)?.production) || 0;
        }

        return total;
    } catch {
        return 0;
    }
}

function safePlayerMoney(ns) {
    try {
        return Number(ns.getPlayer().money) || 0;
    } catch {
        return 0;
    }
}

function safeNumHashes(ns) {
    try {
        return ns.hacknet.numHashes();
    } catch {
        return 0;
    }
}

function safeHashCapacity(ns) {
    try {
        return ns.hacknet.hashCapacity();
    } catch {
        return 0;
    }
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer().bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function formatMoney(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}b`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}m`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
}

function isStudying(work) {
    const type =
        String(work?.type ?? "").toUpperCase();

    return (
        type === "CLASS" ||
        type === "STUDY" ||
        type === "UNIVERSITY" ||
        !!work?.classType ||
        !!work?.universityName
    );
}

function getCurrentWork(ns) {
    try {
        return ns.singularity.getCurrentWork();
    } catch {
        return null;
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

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};

        const raw =
            ns.read(file);

        if (!raw.trim()) return {};

        return JSON.parse(raw);
    } catch {
        return {};
    }
}
