import {
    buildProcessCache,
    getPidFromCache,
    getScriptKey,
} from "/lib/daemon/safe.js";

export function drawDashboard(ns, scripts, startedOnce, completedOnce, state, overrides) {
    const c = colors();
    ns.clearLog();

    const processCache = buildProcessCache(ns, scripts);
    const scriptSummary = getScriptSummary(ns, scripts, startedOnce, completedOnce, state, processCache);
    const stats = state.targetStats ?? {};
    const multi = state.multiTargetPolicy ?? {};
    const bitNode = state.bitNodePlan?.bitNode ?? "?";
    const roadmap = state.bitNodePlan?.roadmap ?? "unknown";
    const reason = shorten(state.controller?.reason ?? "none", 105);

    ns.print(`${c.cyan}Ultimate Daemon v4${c.reset} ${c.gray}|${c.reset} ${c.magenta}${state.phase ?? "Unknown"}${c.reset} ${c.gray}|${c.reset} ${c.yellow}BN${bitNode}:${roadmap}${c.reset}`);
    ns.print(
        `${badge(c, "MODE", upper(state.mode), getModeColor(c, state.mode))} ` +
        `${badge(c, "PRIORITY", state.spendingPolicy?.priority ?? "unknown", getPriorityColor(c, state.spendingPolicy?.priority))} ` +
        `${badge(c, "TARGET", state.target ?? "none", c.yellow)} ` +
        `${badge(c, "ROOTED", state.servers?.rootedCount ?? 0, c.cyan)}`
    );

    const overrideText = getOverrideText(overrides);
    if (overrideText !== "NONE") {
        ns.print(`${c.magenta}Override:${c.reset} ${overrideText}`);
    }

    ns.print(`${c.gray}${reason}${c.reset}`);
    ns.print("");

    ns.print(
        `${section(c, "PLAYER")} ` +
        `${badge(c, "$", "$" + ns.format.number(state.player?.money ?? 0), c.green)} ` +
        `${badge(c, "HACK", state.player?.hacking ?? 0, c.yellow)} ` +
        `${badge(c, "SING", yesNo(state.capabilities?.singularity), state.capabilities?.singularity ? c.green : c.red)}`
    );
    printSessionStats(ns, c, state.sessionStats);
    if (state.targetStats) {
        ns.print(
            `${section(c, "TARGET")} ` +
            `${badge(c, "MONEY", percentText(stats.moneyPercent), stats.moneyPercent >= 0.75 ? c.green : c.yellow)} ` +
            `${badge(c, "SEC+", Number(stats.securityDiff ?? 0).toFixed(2), stats.securityDiff <= 5 ? c.green : c.red)} ` +
            `${badge(c, "PREP", Number(stats.prepNeed ?? 0).toFixed(2), stats.prepNeed <= 0.85 ? c.green : c.red)} ` +
            `${badge(c, "WEAKEN", ns.format.time(stats.weakenTime ?? 0), c.cyan)}`
        );
    }
    printTargetStability(ns, c, state);
    printBnCompact(ns, c, state);
    printPolicyCompact(ns, c, state);
    printLaneBars(ns, c, multi);

    ns.print(
        `${section(c, "TEL")} ` +
        `${badge(c, "ACTIVE", "YES", c.green)} ` +
        `${c.gray}/data/history/events.txt${c.reset}`
    );

    ns.print(
        `${section(c, "SCRIPTS")} ` +
        `${statusChip(c, "LIVE", scriptSummary.live, c.green)} ` +
        `${statusChip(c, "ONCE", scriptSummary.once, c.yellow)} ` +
        `${statusChip(c, "DONE", scriptSummary.done, c.cyan)} ` +
        `${statusChip(c, "LOCKED", scriptSummary.locked, c.red)} ` +
        `${statusChip(c, "READY", scriptSummary.ready, c.gray)} ` +
        `${badge(c, "RAM", ns.format.ram(scriptSummary.totalRamUsed), c.yellow)}`
    );

    for (const line of getImportantScriptLines(ns, scripts, startedOnce, completedOnce, state, c, processCache)) {
        ns.print(line);
    }
}
function printTargetStability(ns, c, state) {
    if (!state.targetSince && !state.targetStability) return;

    const heldMs = state.targetSince ? Date.now() - state.targetSince : 0;
    const stability = state.targetStability;

    if (stability?.blocked) {
        ns.print(
            `${section(c, "STABLE")} ` +
            `${badge(c, "HELD", formatDuration(heldMs), c.cyan)} ` +
            `${badge(c, "BLOCKED", stability.attemptedTarget ?? "unknown", c.red)}`
        );
        return;
    }

    ns.print(
        `${section(c, "STABLE")} ` +
        `${badge(c, "HELD", formatDuration(heldMs), c.cyan)}`
    );
}
function printSessionStats(ns, c, stats) {
    if (!stats) return;

    ns.print(
        `${section(c, "SESSION")} ` +
        `${badge(c, "UPTIME", formatDuration(stats.uptimeMs), c.cyan)} ` +
        `${badge(c, "$GAIN", "$" + ns.format.number(stats.moneyGain), c.green)} ` +
        `${badge(c, "HACK+", stats.hackingGain, c.yellow)}`
    );

    ns.print(
        `         ` +
        `${badge(c, "MODE", formatDuration(stats.lastModeChangeMs), c.magenta)} ` +
        `${badge(c, "TARGET", formatDuration(stats.lastTargetChangeMs), c.cyan)}`
    );
}

