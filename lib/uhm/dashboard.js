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

    ns.print(`${c.cyan}╔═ UHM ═══════════════════════════════════════════════════════════════╗${c.reset}`);

    printTopLine(ns, c, daemonState, runtimeStats, totalRam);
    printPhaseLine(ns, c, runtimeStats);
    printLaneSummary(ns, c, laneSnapshots);
    printActiveResults(ns, c, results, laneSnapshots);
    printRuntimeLine(ns, c, runtimeStats);

    ns.print(`${c.cyan}╚══════════════════════════════════════════════════════════════════════╝${c.reset}`);
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

function printLaneSummary(ns, c, laneSnapshots) {
    if (!laneSnapshots?.length) {
        ns.print(`${c.cyan}║${c.reset} Lanes none`);
        return;
    }

    const lines = laneSnapshots.map(lane => {
        const ram = lane.ram ?? getLaneRamStats(lane.hosts ?? []);
        const mode = lane.mode ?? "-";
        const target = lane.target ?? "-";
        const name = compactLaneName(lane.name);

        return (
            `${name} ${mode}:${target} ` +
            `H${ram.hostCount} ` +
            `${ns.format.ram(ram.freeRam)}/${ns.format.ram(ram.maxRam)} ` +
            `${progressBar(ram.usedPercent, 8)}`
        );
    });

    ns.print(`${c.cyan}╠═ Lanes ═════════════════════════════════════════════════════════════╣${c.reset}`);

    for (const line of lines) {
        ns.print(`${c.cyan}║${c.reset} ${line}`);
    }
}

function printActiveResults(ns, c, results, laneSnapshots) {
    ns.print(`${c.cyan}╠═ Active ════════════════════════════════════════════════════════════╣${c.reset}`);

    if (!results?.length) {
        ns.print(`${c.cyan}║${c.reset} No active lane results.`);
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

        ns.print(
            `${c.cyan}║${c.reset} ` +
            `${c.green}${compactLaneName(result.lane)}${c.reset} ` +
            `${c.yellow}${target}${c.reset} ` +
            `${result.mode} ` +
            `${statusColor}${result.status}${c.reset} | ` +
            `B${result.launched} H${laneRam.hostCount} ` +
            `RAM ${ns.format.ram(laneRam.freeRam)}/${ns.format.ram(laneRam.maxRam)}`
        );

        ns.print(
            `${c.cyan}║${c.reset}   ` +
            `$${progressBar(moneyPercent, 10)} ` +
            `Sec +${secDiff.toFixed(2)} ` +
            `Batch ${ns.format.ram(plan.totalRam ?? 0)} ` +
            `T H${plan.hackThreads ?? 0}/G${plan.growThreads ?? 0}/W${(plan.weakenHackThreads ?? 0) + (plan.weakenGrowThreads ?? 0)}`
        );
    }
}

function printRuntimeLine(ns, c, runtimeStats) {
    ns.print(`${c.cyan}╠═ Runtime ═══════════════════════════════════════════════════════════╣${c.reset}`);

    ns.print(
        `${c.cyan}║${c.reset} ` +
        `Batches ${runtimeStats.batchesLaunched ?? 0} | ` +
        `Failed ${runtimeStats.failedLaunches ?? 0} | ` +
        `Prep ${runtimeStats.prepRuns ?? 0} | ` +
        `Scans ${runtimeStats.scanRuns ?? 0} | ` +
        `Copies ${runtimeStats.copiedServers ?? 0}`
    );

    ns.print(
        `${c.cyan}║${c.reset} ` +
        `Threads H${runtimeStats.hackThreads ?? 0} ` +
        `G${runtimeStats.growThreads ?? 0} ` +
        `W${runtimeStats.weakenThreads ?? 0}`
    );

    if (runtimeStats.expOverdrive?.active) {
        ns.print(
            `${c.cyan}║${c.reset} ` +
            `EXP ${c.yellow}${runtimeStats.expOverdrive.target}${c.reset} | ` +
            `${runtimeStats.expOverdrive.status} | ` +
            `Workers ${runtimeStats.expOverdrive.activeProcesses}/` +
            `${runtimeStats.expOverdrive.maxProcesses} | ` +
            `Threads ${runtimeStats.expOverdrive.threads} | ` +
            `Grow ${(runtimeStats.expOverdrive.growRatio * 100).toFixed(0)}%`
        );
    }

    if ((runtimeStats.protoMoneyThreads ?? 0) > 0) {
        ns.print(
            `${c.cyan}║${c.reset} ` +
            `Proto-money threads ${runtimeStats.protoMoneyThreads}`
        );
    }
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

function progressBar(percent, width) {
    const safePercent = Math.max(0, Math.min(1, percent ?? 0));
    const filled = Math.round(safePercent * width);
    const empty = width - filled;

    return `[${"█".repeat(filled)}${"░".repeat(empty)}]${(safePercent * 100).toFixed(0)}%`;
}