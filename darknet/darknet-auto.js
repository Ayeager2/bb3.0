/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const CONFIG = {
    passwordFile: "/data/darknet-passwords.txt",
    sleepMs: 5000,
    enableSpread: true,
    enableCaches: true,
    enableFreeRam: true,
    enablePhishing: true,
    maxAuthGuessesPerServer: 50,
  };

  const state = {
    started: Date.now(),
    cycles: 0,
    host: "",
    neighbors: [],
    authed: 0,
    failed: 0,
    spread: 0,
    caches: 0,
    ramRuns: 0,
    phishingRuns: 0,
    lastAction: "Starting...",
    discovered: {},
    logs: [],
  };

  while (true) {
    state.host = ns.getHostname();
    state.cycles++;

    await reconnectKnownSessions(ns, CONFIG, state);
    await performLocalWork(ns, CONFIG, state);

    const neighbors = safeProbe(ns);
    state.neighbors = neighbors;

    for (const target of neighbors) {
      const success = await solveAndAuth(ns, target, CONFIG, state);

      if (success && CONFIG.enableSpread) {
        await spread(ns, target, state);
      }
    }

    drawDashboard(ns, CONFIG, state);
    await ns.sleep(CONFIG.sleepMs);
  }
}

function log(state, msg) {
  state.lastAction = msg;
  state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  state.logs = state.logs.slice(0, 10);
}

function safeProbe(ns) {
  try {
    return ns.dnet.probe() ?? [];
  } catch {
    return [];
  }
}

async function solveAndAuth(ns, hostname, CONFIG, state) {
  const details = safeDetails(ns, hostname);
  if (!details?.isOnline || !details?.isConnectedToCurrentServer) return false;

  state.discovered[hostname] = {
    model: details.modelId,
    online: details.isOnline,
    session: details.hasSession,
  };

  if (details.hasSession) return true;

  const saved = readJson(ns, CONFIG.passwordFile);

  if (saved[hostname] !== undefined) {
    try {
      if (ns.dnet.connectToSession(hostname, saved[hostname])) {
        log(state, `Reconnected session: ${hostname}`);
        return true;
      }
    } catch { }
  }

  const guesses = buildGuesses(details, hostname).slice(0, CONFIG.maxAuthGuessesPerServer);

  for (const password of guesses) {
    try {
      log(state, `Trying auth: ${hostname} with "${password}"`);
      const result = await ns.dnet.authenticate(hostname, password);

      if (result?.success) {
        saved[hostname] = password;
        writeJson(ns, CONFIG.passwordFile, saved);

        state.authed++;
        state.discovered[hostname].session = true;

        log(state, `Authenticated ${hostname} | ${details.modelId}`);
        return true;
      }
    } catch { }
  }

  state.failed++;
  await printHeartbleed(ns, hostname, state);
  return false;
}

function safeDetails(ns, hostname) {
  try {
    return ns.dnet.getServerDetails(hostname);
  } catch {
    return null;
  }
}

function buildGuesses(details, hostname) {
  const guesses = new Set();

  switch (details.modelId) {
    case "ZeroLogon":
      guesses.add("");
      break;
    default:
      guesses.add("");
      guesses.add(details.modelId);
      guesses.add(details.modelId?.toLowerCase());
      guesses.add(`${details.modelId}-${hostname}`);
      break;
  }

  addHintGuesses(guesses, details.passwordHint);
  addCommonGuesses(guesses, hostname);

  return [...guesses].filter(x => x !== null && x !== undefined);
}

