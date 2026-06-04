// /tools/dashboard-preview.js

const DASHBOARD_STATE_FILE = "/data/ui/dashboard-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 1000],
        ["tail", true],
    ]);

    if (flags.tail) ns.ui.openTail();

    const refreshMs = Number(flags.refresh) || 1000;

    while (true) {
        ns.clearLog();

        const state = readJson(ns, DASHBOARD_STATE_FILE, null);

        if (!state) {
            ns.print("No dashboard state found.");
            ns.print(`Expected: ${DASHBOARD_STATE_FILE}`);
            ns.print("");
            ns.print("Run:");
            ns.print("run /tools/dashboard-state-writer.js --tail");
            await ns.sleep(refreshMs);
            continue;
        }

        printDashboard(ns, state);

        await ns.sleep(refreshMs);
    }
}

function printDashboard(ns, state) {
    const c = colors();

    const phase = state?.progression?.phase ?? "UNKNOWN";
    const mode = state?.progression?.mode ?? "UNKNOWN";
    const priority = state?.progression?.priority ?? "UNKNOWN";
    const posture = state?.progression?.posture ?? "UNKNOWN";

    const target = state?.daemon?.target ?? "none";
    const status = state?.daemon?.status ?? "unknown";

    const bitnodeNumber = state?.bitnode?.number ?? "?";
    const bitnodeName = state?.bitnode?.name ?? "Unknown";
    const strategy = state?.bitnode?.strategy ?? "UNKNOWN";

    const accent = state?.theme?.accent ?? "system_gray";

    ns.print(`${c.purple}╔════════════════════════════════════════════════════╗${c.reset}`);
    ns.print(`${c.purple}║${c.reset} ${c.white}DAEMON UI PREVIEW${c.reset} ${c.gray}:: F12 Overlay State Prototype${c.reset}`);
    ns.print(`${c.purple}╚════════════════════════════════════════════════════╝${c.reset}`);

    ns.print("");
    ns.print(`${c.gray}BITNODE${c.reset}`);
    ns.print(`  ${c.cyan}BN${bitnodeNumber}${c.reset} ${bitnodeName}`);
    ns.print(`  Strategy: ${strategy}`);

    ns.print("");
    ns.print(`${c.gray}CORE STATE${c.reset}`);
    ns.print(`  Phase:    ${colorPhase(c, phase)}${phase}${c.reset}`);
    ns.print(`  Mode:     ${colorMode(c, mode)}${mode}${c.reset}`);
    ns.print(`  Priority: ${colorPriority(c, priority)}${priority}${c.reset}`);
    ns.print(`  Posture:  ${c.yellow}${posture}${c.reset}`);
    ns.print(`  Target:   ${c.green}${target}${c.reset}`);
    ns.print(`  Status:   ${status === "running" ? c.green : c.red}${status}${c.reset}`);

    ns.print("");
    ns.print(`${c.gray}THEME${c.reset}`);
    ns.print(`  Base:   ${state?.theme?.base ?? "unknown"}`);
    ns.print(`  Accent: ${colorAccent(c, accent)}${accent}${c.reset}`);
    ns.print(`  Danger: ${state?.theme?.dangerLevel ?? "normal"}`);

    printCapabilities(ns, state, c);
    printWidgets(ns, state, c);
    printSystems(ns, state, c);

    ns.print("");
    ns.print(`${c.gray}Updated:${c.reset} ${formatTimestamp(state?.updatedAt)}`);
}

function printCapabilities(ns, state, c) {
    const caps = state?.capabilities ?? {};

    ns.print("");
    ns.print(`${c.gray}CAPABILITIES${c.reset}`);

    const row1 = [
        cap(c, "SING", caps.singularity),
        cap(c, "STOCK", caps.stocks),
        cap(c, "GANG", caps.gangs),
        cap(c, "CORP", caps.corporation),
    ].join(" ");

    const row2 = [
        cap(c, "BLADE", caps.bladeburner),
        cap(c, "SLEEVE", caps.sleeves),
        cap(c, "HACKNET", caps.hacknet),
        cap(c, "STANEK", caps.stanek),
    ].join(" ");

    ns.print(`  ${row1}`);
    ns.print(`  ${row2}`);
}

