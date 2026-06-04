// /tools/dashboard-state-writer.js

const DASHBOARD_STATE_FILE = "/data/ui/dashboard-state.txt";
const DAEMON_STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["once", false],
        ["refresh", 3000],
        ["tail", false],
    ]);

    if (flags.tail) ns.ui.openTail();

    const refreshMs = Number(flags.refresh) || 3000;

    while (true) {
        const daemonState = readJson(ns, DAEMON_STATE_FILE, {});
        const dashboardState = buildDashboardState(daemonState);

        ns.write(DASHBOARD_STATE_FILE, JSON.stringify(dashboardState, null, 2), "w");

        ns.clearLog();
        ns.print("Dashboard state writer running");
        ns.print(`Writing: ${DASHBOARD_STATE_FILE}`);
        ns.print(`BN: ${dashboardState.bitnode.number} ${dashboardState.bitnode.name}`);
        ns.print(`Phase: ${dashboardState.progression.phase}`);
        ns.print(`Mode: ${dashboardState.progression.mode}`);
        ns.print(`Priority: ${dashboardState.progression.priority}`);
        ns.print(`Target: ${dashboardState.daemon.target ?? "none"}`);

        if (flags.once) {
            ns.tprint(`Wrote dashboard UI state to ${DASHBOARD_STATE_FILE}`);
            return;
        }

        await ns.sleep(refreshMs);
    }
}

