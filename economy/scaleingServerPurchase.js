const STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const flags = ns.flags([
        ["tails", false],
    ]);
    if (flags.tails) {
        ns.ui.openTail();
    }
    const CONFIG = {
        baseName: "HomeServer",
        startingMulti: 3,
        maxRam: Math.pow(2, 20),

        waitRefreshMs: 1000,
        actionRefreshMs: 10,
        stateRefreshMs: 2000,

        scriptsToCopy: ["/workers/h1.js", "/workers/g1.js", "/workers/w1.js"],

        maxServerRows: 18,
        maxRecentActions: 8,
    };

    let multi = CONFIG.startingMulti;
    let servers = ns.cloud.getServerNames();

    if (servers.length > 0) {
        const currentMaxRam = servers.reduce(
            (max, server) => Math.max(max, ns.getServerMaxRam(server)),
            CONFIG.startingMulti
        );

        while (Math.pow(2, multi) < currentMaxRam) {
            multi++;
        }
    }

    const queue = new Queue();

    for (const server of servers) {
        queue.enqueue(server);
    }

    let nameCounter = getNextServerNumber(servers, CONFIG.baseName);

    let daemonState = {};
    let lastStateRefresh = 0;

    const state = {
        started: Date.now(),
        cycles: 0,
        lastAction: "Starting cloud server manager...",
        recentActions: [],
        servers: [],
        cash: 0,
        cost: 0,
        ram: 0,
        multi,
        limit: 0,
        count: 0,
        canBuy: false,
        maxed: false,
        daemonAllowed: true,
        daemonPriority: "unknown",
        nextServerName: "",
    };

    while (true) {
        const now = Date.now();

        if (now - lastStateRefresh > CONFIG.stateRefreshMs) {
            daemonState = readDaemonState(ns);
            lastStateRefresh = now;
        }

        state.daemonAllowed =
            daemonState?.spendingPolicy?.allowServerPurchases !== false;

        state.daemonPriority =
            daemonState?.spendingPolicy?.priority ?? "unknown";

        if (!state.daemonAllowed) {
            log(state, "Daemon disabled server purchasing.");
            servers = ns.cloud.getServerNames();
            updateState(ns, CONFIG, state, servers, multi, nameCounter);
            drawDashboard(ns, CONFIG, state);
            await ns.asleep(CONFIG.waitRefreshMs);
            continue;
        }

        servers = ns.cloud.getServerNames();
        syncQueue(queue, servers);

        const count = queue.length;
        const cash = ns.getPlayer().money;
        const ram = Math.min(CONFIG.maxRam, Math.pow(2, multi));
        const cost = ns.cloud.getServerCost(ram);
        const limit = ns.cloud.getServerLimit();

        state.cycles++;
        state.cash = cash;
        state.cost = cost;
        state.ram = ram;
        state.multi = multi;
        state.limit = limit;
        state.count = count;
        state.canBuy = cash >= cost;
        state.maxed = Math.pow(2, multi) >= CONFIG.maxRam;
        state.nextServerName = CONFIG.baseName + nameCounter;
        state.servers = servers
            .map(server => ({
                name: server,
                ram: ns.getServerMaxRam(server),
                used: ns.getServerUsedRam(server),
            }))
            .sort((a, b) => b.ram - a.ram);

        if (state.maxed) {
            log(state, "Max RAM tier reached. Stopping script.");
            drawDashboard(ns, CONFIG, state);
            ns.tprint("maxed on servers, killing process");
            return;
        }

        if (count >= limit && cash >= cost) {
            const current = queue.peek();

            if (Math.min(CONFIG.maxRam, Math.pow(2, multi)) <= ns.getServerMaxRam(current)) {
                log(state, `Bumping RAM tier from ${formatRam(Math.pow(2, multi))} to ${formatRam(Math.pow(2, multi + 1))}`);
                multi++;
                state.multi = multi;
                drawDashboard(ns, CONFIG, state);
                await ns.asleep(CONFIG.actionRefreshMs);
                continue;
            }

            const oldServer = queue.dequeue();

            ns.killall(oldServer);
            ns.cloud.deleteServer(oldServer);

            log(state, `Deleted ${oldServer} for upgrade`);
            drawDashboard(ns, CONFIG, state);
            await ns.asleep(CONFIG.actionRefreshMs);
            continue;
        }

        if (count < limit && cash >= cost) {
            const name = CONFIG.baseName + nameCounter;
            nameCounter++;

            const newBox = ns.cloud.purchaseServer(name, ram);

            if (newBox !== "") {
                queue.enqueue(newBox);
                await ns.scp(CONFIG.scriptsToCopy, newBox, "home");
                log(state, `Purchased ${newBox} with ${formatRam(ram)}`);
            } else {
                log(state, `Purchase failed for ${name}`);
            }

            drawDashboard(ns, CONFIG, state);
            await ns.asleep(CONFIG.actionRefreshMs);
            continue;
        }

        log(state, `Waiting for funds: need ${money(cost)}, have ${money(cash)}`);
        drawDashboard(ns, CONFIG, state);

        await ns.asleep(
            state.canBuy
                ? CONFIG.actionRefreshMs
                : CONFIG.waitRefreshMs
        );
    }
}

