//lib/uhm/dashboard.js
import {
    isUsableTarget,
    safeGetServerMoneyAvailable,
    safeGetServerMaxMoney,
    safeGetServerSecurityLevel,
    safeGetServerMinSecurityLevel,
} from "/lib/uhm/safe.js";

export function printMultiTargetStatus(
    ns,
    lanes,
    results,
    daemonState,
    laneSnapshots = [],
    runtimeStats = {},
) {
    const c = colors();
    const allSnapshotHosts = laneSnapshots.flatMap(x => x.hosts ?? []);
    const totalRam = getLaneRamStats(allSnapshotHosts);

    ns.print(`${c.cyan}UHM${c.reset}`);
    printTopLine(ns, c, daemonState, runtimeStats, totalRam);
    printPhaseLine(ns, c, runtimeStats);
    ns.print("");

    printLaneSummary(ns, c, laneSnapshots);
    ns.print("");

    printActiveResults(ns, c, results, laneSnapshots);
    ns.print("");

    printRuntimeLine(ns, c, runtimeStats);
}

function printLaneSummary(ns, c, laneSnapshots) {
    ns.print(`${c.cyan}LANES${c.reset}`);

    if (!laneSnapshots?.length) {
        ns.print("  none");
        return;
    }

    const totalMaxRam = laneSnapshots
        .map(lane => lane.ram ?? getLaneRamStats(lane.hosts ?? []))
        .reduce((sum, ram) => sum + (ram.maxRam ?? 0), 0);

    for (const lane of laneSnapshots) {
        const ram = lane.ram ?? getLaneRamStats(lane.hosts ?? []);
        const allocationPercent =
            totalMaxRam > 0 ? ram.maxRam / totalMaxRam : 0;

        ns.print(
            `  ${compactLaneName(lane.name).padEnd(10)} ` +
            `${String(lane.mode ?? "-").padEnd(6)} ` +
            `${String(lane.target ?? "-").padEnd(18)} ` +
            `${formatTargetSource(lane).padEnd(10)} ` +
            `hosts ${ram.hostCount} | ` +
            `alloc ${pct(allocationPercent)} | ` +
            `free ${ns.format.ram(ram.freeRam)}/${ns.format.ram(ram.maxRam)}`
        );
    }
}

function printActiveResults(ns, c, results, laneSnapshots) {
    ns.print(`${c.cyan}ACTIVE${c.reset}`);

    if (!results?.length) {
        ns.print("  none");
        return;
    }

    for (const result of results) {
        if (!isUsableTarget(ns, result.target)) continue;

        const lane = laneSnapshots.find(x => x.name === result.lane);
        const laneRam = lane?.ram ?? getLaneRamStats(lane?.hosts ?? []);

        const target = result.target;
        const money = safeGetServerMoneyAvailable(ns, target);
        const maxMoney = safeGetServerMaxMoney(ns, target);
        const moneyPercent = maxMoney > 0 ? money / maxMoney : 0;

        const sec = safeGetServerSecurityLevel(ns, target);
        const minSec = safeGetServerMinSecurityLevel(ns, target);
        const secDiff = sec - minSec;

        const statusColor = result.status === "RUNNING" ? c.green : c.yellow;
        const plan = result.plan ?? {};
        const weakenThreads =
            (plan.weakenHackThreads ?? 0) +
            (plan.weakenGrowThreads ?? 0);

        ns.print(
            `  ${compactLaneName(result.lane).padEnd(10)} ` +
            `${String(result.mode).padEnd(6)} ` +
            `${c.yellow}${target}${c.reset} ` +
            `${formatTargetSource(result)} ` +
            `${statusColor}${result.status}${c.reset}`
        );

        ns.print(
            `    money ${pct(moneyPercent)} | ` +
            `sec +${secDiff.toFixed(2)} | ` +
            `batch ${ns.format.ram(plan.totalRam ?? 0)} | ` +
            `math ${plan.mathSource ?? "?"} | ` +
            `threads H${plan.hackThreads ?? 0} G${plan.growThreads ?? 0} W${weakenThreads} | ` +
            `ram ${ns.format.ram(laneRam.freeRam)}/${ns.format.ram(laneRam.maxRam)}`
        );
    }
}

