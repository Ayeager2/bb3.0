// /lib/ui/dashboard-state.js

export const DASHBOARD_STATE_FILE = "/data/ui/dashboard-state.txt";

export function buildDashboardState(ns, daemonState = {}) {
    const player = ns.getPlayer();

    const bitNodeNumber =
        safe(() => ns.getResetInfo().currentNode, 0);

    const hasSingularity =
        typeof ns.singularity !== "undefined";

    const hasStock =
        typeof ns.stock !== "undefined";

    const phase =
        daemonState?.progression?.phase ??
        daemonState?.phase ??
        "UNKNOWN";

    const mode =
        daemonState?.mode ??
        daemonState?.currentMode ??
        "UNKNOWN";

    const priority =
        daemonState?.priority ??
        daemonState?.progression?.priority ??
        "UNKNOWN";

    const target =
        daemonState?.target ??
        daemonState?.currentTarget ??
        null;

    const capabilities = {
        singularity: hasSingularity,
        stocks: hasStock,
        gangs: safe(() => ns.gang.inGang(), false),
        corporation: safe(() => ns.corporation.hasCorporation(), false),
        bladeburner: safe(() => ns.bladeburner.inBladeburner(), false),
        sleeves: safe(() => ns.sleeve.getNumSleeves() > 0, false),
        hacknet: typeof ns.hacknet !== "undefined",
        stanek: typeof ns.stanek !== "undefined",
    };

    return {
        schemaVersion: 1,
        updatedAt: Date.now(),

        bitnode: {
            number: bitNodeNumber,
            name: getBitNodeName(bitNodeNumber),
            strategy: bitNodeNumber === 4 ? "BN4_SINGULARITY_REPEAT" : "GENERAL_PROGRESS",
        },

        progression: {
            phase,
            mode,
            priority,
            posture: getPosture(phase, priority),
        },

        player: {
            money: player.money,
            hacking: player.skills?.hacking ?? player.hacking ?? 0,
            city: player.city,
        },

        capabilities,

        theme: resolveTheme(bitNodeNumber, phase, capabilities),

        widgets: resolveWidgets({
            bitNodeNumber,
            phase,
            priority,
            capabilities,
        }),

        systems: {
            daemon: {
                status: "running",
                mode,
                priority,
                target,
            },

            factions: {
                currentFocus: daemonState?.factions?.currentFocus ?? null,
                stage: daemonState?.singularity?.stage ?? daemonState?.factionStage ?? null,
            },

            augmentations: {
                ownedCount: safe(() => ns.singularity.getOwnedAugmentations(false).length, 0),
                pendingCount: safe(() => ns.singularity.getOwnedAugmentations(true).length, 0),
                redPillOwned: safe(
                    () => ns.singularity.getOwnedAugmentations(true).includes("The Red Pill"),
                    false
                ),
            },

            reset: {
                armed: readBooleanFile(ns, "/data/reset-armed.txt"),
                readinessPercent: daemonState?.reset?.readinessPercent ?? 0,
                blockers: daemonState?.reset?.blockers ?? [],
            },
        },
    };
}

export function writeDashboardState(ns, dashboardState) {
    ns.write(DASHBOARD_STATE_FILE, JSON.stringify(dashboardState, null, 2), "w");
}

function resolveWidgets({ bitNodeNumber, phase, capabilities }) {
    const visible = [
        "daemonHeader",
        "eventStream",
        "ramAllocation",
        "targetIntel",
        "serviceLifecycle",
    ];

    const emphasized = [];

    if (capabilities.singularity) {
        visible.push(
            "factionProgress",
            "augmentationPlanner",
            "resetReadiness",
            "redPillTracker"
        );
    }

    if (capabilities.stocks) {
        visible.push("stockMarket", "portfolioExposure");
    }

    if (capabilities.gangs) {
        visible.push("gangOverview", "territoryWarfare", "memberAssignments");
    }

    if (capabilities.corporation) {
        visible.push("corporationDashboard", "divisionProfitability");
    }

    if (capabilities.bladeburner) {
        visible.push("bladeburnerOps", "cityChaos", "blackOpsTracker");
    }

    if (phase === "FACTION" || phase === "RESET_PREP") {
        emphasized.push("factionProgress", "augmentationPlanner", "resetReadiness");
    }

    if (phase === "MONEY" || phase === "SCALING") {
        emphasized.push("targetIntel", "ramAllocation");

        if (capabilities.stocks) {
            emphasized.push("stockMarket");
        }
    }

    if (bitNodeNumber === 4) {
        emphasized.push("redPillTracker");
    }

    return {
        visible: unique(visible),
        emphasized: unique(emphasized),
        hidden: [],
    };
}

function resolveTheme(bitNodeNumber, phase, capabilities) {
    let accent = "system_gray";

    if (phase === "FACTION") accent = "faction_cyan";
    if (phase === "RESET_PREP") accent = "danger_red";
    if (bitNodeNumber === 4 || capabilities.singularity) accent = "singularity_purple";
    if (phase === "MONEY") accent = "money_green";

    return {
        base: "dark_tactical",
        accent,
        dangerLevel: phase === "RESET_PREP" ? "high" : "normal",
    };
}

function getPosture(phase, priority) {
    if (phase === "RESET_PREP") return "RESET_IMMINENT";
    if (phase === "FACTION") return "FACTION_ACCELERATION";
    if (priority === "income") return "AGGRESSIVE_INCOME";
    if (priority === "exp") return "HACKING_GROWTH";
    return "BALANCED_AUTOMATION";
}

function getBitNodeName(n) {
    const names = {
        1: "Source Genesis",
        2: "Rise of the Underworld",
        3: "Corporatocracy",
        4: "The Singularity",
        5: "Artificial Intelligence",
        6: "Bladeburners",
        7: "Bladeburners 2079",
        8: "Ghost of Wall Street",
        9: "Hacktocracy",
        10: "Digital Carbon",
        11: "The Big Crash",
        12: "The Recursion",
        13: "They're Lunatics",
        14: "BN14",
    };

    return names[n] ?? `BitNode ${n}`;
}

function readBooleanFile(ns, file) {
    if (!ns.fileExists(file, "home")) return false;
    return String(ns.read(file)).trim().toLowerCase() === "true";
}

function safe(fn, fallback) {
    try {
        return fn();
    } catch {
        return fallback;
    }
}

function unique(arr) {
    return [...new Set(arr)];
}