function buildDashboardState(daemonState) {
    const bitNodeNumber =
        daemonState?.bitNodePlan?.bitNode ??
        daemonState?.bitnode?.number ??
        daemonState?.bitNode ??
        0;

    const mode =
        daemonState?.mode ??
        daemonState?.currentMode ??
        "UNKNOWN";

    const priority =
        daemonState?.spendingPolicy?.priority ??
        daemonState?.priority ??
        daemonState?.currentPriority ??
        daemonState?.modePriority ??
        daemonState?.decision?.priority ??
        daemonState?.progression?.priority ??
        "UNKNOWN";

    const phase =
        daemonState?.bn4VictoryPlan?.stage ??
        daemonState?.progression?.phase ??
        daemonState?.phase ??
        normalizePhaseFromMode(mode);

    const target =
        daemonState?.target ??
        daemonState?.currentTarget ??
        null;

    const capabilities = normalizeCapabilities(daemonState?.capabilities ?? {});

    const targetStats = daemonState?.targetStats ?? {};
    const readiness = daemonState?.bn4Readiness ?? {};
    const victory = daemonState?.bn4VictoryPlan ?? {};
    const player = daemonState?.player ?? {};
    const servers = daemonState?.servers ?? {};
    const policy = daemonState?.spendingPolicy ?? {};
    const share = daemonState?.sharePolicy ?? {};
    const multi = daemonState?.multiTargetPolicy ?? {};
    const controller = daemonState?.controller ?? {};

    return {
        schemaVersion: 2,
        sourceVersion: daemonState?.version ?? null,
        updatedAt: Date.now(),
        daemonUpdatedAt: daemonState?.updatedAt ?? null,

        bitnode: {
            number: bitNodeNumber,
            name: getBitNodeName(bitNodeNumber),
            strategy:
                daemonState?.bitNodePlan?.roadmap ??
                (bitNodeNumber === 4 ? "bn4-singularity" : "standard-growth"),
        },

        progression: {
            phase,
            mode,
            priority,
            posture: getPosture(phase, priority),
            nextAction:
                victory?.nextAction ??
                controller?.reason ??
                multi?.reason ??
                null,
        },

        daemon: {
            target,
            targetOverride: daemonState?.targetOverride ?? null,
            status: "running",
            controller: controller?.name ?? null,
            reason: controller?.reason ?? null,
        },

        player: {
            money: player?.money ?? 0,
            hacking: player?.hacking ?? 0,
        },

        target: {
            name: target,
            maxMoney: targetStats?.maxMoney ?? 0,
            money: targetStats?.money ?? 0,
            moneyPercent: targetStats?.moneyPercent ?? 0,
            minSecurity: targetStats?.minSecurity ?? 0,
            security: targetStats?.security ?? 0,
            securityDiff: targetStats?.securityDiff ?? 0,
            weakenTime: targetStats?.weakenTime ?? 0,
            prepNeed: targetStats?.prepNeed ?? 0,
        },

        policy: {
            reserveMoney: policy?.reserveMoney ?? daemonState?.reserveMoney ?? 0,
            allowServerPurchases: bool(policy?.allowServerPurchases ?? daemonState?.allowServerPurchases),
            allowStockTrading: bool(policy?.allowStockTrading ?? daemonState?.allowStockTrading),
            allowHacknet: bool(policy?.allowHacknet),
            allowHomeRam: bool(policy?.allowHomeRam),
            allowExePurchases: bool(policy?.allowExePurchases),
            allowAugmentPurchases: bool(policy?.allowAugmentPurchases),
            allowReset: bool(policy?.allowReset),
            allowIntTravel: bool(policy?.allowIntTravel),
        },

        servers: {
            rootedCount: servers?.rootedCount ?? 0,
            purchasedCount: Array.isArray(servers?.purchased) ? servers.purchased.length : 0,
            cloudCount: Array.isArray(servers?.cloud) ? servers.cloud.length : 0,
        },

        readiness: {
            targetBitNode: readiness?.targetBitNode ?? null,
            goal: readiness?.goal ?? null,
            ready: bool(readiness?.ready),
            readyCount: readiness?.readyCount ?? 0,
            totalChecks: readiness?.totalChecks ?? 0,
            hackingReady: bool(readiness?.hackingReady),
            moneyReady: bool(readiness?.moneyReady),
            homeRamReady: bool(readiness?.homeRamReady),
            augReady: bool(readiness?.augReady),
            hacking: readiness?.hacking ?? player?.hacking ?? 0,
            hackingTarget: readiness?.hackingTarget ?? 0,
            money: readiness?.money ?? player?.money ?? 0,
            moneyTarget: readiness?.moneyTarget ?? 0,
            augmentCount: readiness?.augmentCount ?? 0,
            augmentTarget: readiness?.augmentTarget ?? 0,
        },

        victory: {
            stage: victory?.stage ?? null,
            nextAction: victory?.nextAction ?? null,
            hackingTarget: victory?.hackingTarget ?? null,
            hasDaedalus: bool(victory?.hasDaedalus),
            hasRedPill: bool(victory?.hasRedPill),
            worldDaemon: victory?.worldDaemon ?? "w0r1d_d43m0n",
            canUseWorldDaemon: bool(victory?.canUseWorldDaemon),
        },

        capabilities,

        share: {
            enabled: bool(share?.enabled),
            aggressive: bool(share?.aggressive),
            reserveRamPercent: share?.reserveRamPercent ?? 0,
        },

        lanes: {
            multiTargetEnabled: bool(multi?.enabled),
            primaryMoneyRamPercent: multi?.primaryMoneyRamPercent ?? 0,
            secondaryMoneyRamPercent: multi?.secondaryMoneyRamPercent ?? 0,
            expRamPercent: multi?.expRamPercent ?? 0,
            adaptive: bool(multi?.adaptive),
            reason: multi?.reason ?? null,
        },

        widgets: resolveWidgets({
            phase,
            mode,
            priority,
            capabilities,
            victory,
            readiness,
        }),

        theme: resolveTheme({
            bitNodeNumber,
            phase,
            mode,
            priority,
            capabilities,
        }),
    };
}