function printBnCompact(ns, c, state) {
    const readiness = state.bn4Readiness;
    const plan = state.bn4VictoryPlan;
    const currentBn = state.bitNodePlan?.bitNode ?? 1;
    const hasSingularity = !!state.capabilities?.singularity;

    if (!readiness && !plan) return;

    if (currentBn === 4 || hasSingularity) {
        ns.print(
            `${section(c, "SING")} ` +
            `${badge(c, "STAGE", plan?.stage ?? "unknown", c.magenta)} ` +
            `${badge(c, "DAEDALUS", yesNo(plan?.hasDaedalus), plan?.hasDaedalus ? c.green : c.red)} ` +
            `${badge(c, "RED PILL", yesNo(plan?.hasRedPill), plan?.hasRedPill ? c.green : c.red)} ` +
            `${badge(c, "WORLD", yesNo(plan?.canUseWorldDaemon), plan?.canUseWorldDaemon ? c.green : c.red)}`
        );

        if (plan?.nextAction) {
            ns.print(`${c.gray}${shorten(plan.nextAction, 110)}${c.reset}`);
        }

        return;
    }

    ns.print(
        `${section(c, "BN4 PREP")} ` +
        `${badge(c, "CHECKS", `${readiness?.readyCount ?? 0}/${readiness?.totalChecks ?? 4}`, readiness?.ready ? c.green : c.yellow)} ` +
        `${badge(c, "HACK", `${readiness?.hacking ?? "?"}/${readiness?.hackingTarget ?? "?"}`, readiness?.hackingReady ? c.green : c.red)} ` +
        `${badge(c, "MONEY", yesNo(readiness?.moneyReady), readiness?.moneyReady ? c.green : c.red)} ` +
        `${badge(c, "RAM", yesNo(readiness?.homeRamReady), readiness?.homeRamReady ? c.green : c.red)} ` +
        `${badge(c, "AUGS", "PRE-SF4", c.gray)}`
    );
}

function printPolicyCompact(ns, c, state) {
    const p = state.spendingPolicy ?? {};

    ns.print(
        `${section(c, "POLICY")} ` +
        `${flag(c, "EXE", p.allowExePurchases)} ` +
        `${flag(c, "SERV", p.allowServerPurchases)} ` +
        `${flag(c, "STOCK", p.allowStockTrading)} ` +
        `${flag(c, "HACKNET", p.allowHacknet)} ` +
        `${flag(c, "HOME", p.allowHomeRam)} ` +
        `${flag(c, "AUG", p.allowAugmentPurchases)} ` +
        `${badge(c, "RESERVE", "$" + ns.format.number(state.reserveMoney ?? 0), c.yellow)}`
    );
}

function printLaneBars(ns, c, multi) {
    const primary = multi.primaryMoneyRamPercent ?? 0;
    const secondary = multi.secondaryMoneyRamPercent ?? 0;
    const exp = multi.expRamPercent ?? 0;

    ns.print(
        `${section(c, "LANES")} ` +
        `${laneBar(c, "M1", primary, c.green)} ` +
        `${laneBar(c, "M2", secondary, c.yellow)} ` +
        `${laneBar(c, "XP", exp, c.cyan)}`
    );

    if (multi.reason) {
        ns.print(`${c.gray}${shorten(multi.reason, 110)}${c.reset}`);
    }
}

function getScriptSummary(ns, scripts, startedOnce, completedOnce, state, processCache) {
    const summary = {
        live: 0,
        once: 0,
        done: 0,
        locked: 0,
        ready: 0,
        totalRamUsed: 0,
    };

    for (const script of scripts) {
        const status = getScriptStatus(ns, script, startedOnce, completedOnce, state, processCache);
        summary[status.kind]++;

        if (status.running) {
            summary.totalRamUsed += ns.getScriptRam(script.name, script.host ?? "home") * (script.threads ?? 1);
        }
    }

    return summary;
}

