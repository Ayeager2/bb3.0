import {
    buildProcessCache,
    getPidFromCache,
    getScriptKey,
} from "/lib/daemon/safe.js";

export function drawDashboard(ns, scripts, startedOnce, completedOnce, state, overrides) {
    const c = colors();
    ns.clearLog();

    let totalIncome = 0;
    let totalRamUsed = 0;

    const modeColor = getModeColor(c, state.mode);
    const priorityColor = getPriorityColor(c, state.spendingPolicy?.priority);

    ns.print(`${c.cyan}╔════════════════════════════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} ${c.white}Ultimate Daemon Dashboard - Central AI Controller v4${c.reset}                                      ${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Mode       : ${modeColor}${padRight(state.mode, 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Priority   : ${priorityColor}${padRight(state.spendingPolicy?.priority ?? "unknown", 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Target     : ${c.yellow}${padRight(state.target ?? "none", 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} BitNode    : ${c.magenta}${padRight(
        `BN${state.bitNodePlan?.bitNode ?? "?"} / ${state.bitNodePlan?.roadmap ?? "unknown"}`,
        78
    )}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} Override   : ${c.magenta}${padRight(
        [
            overrides.mode ? `MODE=${overrides.mode}` : null,
            overrides.priority ? `PRIORITY=${overrides.priority}` : null,
            overrides.target ? `TARGET=${overrides.target}` : null,
        ].filter(Boolean).join(" | ") || "NONE",
        78
    )}${c.reset}${c.cyan}║${c.reset}`);

    ns.print(`${c.cyan}║${c.reset} Reason     : ${c.gray}${padRight(shorten(state.controller?.reason ?? "none", 78), 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);

    const stats = state.targetStats;

    if (stats) {
        printAccordionSection(ns, "Target Quality", true, [
            `${badge(c, "MONEY", "$" + ns.format.number(stats.money) + " / $" + ns.format.number(stats.maxMoney), c.green)} ` +
            `${badge(c, "MONEY%", (stats.moneyPercent * 100).toFixed(1) + "%", stats.moneyPercent > 0.75 ? c.green : c.yellow)}`,
            `${badge(c, "SEC", stats.security.toFixed(2), c.yellow)} ` +
            `${badge(c, "MIN", stats.minSecurity.toFixed(2), c.green)} ` +
            `${badge(c, "DIFF", "+" + stats.securityDiff.toFixed(2), stats.securityDiff <= 5 ? c.green : c.red)}`,
            `${badge(c, "PREP NEED", stats.prepNeed.toFixed(2), stats.prepNeed <= 0.85 ? c.green : c.red)} ` +
            `${badge(c, "WEAKEN", ns.format.time(stats.weakenTime), c.cyan)}`,
        ], c.cyan);
    }

    printAccordionSection(ns, "Player", true, [
        `${badge(c, "MONEY", "$" + ns.format.number(state.player.money), c.green)} ` +
        `${badge(c, "HACKING", state.player.hacking, c.yellow)} ` +
        `${badge(c, "ROOTED", state.servers.rootedCount, c.cyan)}`,
        `${badge(c, "RESERVE", "$" + ns.format.number(state.reserveMoney), c.yellow)} ` +
        `${badge(c, "SINGULARITY", state.goals.singularity ? "YES" : "NO", state.goals.singularity ? c.green : c.red)}`,
    ], c.cyan);

    printBn4ReadinessPanel(ns, c, state.bn4Readiness);
    printBn4VictoryPanel(ns, c, state.bn4VictoryPlan);

    printAccordionSection(ns, "Spending Policy", true, [
        `${badge(c, "BUY SERVERS", yesNo(state.spendingPolicy.allowServerPurchases), state.spendingPolicy.allowServerPurchases ? c.green : c.red)} ` +
        `${badge(c, "STOCKS", yesNo(state.spendingPolicy.allowStockTrading), state.spendingPolicy.allowStockTrading ? c.green : c.red)} ` +
        `${badge(c, "HACKNET", yesNo(state.spendingPolicy.allowHacknet), state.spendingPolicy.allowHacknet ? c.green : c.red)}`,
        `${badge(c, "HOME RAM", yesNo(state.spendingPolicy.allowHomeRam), state.spendingPolicy.allowHomeRam ? c.green : c.red)} ` +
        `${badge(c, "EXES", yesNo(state.spendingPolicy.allowExePurchases), state.spendingPolicy.allowExePurchases ? c.green : c.red)} ` +
        `${badge(c, "AUGS", yesNo(state.spendingPolicy.allowAugmentPurchases), state.spendingPolicy.allowAugmentPurchases ? c.green : c.gray)}`,
    ], c.cyan);

    const multi = state.multiTargetPolicy ?? {};

    printAccordionSection(ns, "Multi-Target Policy", true, [
        `${badge(c, "ENABLED", yesNo(multi.enabled), multi.enabled ? c.green : c.red)} ` +
        `${badge(c, "PRIMARY", percentText(multi.primaryMoneyRamPercent), c.green)} ` +
        `${badge(c, "SECONDARY", percentText(multi.secondaryMoneyRamPercent), c.yellow)} ` +
        `${badge(c, "EXP", percentText(multi.expRamPercent), c.cyan)}`,
        `${c.gray}${multi.reason ?? "Static lane policy."}${c.reset}`,
    ], c.cyan);

    printAccordionSection(ns, "Telemetry", true, [
        `${badge(c, "STATUS", "ACTIVE", c.green)} ` +
        `${badge(c, "EVENTS", "/data/history/events.txt", c.cyan)}`,
        `${badge(c, "MODE LOG", "/data/history/mode-switches.txt", c.yellow)} ` +
        `${badge(c, "TARGET LOG", "/data/history/target-switches.txt", c.magenta ?? c.cyan)}`,
    ], c.cyan);
    const processCache = buildProcessCache(ns, scripts);

    const scriptStatusLines = getScriptStatusLines(
        ns,
        scripts,
        startedOnce,
        completedOnce,
        state,
        c,
        processCache,
        total => {
            totalIncome = total.income;
            totalRamUsed = total.ram;
        }
    );

    printAccordionSection(ns, "Script Status", true, scriptStatusLines, c.cyan);

    ns.print(`${c.cyan}╠════════════════════════════════════════════════════════════════════════════════════════════════════╣${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} TOTAL RAM  : ${c.yellow}${padRight(ns.format.ram(totalRamUsed), 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} TOTAL $/s  : ${c.green}${padRight("DISABLED", 78)}${c.reset}${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}╚════════════════════════════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
}

export function printBn4ReadinessPanel(ns, c, readiness) {
    if (!readiness) return;

    const readyColor = readiness.ready ? c.green : c.yellow;

    printAccordionSection(ns, "BN4 / Singularity Readiness", true, [
        `${badge(c, "GOAL", readiness.goal, c.cyan)} ${badge(c, "TARGET BN", readiness.targetBitNode, c.yellow)}`,
        `${badge(c, "READY", readiness.ready ? "YES" : "NO", readyColor)} ${badge(c, "CHECKS", `${readiness.readyCount}/${readiness.totalChecks}`, readyColor)}`,
        `${badge(c, "HACKING", `${readiness.hacking}/${readiness.hackingTarget}`, readiness.hackingReady ? c.green : c.red)}`,
        `${badge(c, "MONEY", "$" + ns.format.number(readiness.money) + " / $" + ns.format.number(readiness.moneyTarget), readiness.moneyReady ? c.green : c.red)}`,
        `${badge(c, "HOME RAM", ns.format.ram(readiness.homeRam) + " / " + ns.format.ram(readiness.homeRamTarget), readiness.homeRamReady ? c.green : c.red)}`,
        `${badge(c, "AUGS", `${readiness.augmentCount}/${readiness.augmentTarget}`, readiness.augReady ? c.green : c.red)}`,
    ], c.magenta ?? c.cyan);
}

export function printBn4VictoryPanel(ns, c, plan) {
    if (!plan) return;

    printAccordionSection(ns, "BN4 Victory Planner", true, [
        `${badge(c, "STAGE", plan.stage, c.magenta)} ${badge(c, "HACKING", `${plan.hacking}/${plan.hackingTarget}`, plan.hacking >= plan.hackingTarget ? c.green : c.yellow)}`,
        `${badge(c, "DAEDALUS", yesNo(plan.hasDaedalus), plan.hasDaedalus ? c.green : c.red)} ` +
        `${badge(c, "RED PILL", yesNo(plan.hasRedPill), plan.hasRedPill ? c.green : c.red)} ` +
        `${badge(c, "WORLD", yesNo(plan.canUseWorldDaemon), plan.canUseWorldDaemon ? c.green : c.red)}`,
        `${c.gray}${plan.nextAction}${c.reset}`,
    ], c.magenta);
}

export function getScriptStatusLines(ns, scripts, startedOnce, completedOnce, state, c, processCache, setTotals) {
    const lines = [];
    let totalIncome = 0;
    let totalRamUsed = 0;

    lines.push(`${c.gray}${padRight("Script", 30)} ${padRight("Host", 10)} ${padRight("Status", 14)} ${padRight("RAM", 12)} ${padRight("$/sec", 12)}${c.reset}`);

    for (const script of scripts) {
        const pid = getPidFromCache(processCache, script);
        const running = pid !== 0;
        const locked = script.requiresSingularity && !state.capabilities?.singularity;
        const completed = completedOnce.has(getScriptKey(script));
        const started = startedOnce.has(getScriptKey(script));

        const ramUsed = running
            ? ns.getScriptRam(script.name, script.host) * script.threads
            : 0;

        totalRamUsed += ramUsed;

        let status = "READY";
        let statusColor = c.gray;

        if (locked) {
            status = "LOCKED";
            statusColor = c.red;
        } else if (running && script.keepAlive) {
            status = `LIVE ${pid}`;
            statusColor = c.green;
        } else if (running) {
            status = `RUN ${pid}`;
            statusColor = c.green;
        } else if (completed) {
            status = "DONE";
            statusColor = c.cyan;
        } else if (started) {
            status = "RAN ONCE";
            statusColor = c.yellow;
        }

        lines.push(
            `${c.white}${padRight(shorten(script.name, 30), 30)}${c.reset} ` +
            `${c.gray}${padRight(script.host, 10)}${c.reset} ` +
            `${statusColor}${padRight(status, 14)}${c.reset} ` +
            `${c.yellow}${padRight(ns.format.ram(ramUsed), 12)}${c.reset} ` +
            `${c.green}${padRight("DISABLED", 12)}${c.reset}`
        );
    }

    setTotals({ income: totalIncome, ram: totalRamUsed });
    return lines;
}

export function printAccordionSection(ns, title, isOpen, lines, color = "\u001b[36m") {
    const reset = "\u001b[0m";
    const icon = isOpen ? "[-]" : "[+]";

    ns.print("");
    ns.print(`${color}${icon} ${title}${reset}`);

    if (!isOpen) return;

    for (const line of lines) {
        ns.print(`    ${line}`);
    }
}

export function badge(c, label, value, color) {
    return `${c.gray}[${c.reset}${color}${label}:${value}${c.reset}${c.gray}]${c.reset}`;
}

export function getModeColor(c, mode) {
    if (mode === "money") return c.green;
    if (mode === "exp") return c.cyan;
    if (mode === "prep") return c.yellow;
    if (mode === "faction") return c.magenta ?? c.yellow;
    if (mode === "reset-prep") return c.red;
    return c.white;
}

export function getPriorityColor(c, priority) {
    if (priority === "income") return c.green;
    if (priority === "leveling") return c.cyan;
    if (priority === "upgrades") return c.yellow;
    if (priority === "faction") return c.magenta ?? c.yellow;
    if (priority === "reset-prep") return c.red;
    return c.white;
}

export function percentText(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0%";
    return (n * 100).toFixed(0) + "%";
}

export function colors() {
    return {
        reset: "\u001b[0m",
        cyan: "\u001b[36m",
        green: "\u001b[32m",
        yellow: "\u001b[33m",
        red: "\u001b[31m",
        white: "\u001b[37m",
        gray: "\u001b[90m",
        magenta: "\u001b[35m",
    };
}

export function yesNo(value) {
    return value ? "YES" : "NO";
}

export function padRight(value, length) {
    return String(value).padEnd(length, " ");
}

export function shorten(value, maxLength) {
    const text = String(value ?? "");
    if (text.length <= maxLength) return text;
    if (maxLength <= 3) return text.slice(0, maxLength);
    return text.slice(0, maxLength - 3) + "...";
}