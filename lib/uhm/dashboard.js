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

    ns.print(`${c.cyan}╔════════════════════════════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} ${c.white}HWGW Multi-Target Batch Manager${c.reset}                                                        ${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Daemon Mode : ${c.yellow}${padRight(daemonState?.mode ?? "unknown", 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Priority    : ${c.yellow}${padRight(daemonState?.spendingPolicy?.priority ?? "unknown", 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Policy      : ${c.gray}${padRight(daemonState?.multiTargetPolicy?.reason ?? "No daemon policy reason.", 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Total Hosts : ${c.green}${padRight(totalRam.hostCount, 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Total RAM   : ${c.green}${padRight(`${ns.format.ram(totalRam.freeRam)} free / ${ns.format.ram(totalRam.maxRam)} max`, 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} RAM Usage   : ${c.yellow}${padRight(progressBar(totalRam.usedPercent, 30), 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);

    printAccordionSection(ns, "Lane Allocation", true, laneSnapshots.map(lane => {
        const laneRam = lane.ram ?? getLaneRamStats(lane.hosts ?? []);

        const targetText = lane.target ? lane.target : "-";
        const modeText = lane.mode ? lane.mode : "-";

        const laneColor =
            lane.name.includes("HIGH") ? c.green :
                lane.name.includes("MID") ? c.yellow :
                    lane.name.includes("LOW") ? c.cyan :
                        c.white;

        const targetColor = lane.target ? c.yellow : c.gray;

        const modeColor =
            lane.mode === "money" ? c.green :
                lane.mode === "exp" ? c.cyan :
                    lane.mode === "prep" ? c.yellow :
                        c.gray;

        const ramColor =
            laneRam.usedPercent < 0.75 ? c.green :
                laneRam.usedPercent < 0.92 ? c.yellow :
                    c.red;

        return (
            `${laneColor}${padRight(lane.name, 18)}${c.reset} ` +
            `Mode: ${modeColor}${padRight(modeText, 7)}${c.reset} ` +
            `Target: ${targetColor}${padRight(targetText, 20)}${c.reset} ` +
            `Hosts: ${padLeft(laneRam.hostCount, 3)} ` +
            `Free: ${c.green}${padLeft(ns.format.ram(laneRam.freeRam), 10)}${c.reset} ` +
            `Max: ${c.yellow}${padLeft(ns.format.ram(laneRam.maxRam), 10)}${c.reset} ` +
            `${ramColor}${progressBar(laneRam.usedPercent, 18)}${c.reset}`
        );
    }), c.cyan);

    const resultLines = [];

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

        resultLines.push(
            `${c.green}${padRight(result.lane, 16)}${c.reset} ` +
            `${c.yellow}${padRight(result.target, 18)}${c.reset} ` +
            `${padRight(result.mode, 6)} ` +
            `${statusColor}${padRight(result.status, 9)}${c.reset} ` +
            `B:${padLeft(result.launched, 3)} ` +
            `H:${padLeft(laneRam.hostCount, 2)} ` +
            `RAM:${padLeft(ns.format.ram(laneRam.freeRam), 9)}/${padLeft(ns.format.ram(laneRam.maxRam), 9)}`
        );

        resultLines.push(
            `    Money ${progressBar(moneyPercent, 18)} ` +
            `Sec ${sec.toFixed(2)}/${minSec.toFixed(2)}(+${secDiff.toFixed(2)}) ` +
            `Batch ${ns.format.ram(result.plan.totalRam)}`
        );

        resultLines.push(
            `    Threads H:${result.plan.hackThreads} ` +
            `W1:${result.plan.weakenHackThreads} ` +
            `G:${result.plan.growThreads} ` +
            `W2:${result.plan.weakenGrowThreads} ` +
            `Hack:${(result.plan.hackPercent * 100).toFixed(1)}%`
        );

        resultLines.push("");
    }

    printAccordionSection(ns, "Active Lanes", true, resultLines, c.cyan);

    printAccordionSection(ns, "Runtime Stats", true, [
        `Batches launched total : ${runtimeStats.batchesLaunched}`,
        `Failed launch attempts : ${runtimeStats.failedLaunches}`,
        `Prep runs              : ${runtimeStats.prepRuns}`,
        `Scan runs              : ${runtimeStats.scanRuns}`,
        `Copied servers         : ${runtimeStats.copiedServers}`,
        `Hack threads total     : ${runtimeStats.hackThreads}`,
        `Grow threads total     : ${runtimeStats.growThreads}`,
        `Weaken threads total   : ${runtimeStats.weakenThreads}`,
    ], c.cyan);

    ns.print(`${c.cyan}╚════════════════════════════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
}

export function getLaneRamStats(hosts) {
    const maxRam = hosts.reduce((sum, x) => sum + x.maxRam, 0);
    const usedRam = hosts.reduce((sum, x) => sum + x.usedRam, 0);
    const freeRam = hosts.reduce((sum, x) => sum + x.freeRam, 0);
    const usedPercent = maxRam > 0 ? usedRam / maxRam : 0;

    return {
        hostCount: hosts.length,
        maxRam,
        usedRam,
        freeRam,
        usedPercent,
    };
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

function padRight(value, length) {
    return String(value).padEnd(length, " ");
}

function padLeft(value, length) {
    return String(value).padStart(length, " ");
}

function progressBar(percent, width) {
    const safePercent = Math.max(0, Math.min(1, percent));
    const filled = Math.round(safePercent * width);
    const empty = width - filled;

    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${(safePercent * 100).toFixed(1)}%`;
}

function printAccordionSection(ns, title, isOpen, lines, color = "\u001b[36m") {
    const reset = "\u001b[0m";
    const icon = isOpen ? "[-]" : "[+]";

    ns.print(`${color}${icon} ${title}${reset}`);

    if (!isOpen) return;

    for (const line of lines) {
        ns.print(`    ${line}`);
    }
}