function printWidgets(ns, state, c) {
    const visible = state?.widgets?.visible ?? [];
    const emphasized = new Set(state?.widgets?.emphasized ?? []);

    ns.print("");
    ns.print(`${c.gray}VISIBLE WIDGETS${c.reset}`);

    if (visible.length === 0) {
        ns.print(`  ${c.red}none${c.reset}`);
        return;
    }

    for (const widget of visible) {
        const marker = emphasized.has(widget) ? `${c.yellow}★${c.reset}` : `${c.gray}•${c.reset}`;
        ns.print(`  ${marker} ${widget}`);
    }
}

function printSystems(ns, state, c) {
    const systems = state?.systems ?? {};

    ns.print("");
    ns.print(`${c.gray}SYSTEM SUMMARIES${c.reset}`);

    const faction = systems?.factions ?? {};
    const aug = systems?.augmentations ?? {};
    const reset = systems?.reset ?? {};

    ns.print(`${c.cyan}  Factions${c.reset}`);
    ns.print(`    Focus: ${faction.currentFocus ?? "none"}`);
    ns.print(`    Stage: ${faction.stage ?? "unknown"}`);

    ns.print(`${c.purple}  Augmentations${c.reset}`);
    ns.print(`    Owned:   ${aug.ownedCount ?? 0}`);
    ns.print(`    Pending: ${aug.pendingCount ?? 0}`);
    ns.print(`    RedPill: ${aug.redPillOwned ? c.green + "YES" : c.red + "NO"}${c.reset}`);

    ns.print(`${c.yellow}  Reset${c.reset}`);
    ns.print(`    Armed:     ${reset.armed ? c.green + "YES" : c.red + "NO"}${c.reset}`);
    ns.print(`    Readiness: ${reset.readinessPercent ?? 0}%`);

    const blockers = reset.blockers ?? [];
    if (blockers.length > 0) {
        ns.print(`    Blockers: ${c.red}${blockers.join(", ")}${c.reset}`);
    } else {
        ns.print(`    Blockers: ${c.green}none${c.reset}`);
    }
}

function cap(c, label, value) {
    return value
        ? `${c.green}[${label}✓]${c.reset}`
        : `${c.gray}[${label}·]${c.reset}`;
}

function colorPhase(c, phase) {
    const value = String(phase).toLowerCase();

    if (value.includes("faction")) return c.cyan;
    if (value.includes("singularity")) return c.purple;
    if (value.includes("reset")) return c.red;
    if (value.includes("money")) return c.green;
    if (value.includes("exp")) return c.blue;

    return c.white;
}

function colorMode(c, mode) {
    const value = String(mode).toLowerCase();

    if (value.includes("money")) return c.green;
    if (value.includes("faction")) return c.cyan;
    if (value.includes("exp")) return c.blue;
    if (value.includes("reset")) return c.red;

    return c.white;
}

function colorPriority(c, priority) {
    const value = String(priority).toLowerCase();

    if (value.includes("income")) return c.green;
    if (value.includes("rep")) return c.cyan;
    if (value.includes("exp")) return c.blue;
    if (value.includes("reset")) return c.red;

    return c.white;
}

function colorAccent(c, accent) {
    const value = String(accent).toLowerCase();

    if (value.includes("purple")) return c.purple;
    if (value.includes("green")) return c.green;
    if (value.includes("cyan")) return c.cyan;
    if (value.includes("red")) return c.red;
    if (value.includes("yellow")) return c.yellow;

    return c.white;
}

function formatTimestamp(value) {
    if (!value) return "unknown";

    try {
        return new Date(value).toLocaleTimeString();
    } catch {
        return String(value);
    }
}

function readJson(ns, file, fallback = null) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;

        const raw = ns.read(file);
        if (!raw || !raw.trim()) return fallback;

        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function colors() {
    return {
        reset: "\u001b[0m",
        gray: "\u001b[90m",
        white: "\u001b[37m",
        green: "\u001b[32m",
        yellow: "\u001b[33m",
        red: "\u001b[31m",
        blue: "\u001b[34m",
        cyan: "\u001b[36m",
        purple: "\u001b[35m",
    };
}