function getImportantScriptLines(ns, scripts, startedOnce, completedOnce, state, c, processCache) {
    const lines = [];

    for (const script of scripts) {
        const status = getScriptStatus(ns, script, startedOnce, completedOnce, state, processCache);

        if (!shouldShowScript(status)) continue;

        lines.push(
            `  ${status.dot} ${c.gray}${padRight(status.label, 6)}${c.reset} ${c.white}${shorten(script.name, 74)}${c.reset}`
        );
    }

    if (lines.length === 0) {
        lines.push(`  ${c.gray}No important script state changes.${c.reset}`);
    }

    return lines.slice(0, 8);
}

function shouldShowScript(status) {
    return (
        status.kind === "live" ||
        status.kind === "locked" ||
        status.kind === "done"
    );
}

function getScriptStatus(ns, script, startedOnce, completedOnce, state, processCache) {
    const host = script.host ?? "home";
    const pid = getPidFromCache(processCache, { ...script, host });
    const running = pid !== 0;
    const locked = script.requiresSingularity && !state.capabilities?.singularity;
    const completed = completedOnce.has(getScriptKey({ ...script, host }));
    const started = startedOnce.has(getScriptKey({ ...script, host }));

    if (locked) {
        return {
            kind: "locked",
            label: "LOCK",
            running,
            dot: `${colors().red}●${colors().reset}`,
        };
    }

    if (running) {
        return {
            kind: "live",
            label: script.keepAlive ? "LIVE" : "RUN",
            running,
            dot: `${colors().green}●${colors().reset}`,
        };
    }

    if (completed) {
        return {
            kind: "done",
            label: "DONE",
            running,
            dot: `${colors().cyan}●${colors().reset}`,
        };
    }

    if (started) {
        return {
            kind: "once",
            label: "ONCE",
            running,
            dot: `${colors().yellow}●${colors().reset}`,
        };
    }

    return {
        kind: "ready",
        label: "READY",
        running,
        dot: `${colors().gray}○${colors().reset}`,
    };
}

function getOverrideText(overrides) {
    return [
        overrides.mode ? `MODE=${overrides.mode}` : null,
        overrides.priority ? `PRIORITY=${overrides.priority}` : null,
        overrides.target ? `TARGET=${overrides.target}` : null,
    ].filter(Boolean).join(" | ") || "NONE";
}

function section(c, label) {
    return `${c.cyan}${label}:${c.reset}`;
}

function badge(c, label, value, color) {
    return `${c.gray}[${c.reset}${color}${label}:${value}${c.reset}${c.gray}]${c.reset}`;
}

function flag(c, label, value) {
    return `${label}${value ? c.green + "✓" : c.red + "✗"}${c.reset}`;
}

function statusChip(c, label, value, color) {
    return `${color}${label}:${value}${c.reset}`;
}

function laneBar(c, label, value, color) {
    const percent = Number.isFinite(Number(value)) ? Number(value) : 0;
    const filled = Math.max(0, Math.min(10, Math.round(percent * 10)));
    const empty = 10 - filled;

    return `${color}${label}${c.reset} ${color}${"█".repeat(filled)}${c.gray}${"░".repeat(empty)}${c.reset} ${percentText(percent)}`;
}

function getModeColor(c, mode) {
    if (mode === "money") return c.green;
    if (mode === "exp") return c.cyan;
    if (mode === "prep") return c.yellow;
    if (mode === "faction") return c.magenta;
    if (mode === "reset-prep") return c.red;
    return c.white;
}

function getPriorityColor(c, priority) {
    if (priority === "income") return c.green;
    if (priority === "leveling") return c.cyan;
    if (priority === "upgrades") return c.yellow;
    if (priority === "faction") return c.magenta;
    if (priority === "reset-prep") return c.red;
    return c.white;
}

function percentText(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0%";
    return (n * 100).toFixed(0) + "%";
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
        magenta: "\u001b[35m",
    };
}

function yesNo(value) {
    return value ? "YES" : "NO";
}

function upper(value) {
    return String(value ?? "").toUpperCase();
}

function padRight(value, length) {
    return String(value).padEnd(length, " ");
}

function shorten(value, maxLength) {
    const text = String(value ?? "");
    if (text.length <= maxLength) return text;
    if (maxLength <= 3) return text.slice(0, maxLength);
    return text.slice(0, maxLength - 3) + "...";
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0"),
    ].join(":");
}