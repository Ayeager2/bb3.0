const STATE_FILE = "/data/daemon-state.txt";

const DEFAULT_WORKER_SCRIPTS = ["/workers/h1.js", "/workers/g1.js", "/workers/w1.js"];

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.resizeTail(900, 600);
  const flags = ns.flags([
    ["tails", false],
  ]);
  if (flags.tails) {
    ns.ui.openTail();
  }
  const CONFIG = {
    retryMissingRoot: true,
    copyHomeSource: "home",
    maxRows: 24,
  };

  const daemonState = readDaemonState(ns);
  const workerScripts = daemonState?.protoBatching?.workerScripts ?? DEFAULT_WORKER_SCRIPTS;

  const state = {
    started: Date.now(),
    scanned: 0,
    rooted: 0,
    skippedNoRoot: 0,
    skippedInvalid: 0,
    updated: 0,
    failed: 0,
    missingLocal: [],
    rows: [],
    lastAction: "Starting worker worm updater...",
  };

  const missingLocal = workerScripts.filter(script => !ns.fileExists(script, "home"));
  state.missingLocal = missingLocal;

  if (missingLocal.length > 0) {
    state.lastAction = "Missing local worker scripts.";
    drawDashboard(ns, CONFIG, state, workerScripts);
    return;
  }

  const servers = getAllServers(ns);

  for (const server of servers) {
    if (server === "home") continue;

    state.scanned++;

    if (!safeServerExists(ns, server)) {
      state.skippedInvalid++;
      addRow(state, server, "INVALID", "Server disappeared.");
      continue;
    }

    if (!ns.hasRootAccess(server) && CONFIG.retryMissingRoot) {
      tryRoot(ns, server);
    }

    if (!ns.hasRootAccess(server)) {
      state.skippedNoRoot++;
      addRow(state, server, "NO ROOT", "Skipped.");
      continue;
    }

    state.rooted++;

    const needsCopy = workerScripts.some(script => {
      try {
        return !ns.fileExists(script, server);
      } catch {
        return true;
      }
    });

    if (!needsCopy) {
      addRow(state, server, "OK", "Already current.");
      continue;
    }

    try {
      const copied = await ns.scp(workerScripts, server, CONFIG.copyHomeSource);

      if (copied) {
        state.updated++;
        state.lastAction = `Updated ${server}`;
        addRow(state, server, "UPDATED", workerScripts.join(", "));
      } else {
        state.failed++;
        addRow(state, server, "FAILED", "scp returned false.");
      }
    } catch (error) {
      state.failed++;
      addRow(state, server, "FAILED", String(error));
    }

    drawDashboard(ns, CONFIG, state, workerScripts);
    await ns.sleep(5);
  }

  state.lastAction = `Done. Updated ${state.updated} server(s).`;
  drawDashboard(ns, CONFIG, state, workerScripts);
}

function tryRoot(ns, server) {
  try {
    let ports = 0;

    if (ns.fileExists("BruteSSH.exe", "home")) {
      ns.brutessh(server);
      ports++;
    }

    if (ns.fileExists("FTPCrack.exe", "home")) {
      ns.ftpcrack(server);
      ports++;
    }

    if (ns.fileExists("relaySMTP.exe", "home")) {
      ns.relaysmtp(server);
      ports++;
    }

    if (ns.fileExists("HTTPWorm.exe", "home")) {
      ns.httpworm(server);
      ports++;
    }

    if (ns.fileExists("SQLInject.exe", "home")) {
      ns.sqlinject(server);
      ports++;
    }

    if (ports >= ns.getServerNumPortsRequired(server)) {
      ns.nuke(server);
    }
  } catch {
    // Ignore; dashboard will show no-root if it failed.
  }
}

function drawDashboard(ns, CONFIG, state, workerScripts) {
  const c = colors();
  ns.clearLog();

  printTitleBox(ns, "Worker Worm Updater - Daemon Aware", [
    `Last Action : ${state.lastAction}`,
    `Workers     : ${workerScripts.join(", ")}`,
    `Runtime     : ${formatDuration(Date.now() - state.started)}`,
  ], c);

  if (state.missingLocal.length > 0) {
    printAccordionSection(ns, "Missing Local Scripts", true, [
      `${c.red}${state.missingLocal.join(", ")}${c.reset}`,
      `${c.yellow}Fix these on home before copying workers.${c.reset}`,
    ], c.red);
    return;
  }

  printAccordionSection(ns, "Summary", true, [
    `${badge(c, "SCANNED", state.scanned, c.cyan)} ${badge(c, "ROOTED", state.rooted, c.green)} ${badge(c, "UPDATED", state.updated, c.green)}`,
    `${badge(c, "NO ROOT", state.skippedNoRoot, c.yellow)} ${badge(c, "FAILED", state.failed, c.red)} ${badge(c, "INVALID", state.skippedInvalid, c.gray)}`,
  ], c.cyan);

  const lines = [];
  lines.push(`${c.gray}${padRight("Server", 24)} ${padRight("Status", 10)} Details${c.reset}`);

  for (const row of state.rows.slice(0, CONFIG.maxRows)) {
    const statusColor =
      row.status === "UPDATED" ? c.green :
        row.status === "OK" ? c.cyan :
          row.status === "NO ROOT" ? c.yellow :
            row.status === "FAILED" ? c.red :
              c.gray;

    lines.push(
      `${c.white}${padRight(shorten(row.server, 24), 24)}${c.reset} ` +
      `${statusColor}${padRight(row.status, 10)}${c.reset} ` +
      `${c.gray}${shorten(row.details, 70)}${c.reset}`
    );
  }

  if (state.rows.length > CONFIG.maxRows) {
    lines.push(`${c.gray}+${state.rows.length - CONFIG.maxRows} more server(s) hidden${c.reset}`);
  }

  printAccordionSection(ns, "Copy Results", true, lines, c.cyan);
}

function addRow(state, server, status, details) {
  state.rows.unshift({ server, status, details });
}

function getAllServers(ns) {
  const found = new Set(["home"]);
  scan(ns, "home", found);
  return [...found].filter(server => safeServerExists(ns, server));
}

function scan(ns, host, found) {
  if (!safeServerExists(ns, host)) return;

  let neighbors = [];

  try {
    neighbors = ns.scan(host);
  } catch {
    return;
  }

  for (const next of neighbors) {
    if (!found.has(next)) {
      found.add(next);
      scan(ns, next, found);
    }
  }
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

function safeServerExists(ns, server) {
  try {
    return !!server && ns.serverExists(server);
  } catch {
    return false;
  }
}

function printTitleBox(ns, title, lines, c) {
  const width = 92;
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
  };
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

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}