function printRuntimeLine(ns, c, runtimeStats) {
    ns.print(`${c.cyan}RUNTIME${c.reset}`);

    ns.print(
        `  batches ${runtimeStats.batchesLaunched ?? 0} | ` +
        `failed ${runtimeStats.failedLaunches ?? 0} | ` +
        `prep ${runtimeStats.prepRuns ?? 0} | ` +
        `scans ${runtimeStats.scanRuns ?? 0} | ` +
        `copies ${runtimeStats.copiedServers ?? 0}`
    );

    ns.print(
        `  threads H${runtimeStats.hackThreads ?? 0} ` +
        `G${runtimeStats.growThreads ?? 0} ` +
        `W${runtimeStats.weakenThreads ?? 0}`
    );

    if (runtimeStats.expOverdrive?.active) {
        ns.print(
            `  EXP ${runtimeStats.expOverdrive.target} | ` +
            `${runtimeStats.expOverdrive.purpose ?? "background"} | ` +
            `${runtimeStats.expOverdrive.status} | ` +
            `workers ${runtimeStats.expOverdrive.activeProcesses}/` +
            `${runtimeStats.expOverdrive.maxProcesses} | ` +
            `threads ${runtimeStats.expOverdrive.totalThreads ?? runtimeStats.expOverdrive.threads ?? 0} | ` +
            `grow ${(runtimeStats.expOverdrive.growRatio * 100).toFixed(0)}%`
        );
    }

    if ((runtimeStats.protoMoneyThreads ?? 0) > 0) {
        ns.print(`  proto-money threads ${runtimeStats.protoMoneyThreads}`);
    }
}

function progressBar(percent, width) {
    return pct(percent);
}

function printTopLine(ns, c, daemonState, runtimeStats, totalRam) {
    const mode = daemonState?.mode ?? "unknown";
    const priority = daemonState?.spendingPolicy?.priority ?? "unknown";

    ns.print(
        `${c.cyan}║${c.reset} ` +
        `Mode ${c.yellow}${mode}${c.reset} | ` +
        `Pri ${c.yellow}${priority}${c.reset} | ` +
        `Hosts ${c.green}${totalRam.hostCount}${c.reset} | ` +
        `RAM ${c.green}${ns.format.ram(totalRam.freeRam)}${c.reset}/` +
        `${c.yellow}${ns.format.ram(totalRam.maxRam)}${c.reset} ` +
        `${progressBar(totalRam.usedPercent, 12)}`
    );
}

function printPhaseLine(ns, c, runtimeStats) {
    const phase = runtimeStats.phase;
    const share = runtimeStats.share;

    if (!phase) return;

    const shareText = share
        ? `${share.active ? "ON" : "OFF"} ${share.threads ?? 0}t ${(share.bonus ?? 1).toFixed(3)}x`
        : "-";

    ns.print(
        `${c.cyan}║${c.reset} ` +
        `Phase ${c.green}${phase.name}${c.reset} | ` +
        `RAM M${pct(phase.moneyRamRatio)} S${pct(phase.shareRamRatio)} E${pct(phase.expRamRatio)} | ` +
        `Share ${c.yellow}${shareText}${c.reset}`
    );
}

export function getLaneRamStats(hosts) {
    const maxRam = hosts.reduce((sum, x) => sum + (x.maxRam ?? 0), 0);
    const usedRam = hosts.reduce((sum, x) => sum + (x.usedRam ?? 0), 0);
    const freeRam = hosts.reduce((sum, x) => sum + (x.freeRam ?? 0), 0);
    const usedPercent = maxRam > 0 ? usedRam / maxRam : 0;

    return {
        hostCount: hosts.length,
        maxRam,
        usedRam,
        freeRam,
        usedPercent,
    };
}

function compactLaneName(name) {
    if (!name) return "-";
    return String(name)
        .replace("LANE-", "")
        .replace("LANE_", "")
        .replace("HIGH", "HI")
        .replace("MID", "MD")
        .replace("LOW", "LO")
        .slice(0, 10);
}

function pct(value) {
    return `${((value ?? 0) * 100).toFixed(0)}%`;
}

function formatTargetSource(item) {
    const source = item?.targetSource ?? "";
    if (source === "affordable-fallback") return "fallback";
    if (source === "daemon") return "daemon";
    if (source === "selected") return "selected";
    return "-";
}

function colors() {
    return {
        reset: "\u001b[0m",
        cyan: "\u001b[36m",
        green: "\u001b[32m",
        yellow: "\u001b[33m",
        red: "\u001b[31m",
        white: "\u001b[37m",
        gray: "\u001b[90m",
    };
}

