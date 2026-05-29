const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const DARKNET_STATE_FILE = "/data/darknet-watch-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(1000, 650);
  }

  const CONFIG = {
    refreshMs: 5000,
    toastMs: 8000,
    maxRows: 24,
    writeState: true,
  };

  let lastFingerprint = "";

  const state = {
    started: Date.now(),
    cycles: 0,
    apiAvailable: false,
    connected: [],
    added: [],
    removed: [],
    daemonMode: "unknown",
    daemonPriority: "unknown",
    daemonTarget: "unknown",
    lastChange: "No changes yet.",
  };

  while (true) {
    const daemonState = readJson(ns, DAEMON_STATE_FILE);
    const dnet = getDarknetApi(ns);

    state.cycles++;
    state.daemonMode = daemonState?.mode ?? "unknown";
    state.daemonPriority = daemonState?.spendingPolicy?.priority ?? "unknown";
    state.daemonTarget = daemonState?.target ?? "unknown";
    state.apiAvailable = !!dnet;

    if (!dnet) {
      state.connected = [];
      state.added = [];
      state.removed = [];
      state.lastChange = "Darknet API not available yet.";
      drawDashboard(ns, CONFIG, state);
      await ns.sleep(CONFIG.refreshMs);
      continue;
    }

    const previous = state.connected;
    const connected = safeProbe(dnet).sort();
    const fingerprint = JSON.stringify(connected);

    state.added = connected.filter(x => !previous.includes(x));
    state.removed = previous.filter(x => !connected.includes(x));
    state.connected = connected;

    if (lastFingerprint && fingerprint !== lastFingerprint) {
      state.lastChange =
        `Changed: +${state.added.length} / -${state.removed.length}`;

      if (state.added.length > 0) {
        ns.toast(`Darknet: ${state.added.length} new server(s) discovered`, "info", CONFIG.toastMs);
      }

      if (state.removed.length > 0) {
        ns.toast(`Darknet: ${state.removed.length} server(s) disappeared`, "warning", CONFIG.toastMs);
      }
    }

    lastFingerprint = fingerprint;

    if (CONFIG.writeState) {
      writeJson(ns, DARKNET_STATE_FILE, {
        updatedAt: Date.now(),
        apiAvailable: state.apiAvailable,
        connected: state.connected,
        added: state.added,
        removed: state.removed,
        count: state.connected.length,
      });
    }

    drawDashboard(ns, CONFIG, state);

    await ns.sleep(CONFIG.refreshMs);
  }
}

function getDarknetApi(ns) {
  try {
    if (typeof ns.darknet !== "undefined") return ns.darknet;
    if (typeof ns.dnet !== "undefined") return ns.dnet;
  } catch { }

  return null;
}

function safeProbe(dnet) {
  try {
    const result = dnet.probe(false);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

function drawDashboard(ns, CONFIG, state) {
  const c = colors();
  ns.clearLog();

  printTitleBox(ns, "Darknet Watcher / Recon HUD", [
    `API        : ${state.apiAvailable ? "AVAILABLE" : "LOCKED"}`,
    `Daemon     : ${state.daemonMode} | ${state.daemonPriority}`,
    `Target     : ${state.daemonTarget}`,
    `Last Change: ${state.lastChange}`,
  ], c);

  printAccordionSection(ns, "Recon Summary", true, [
    `${badge(c, "CONNECTED", state.connected.length, state.connected.length > 0 ? c.green : c.yellow)} ` +
    `${badge(c, "NEW", state.added.length, state.added.length > 0 ? c.green : c.gray)} ` +
    `${badge(c, "REMOVED", state.removed.length, state.removed.length > 0 ? c.red : c.gray)}`,
    `${badge(c, "CYCLES", state.cycles, c.cyan)} ` +
    `${badge(c, "UPTIME", formatDuration(Date.now() - state.started), c.white)}`,
  ], c.cyan);

  if (!state.apiAvailable) {
    printAccordionSection(ns, "What This Means", true, [
      `${c.yellow}Darknet API is not available in this run yet.${c.reset}`,
      `${c.gray}Watcher will keep polling and will notify you once the API starts returning data.${c.reset}`,
    ], c.yellow);
    return;
  }

  const actionLines = getActionLines(c, state);
  printAccordionSection(ns, "What To Do With This Right Now", true, actionLines, c.green);

  const addedLines = state.added.length === 0
    ? [`${c.gray}No newly discovered servers this cycle.${c.reset}`]
    : state.added.map(x => `${c.green}+ ${x}${c.reset}`);

  printAccordionSection(ns, "New This Cycle", true, addedLines, c.green);

  const serverLines = [];

  if (state.connected.length === 0) {
    serverLines.push(`${c.gray}No connected darknet servers detected.${c.reset}`);
  } else {
    for (const server of state.connected.slice(0, CONFIG.maxRows)) {
      serverLines.push(`${c.white}${server}${c.reset}`);
    }

    if (state.connected.length > CONFIG.maxRows) {
      serverLines.push(`${c.gray}+${state.connected.length - CONFIG.maxRows} more hidden${c.reset}`);
    }
  }

  printAccordionSection(ns, "Connected Darknet Servers", true, serverLines, c.cyan);
}

function getActionLines(c, state) {
  const lines = [];

  if (state.connected.length === 0) {
    lines.push(`${c.yellow}No darknet servers detected. Keep progressing normally: money, EXEs, factions, augments.${c.reset}`);
  }

  if (state.added.length > 0) {
    lines.push(`${c.green}New darknet server(s) appeared. Check whether any unlock new progression paths or special mechanics.${c.reset}`);
  }

  if (state.daemonPriority === "upgrades") {
    lines.push(`${c.cyan}Daemon is in upgrades mode. Focus on TOR, EXEs, Home RAM, and root coverage.${c.reset}`);
  }

  if (state.daemonPriority === "faction") {
    lines.push(`${c.magenta}Daemon is in faction mode. Use discoveries to look for backdoor/faction opportunities.${c.reset}`);
  }

  if (state.daemonPriority === "reset-prep") {
    lines.push(`${c.red}Daemon is in reset-prep. Avoid new spending; use this only for final checks.${c.reset}`);
  }

  if (lines.length === 0) {
    lines.push(`${c.green}Watcher is healthy. No urgent darknet action detected.${c.reset}`);
  }

  return lines;
}

function readJson(ns, file) {
  try {
    if (!ns.fileExists(file, "home")) return {};
    const raw = ns.read(file);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeJson(ns, file, data) {
  try {
    ns.write(file, JSON.stringify(data, null, 2), "w");
  } catch { }
}

function printTitleBox(ns, title, lines, c) {
  const width = 96;
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
  return `${c.gray}[${c.reset}${color}${label}:${value}${c.reset}${c.gray}]${c.reset}`;
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

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}