function updateState(ns, CONFIG, state, servers, multi, nameCounter) {
    const ram = Math.min(CONFIG.maxRam, Math.pow(2, multi));

    state.cycles++;
    state.cash = ns.getPlayer().money;
    state.ram = ram;
    state.cost = ns.cloud.getServerCost(ram);
    state.limit = ns.cloud.getServerLimit();
    state.count = servers.length;
    state.multi = multi;
    state.canBuy = state.cash >= state.cost;
    state.maxed = Math.pow(2, multi) >= CONFIG.maxRam;
    state.nextServerName = CONFIG.baseName + nameCounter;
    state.servers = servers
        .map(server => ({
            name: server,
            ram: ns.getServerMaxRam(server),
            used: ns.getServerUsedRam(server),
        }))
        .sort((a, b) => b.ram - a.ram);
}

function readDaemonState(ns) {
    try {
        if (!ns.fileExists(STATE_FILE, "home")) return {};
        const raw = ns.read(STATE_FILE);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function drawDashboard(ns, CONFIG, state) {
    const c = colors();

    ns.clearLog();

    const uptime = formatDuration(Date.now() - state.started);
    const cashColor = state.canBuy ? c.green : c.yellow;
    const progress = state.limit > 0 ? state.count / state.limit : 0;

    printTitleBox(ns, "Cloud Server Manager - Daemon Controlled", [
        `Mode       : Auto Purchase / Auto Upgrade`,
        `Daemon     : ${state.daemonAllowed ? "ALLOWED" : "PAUSED"} | Priority: ${state.daemonPriority}`,
        `Uptime     : ${uptime}`,
        `Cycle      : ${state.cycles}`,
        `Last Action: ${state.lastAction}`,
    ], c);

    printAccordionSection(ns, "Status", true, [
        `${badge(c, "SERVERS", `${state.count}/${state.limit}`, c.cyan)} ${badge(c, "RAM", formatRam(state.ram), c.green)} ${badge(c, "TIER", state.multi, c.yellow)}`,
        `${badge(c, "CASH", money(state.cash), cashColor)} ${badge(c, "NEXT COST", money(state.cost), c.yellow)}`,
        `${badge(c, "CAN BUY", state.canBuy ? "YES" : "NO", state.canBuy ? c.green : c.red)} ${badge(c, "MAXED", state.maxed ? "YES" : "NO", state.maxed ? c.red : c.green)}`,
        `Server Slots: ${progressBar(progress, 24)}`,
        `Next Name   : ${state.nextServerName}`,
    ], c.cyan);

    printAccordionSection(ns, "Purchase Plan", true, [
        `Base Name      : ${CONFIG.baseName}`,
        `Current RAM    : ${formatRam(state.ram)}`,
        `Next Tier RAM  : ${formatRam(Math.min(CONFIG.maxRam, Math.pow(2, state.multi + 1)))}`,
        `Server Limit   : ${state.limit}`,
        `Wait Refresh   : ${CONFIG.waitRefreshMs}ms`,
        `Action Refresh : ${CONFIG.actionRefreshMs}ms`,
        `Scripts        : ${CONFIG.scriptsToCopy.join(", ")}`,
    ], c.cyan);

    const serverLines = [];

    if (state.servers.length === 0) {
        serverLines.push(`${c.gray}No cloud servers purchased yet.${c.reset}`);
    } else {
        for (const server of state.servers.slice(0, CONFIG.maxServerRows)) {
            const usedPercent = server.ram > 0 ? server.used / server.ram : 0;
            const usedColor = usedPercent < 0.75 ? c.green : usedPercent < 0.92 ? c.yellow : c.red;

            serverLines.push(
                `${c.white}${padRight(shorten(server.name, 22), 22)}${c.reset} ` +
                `${c.green}${padLeft(formatRam(server.ram), 8)}${c.reset} ` +
                `${usedColor}${progressBar(usedPercent, 18)}${c.reset}`
            );
        }

        if (state.servers.length > CONFIG.maxServerRows) {
            serverLines.push(`${c.gray}+${state.servers.length - CONFIG.maxServerRows} more server(s) hidden${c.reset}`);
        }
    }

    printAccordionSection(ns, "Owned Servers", true, serverLines, c.cyan);

    const actionLines =
        state.recentActions.length === 0
            ? [`${c.gray}No actions yet.${c.reset}`]
            : state.recentActions.slice(0, CONFIG.maxRecentActions).map(x => `${c.gray}${shorten(x, 90)}${c.reset}`);

    printAccordionSection(ns, "Recent Actions", true, actionLines, c.cyan);
}

function log(state, message) {
    state.lastAction = message;
    state.recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
    state.recentActions = state.recentActions.slice(0, 20);
}

function syncQueue(queue, servers) {
    const serverSet = new Set(servers);

    for (let i = queue.length - 1; i >= 0; i--) {
        if (!serverSet.has(queue[i])) {
            queue.splice(i, 1);
        }
    }

    for (const server of servers) {
        if (!queue.includes(server)) {
            queue.enqueue(server);
        }
    }
}

function getNextServerNumber(servers, baseName) {
    let max = 0;

    for (const server of servers) {
        if (!server.startsWith(baseName)) continue;

        const suffix = server.slice(baseName.length);
        const number = Number(suffix);

        if (Number.isFinite(number)) {
            max = Math.max(max, number);
        }
    }

    return max + 1;
}

function printTitleBox(ns, title, lines, c) {
    const width = 86;
    const innerWidth = width - 4;

    ns.print(`${c.cyan}╔${"═".repeat(width - 2)}╗${c.reset}`);
    ns.print(`${c.cyan}║${c.reset} ${c.white}${padRight(title, innerWidth)}${c.reset} ${c.cyan}║${c.reset}`);
    ns.print(`${c.cyan}╠${"═".repeat(width - 2)}╣${c.reset}`);

    for (const line of lines) {
        ns.print(`${c.cyan}║${c.reset} ${padRight(stripAnsi(shorten(line, innerWidth)), innerWidth)} ${c.cyan}║${c.reset}`);
    }

    ns.print(`${c.cyan}╚${"═".repeat(width - 2)}╝${c.reset}`);
}

function printAccordionSection(ns, title, isOpen, lines, color = "\u001b[36m") {
    const reset = "\u001b[0m";
    const icon = isOpen ? "[-]" : "[+]";

    ns.print("");
    ns.print(`${color}${icon} ${title}${reset}`);

    if (!isOpen) return;

    for (const line of lines) {
        ns.print(`    ${line}`);
    }
}

function badge(c, label, value, color) {
    return (
        `${c.gray}[${c.reset}` +
        `${color}${label}:${value}${c.reset}` +
        `${c.gray}]${c.reset}`
    );
}

function progressBar(percent, width) {
    const safePercent = Math.max(0, Math.min(1, percent));
    const filled = Math.round(safePercent * width);
    const empty = width - filled;

    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${(safePercent * 100).toFixed(1)}%`;
}

function money(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "$0";
    if (Math.abs(n) >= 1_000_000_000_000) return "$" + (n / 1_000_000_000_000).toFixed(2) + "t";
    if (Math.abs(n) >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "b";
    if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "m";
    if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toFixed(2) + "k";

    return "$" + n.toFixed(0);
}

function formatRam(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "0GB";
    if (n >= 1_048_576) return (n / 1_048_576).toFixed(0) + "PB";
    if (n >= 1024) return (n / 1024).toFixed(0) + "TB";

    return n.toFixed(0) + "GB";
}

function formatDuration(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shorten(value, maxLength) {
    const text = String(value ?? "");

    if (text.length <= maxLength) return text;
    if (maxLength <= 3) return text.slice(0, maxLength);

    return text.slice(0, maxLength - 3) + "...";
}

function stripAnsi(value) {
    return String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "");
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

function padLeft(value, length) {
    return String(value).padStart(length, " ");
}

function padRight(value, length) {
    return String(value).padEnd(length, " ");
}

class Queue extends Array {
    enqueue(val) {
        this.push(val);
    }

    dequeue() {
        return this.shift();
    }

    peek() {
        return this[0];
    }

    isEmpty() {
        return this.length === 0;
    }
}