function addHintGuesses(guesses, hint) {
  if (!hint) return;

  const clean = String(hint).trim();
  const lower = clean.toLowerCase();

  guesses.add(clean);
  guesses.add(lower);
  guesses.add(clean.toUpperCase());
  guesses.add(clean.replaceAll(" ", ""));
  guesses.add(lower.replaceAll(" ", ""));

  const quoted = clean.match(/["'`](.*?)["'`]/);
  if (quoted?.[1]) guesses.add(quoted[1]);

  const numbers = clean.match(/\d+/g);
  if (numbers) numbers.forEach(n => guesses.add(n));
}

function addCommonGuesses(guesses, hostname) {
  const host = hostname.toLowerCase();

  [
    "",
    "admin",
    "root",
    "password",
    "darkweb",
    "darknet",
    "guest",
    "user",
    "test",
    "0000",
    "1234",
    "123456",
    host,
    host.toUpperCase(),
    `${host}123`,
    `${host}1234`,
    `${host}!`,
  ].forEach(x => guesses.add(x));
}

async function spread(ns, hostname, state) {
  const script = ns.getScriptName();

  try {
    await ns.scp(script, hostname);

    const pid = ns.exec(script, hostname, {
      preventDuplicates: true,
    });

    if (pid > 0) {
      state.spread++;
      log(state, `Spread to ${hostname} pid=${pid}`);
    }
  } catch {
    log(state, `Spread failed: ${hostname}`);
  }
}

async function performLocalWork(ns, CONFIG, state) {
  const host = ns.getHostname();

  try {
    if (!ns.dnet.isDarknetServer(host)) return;
  } catch {
    return;
  }

  if (CONFIG.enableCaches) openCaches(ns, state);
  if (CONFIG.enableFreeRam) await freeRam(ns, state);
  if (CONFIG.enablePhishing) await phishing(ns, state);
}

function openCaches(ns, state) {
  for (const file of ns.ls(ns.getHostname(), ".cache")) {
    try {
      const result = ns.dnet.openCache(file);
      state.caches++;
      log(state, `Opened cache ${file}: ${JSON.stringify(result)}`);
    } catch { }
  }
}

async function freeRam(ns, state) {
  const host = ns.getHostname();

  try {
    const blocked = ns.dnet.getBlockedRam(host);

    if (blocked > 0) {
      await ns.dnet.memoryReallocation(host);
      state.ramRuns++;
      log(state, `Freed RAM attempt on ${host}`);
    }
  } catch { }
}

async function phishing(ns, state) {
  try {
    await ns.dnet.phishingAttack();
    state.phishingRuns++;
    log(state, `Phishing attack completed`);
  } catch { }
}

async function reconnectKnownSessions(ns, CONFIG, state) {
  const saved = readJson(ns, CONFIG.passwordFile);

  for (const [host, pass] of Object.entries(saved)) {
    try {
      ns.dnet.connectToSession(host, pass);
    } catch { }
  }

  log(state, `Loaded ${Object.keys(saved).length} saved passwords`);
}

async function printHeartbleed(ns, hostname, state) {
  try {
    const result = await ns.dnet.heartbleed(hostname, { peek: true });
    const logs = result?.logs ?? [];

    if (logs.length > 0) {
      log(state, `Heartbleed found logs on ${hostname}`);
      for (const entry of logs.slice(0, 3)) {
        log(state, `${hostname}: ${entry}`);
      }
    }
  } catch { }
}

function drawDashboard(ns, CONFIG, state) {
  const c = {
    reset: "\u001b[0m",
    cyan: "\u001b[36m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
    gray: "\u001b[90m",
    white: "\u001b[37m",
    magenta: "\u001b[35m",
  };

  const uptime = formatDuration(Date.now() - state.started);
  const knownCount = Object.keys(readJson(ns, CONFIG.passwordFile)).length;
  const discovered = Object.entries(state.discovered).slice(-12);

  ns.clearLog();

  ns.print(`${c.cyan}╔════════════════════════════════════════════════════╗${c.reset}`);
  ns.print(`${c.cyan}║              DARKNET AUTO DASHBOARD               ║${c.reset}`);
  ns.print(`${c.cyan}╚════════════════════════════════════════════════════╝${c.reset}`);
  ns.print(`${c.white}Host:${c.reset} ${state.host}`);
  ns.print(`${c.white}Uptime:${c.reset} ${uptime}   ${c.white}Cycle:${c.reset} ${state.cycles}`);
  ns.print(`${c.white}Last:${c.reset} ${state.lastAction}`);
  ns.print("");

  ns.print(`${c.magenta}Actions${c.reset}`);
  ns.print(`  Auth Success: ${c.green}${state.authed}${c.reset}`);
  ns.print(`  Auth Failed : ${c.red}${state.failed}${c.reset}`);
  ns.print(`  Spread      : ${c.green}${state.spread}${c.reset}`);
  ns.print(`  Caches Open : ${c.yellow}${state.caches}${c.reset}`);
  ns.print(`  RAM Attempts: ${c.yellow}${state.ramRuns}${c.reset}`);
  ns.print(`  Phishing    : ${c.yellow}${state.phishingRuns}${c.reset}`);
  ns.print(`  Saved Passes: ${c.cyan}${knownCount}${c.reset}`);
  ns.print("");

  ns.print(`${c.magenta}Nearby Servers${c.reset}`);
  if (state.neighbors.length === 0) {
    ns.print(`  ${c.gray}none${c.reset}`);
  } else {
    for (const n of state.neighbors) {
      const d = state.discovered[n];
      const status = d?.session ? `${c.green}SESSION${c.reset}` : `${c.yellow}UNKNOWN${c.reset}`;
      ns.print(`  ${n.padEnd(24)} ${status} ${c.gray}${d?.model ?? ""}${c.reset}`);
    }
  }

  ns.print("");
  ns.print(`${c.magenta}Discovered${c.reset}`);
  if (discovered.length === 0) {
    ns.print(`  ${c.gray}none yet${c.reset}`);
  } else {
    for (const [host, d] of discovered) {
      const online = d.online ? `${c.green}online${c.reset}` : `${c.red}offline${c.reset}`;
      const session = d.session ? `${c.green}session${c.reset}` : `${c.gray}no-session${c.reset}`;
      ns.print(`  ${host.padEnd(24)} ${online} ${session} ${c.gray}${d.model}${c.reset}`);
    }
  }

  ns.print("");
  ns.print(`${c.magenta}Recent Logs${c.reset}`);
  for (const line of state.logs.slice(0, 8)) {
    ns.print(`  ${c.gray}${line}${c.reset}`);
  }
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  ns.write(file, JSON.stringify(data, null, 2), "w");
}

export function autocomplete() {
  return ["--tail"];
}