const SELL_FOR_MONEY = "Sell for Money";
const IMPROVE_STUDYING = "Improve Studying";
const REDUCE_MIN_SECURITY = "Reduce Minimum Security";
const INCREASE_MAX_MONEY = "Increase Maximum Money";

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
    const expPolicy =
        factionProgression.expPolicy ?? {};
    const hasDaemonState =
        Number.isFinite(Number(daemonState.updatedAt));

    if (isStudying(currentWork)) {
        return {
            upgradeName: IMPROVE_STUDYING,
            target: null,
            source: "current-work",
            reason: "Player is currently studying; hashes improve study gains.",
        };
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