function resolveWidgets({ phase, mode, priority, capabilities, victory, readiness }) {
    const visible = [
        "daemonHeader",
        "coreState",
        "targetIntel",
        "playerStats",
        "policy",
        "serverSummary",
        "laneAllocation",
    ];

    const emphasized = [];

    if (capabilities.singularity || victory?.stage || readiness?.targetBitNode === 4) {
        visible.push(
            "bn4Readiness",
            "bn4Victory",
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

    if (capabilities.corporation || capabilities.corporations) {
        visible.push("corporationDashboard", "divisionProfitability");
    }

    if (capabilities.bladeburner) {
        visible.push("bladeburnerOps", "cityChaos", "blackOpsTracker");
    }

    const p = String(phase ?? "").toLowerCase();
    const m = String(mode ?? "").toLowerCase();
    const pr = String(priority ?? "").toLowerCase();

    if (p.includes("faction") || p.includes("singularity") || p.includes("red-pill") || p.includes("daedalus")) {
        emphasized.push("bn4Victory", "factionProgress", "augmentationPlanner", "redPillTracker");
    }

    if (p.includes("reset") || pr.includes("reset")) {
        emphasized.push("resetReadiness", "bn4Readiness");
    }

    if (m.includes("money") || pr.includes("income")) {
        emphasized.push("targetIntel", "serverSummary", "laneAllocation");
    }

    if (m.includes("exp") || pr.includes("level")) {
        emphasized.push("playerStats", "laneAllocation", "targetIntel");
    }

    return {
        visible: unique(visible),
        emphasized: unique(emphasized),
        hidden: [],
    };
}

function resolveTheme({ bitNodeNumber, phase, mode, priority, capabilities }) {
    const p = String(phase ?? "").toLowerCase();
    const m = String(mode ?? "").toLowerCase();
    const pr = String(priority ?? "").toLowerCase();

    let accent = "system_gray";
    let dangerLevel = "normal";

    if (m.includes("money") || pr.includes("income")) accent = "money_green";
    if (m.includes("exp") || pr.includes("level")) accent = "exp_blue";
    if (p.includes("faction")) accent = "faction_cyan";
    if (p.includes("singularity") || bitNodeNumber === 4 || capabilities.singularity) accent = "singularity_purple";
    if (p.includes("reset")) {
        accent = "danger_red";
        dangerLevel = "high";
    }

    return {
        base: "dark_tactical",
        accent,
        dangerLevel,
    };
}

function normalizeCapabilities(caps) {
    return {
        singularity: bool(caps?.singularity),
        stocks: bool(caps?.stocks ?? caps?.stock),
        gangs: bool(caps?.gangs ?? caps?.gang),
        corporation: bool(caps?.corporation ?? caps?.corporations ?? caps?.corp),
        bladeburner: bool(caps?.bladeburner),
        sleeves: bool(caps?.sleeves),
        hacknet: bool(caps?.hacknet ?? true),
        stanek: bool(caps?.stanek),
    };
}

function normalizePhaseFromMode(mode) {
    const m = String(mode ?? "").toLowerCase();

    if (m.includes("exp")) return "level-hacking";
    if (m.includes("money")) return "income";
    if (m.includes("faction")) return "faction";
    if (m.includes("reset")) return "reset-prep";

    return "UNKNOWN";
}

function getPosture(phase, priority) {
    const p = String(phase ?? "").toLowerCase();
    const pr = String(priority ?? "").toLowerCase();

    if (p.includes("reset")) return "RESET_IMMINENT";
    if (p.includes("faction")) return "FACTION_ACCELERATION";
    if (p.includes("singularity")) return "SINGULARITY_PREP";
    if (pr.includes("level")) return "HACKING_GROWTH";
    if (pr.includes("income")) return "AGGRESSIVE_INCOME";

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

function bool(value) {
    return value === true;
}

function unique(arr) {
    return [...new Set(arr)];
}

function readJson(ns, file, fallback = {}) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;

        const raw = ns.read(file);
        if (!raw || !raw.trim()) return fallback;

        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}