const DAEMON_STATE_FILE = "/data/daemon-state.txt";

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
    refreshMs: 5000,
    maxRows: 12,

    factions: [
      { name: "CyberSec", server: "CSEC", minHack: 50 },
      { name: "NiteSec", server: "avmnite-02h", minHack: 200 },
      { name: "The Black Hand", server: "I.I.I.I", minHack: 300 },
      { name: "BitRunners", server: "run4theh111z", minHack: 500 },
      { name: "Daedalus", server: null, minHack: 2500 },
    ],
  };

  while (true) {
    const daemon = readJson(ns, DAEMON_STATE_FILE);
    const state = buildState(ns, CONFIG, daemon);

    drawDashboard(ns, CONFIG, state);

    await ns.sleep(CONFIG.refreshMs);
  }
}

function buildState(ns, CONFIG, daemon) {
  const player = ns.getPlayer();
  const hacking = ns.getHackingLevel();

  const factions = CONFIG.factions.map(f => getFactionState(ns, f, player, hacking));

  return {
    daemonMode: daemon?.mode ?? "unknown",
    daemonPriority: daemon?.spendingPolicy?.priority ?? "unknown",
    daemonTarget: daemon?.target ?? "unknown",
    hacking,
    money: player.money,
    joinedFactions: player.factions ?? [],
    factions,
    nextActions: getNextActions(factions),
  };
}

function getFactionState(ns, faction, player, hacking) {
  const joined = player.factions.includes(faction.name);
  const hackReady = hacking >= faction.minHack;

  let serverExists = false;
  let rooted = false;
  let backdoored = false;
  let requiredHack = faction.minHack;
  let path = [];

  if (faction.server) {
    try {
      serverExists = ns.serverExists(faction.server);
      const server = ns.getServer(faction.server);
      rooted = server.hasAdminRights;
      backdoored = server.backdoorInstalled;
      requiredHack = server.requiredHackingSkill;
      path = findPath(ns, "home", faction.server);
    } catch { }
  }

  let rep = 0;
  let favor = 0;
  let favorGain = 0;
  let augCount = 0;
  let availableAugCount = 0;

  try {
    if (joined) rep = ns.singularity.getFactionRep(faction.name);
  } catch { }

  try {
    if (joined) favor = ns.singularity.getFactionFavor(faction.name);
  } catch { }

  try {
    if (joined) favorGain = ns.singularity.getFactionFavorGain(faction.name);
  } catch { }

  try {
    if (joined) augCount = ns.singularity.getAugmentationsFromFaction(faction.name).length;
  } catch { }

  try {
    if (joined) {
      const owned = new Set(ns.singularity.getOwnedAugmentations(true));
      availableAugCount = ns.singularity
        .getAugmentationsFromFaction(faction.name)
        .filter(a => !owned.has(a)).length;
    }
  } catch { }

  return {
    name: faction.name,
    server: faction.server,
    joined,
    minHack: faction.minHack,
    requiredHack,
    hackReady,
    serverExists,
    rooted,
    backdoored,
    rep,
    favor,
    favorGain,
    augCount,
    availableAugCount,
    path,
    nextAction: getFactionNextAction({
      name: faction.name,
      server: faction.server,
      joined,
      hackReady,
      serverExists,
      rooted,
      backdoored,
    }),
  };
}

function getFactionNextAction(f) {
  if (!f.server && f.name === "Daedalus") {
    return f.joined ? "Farm/buy late-game augments" : "Meet Daedalus requirements later";
  }

  if (!f.serverExists) return "Server not discovered yet";
  if (!f.hackReady) return "Raise hacking level";
  if (!f.rooted) return "Need root / port openers";
  if (!f.backdoored) return `Backdoor ${f.server}`;
  if (!f.joined) return "Wait for invite / join faction";

  return "Farm rep / buy augments";
}

function getNextActions(factions) {
  const actions = [];

  for (const f of factions) {
    if (f.nextAction !== "Farm rep / buy augments" && f.nextAction !== "Meet Daedalus requirements later") {
      actions.push(`${f.name}: ${f.nextAction}`);
      continue;
    }

    if (f.joined && f.availableAugCount > 0) {
      actions.push(`${f.name}: ${f.availableAugCount} unowned augment(s) available`);
    }
  }

  return actions.slice(0, 8);
}

function drawDashboard(ns, CONFIG, state) {
  const c = colors();
  ns.clearLog();

  printTitleBox(ns, "Faction Planner / Backdoor HUD", [
    `Daemon     : ${state.daemonMode} | ${state.daemonPriority}`,
    `Target     : ${state.daemonTarget}`,
    `Hacking    : ${state.hacking}`,
    `Factions   : ${state.joinedFactions.length}`,
  ], c);

  printAccordionSection(ns, "Progression Spine", true, [
    `${badge(c, "CyberSec", yesNo(isJoined(state, "CyberSec")), isJoined(state, "CyberSec") ? c.green : c.red)} ` +
    `${badge(c, "NiteSec", yesNo(isJoined(state, "NiteSec")), isJoined(state, "NiteSec") ? c.green : c.red)} ` +
    `${badge(c, "Black Hand", yesNo(isJoined(state, "The Black Hand")), isJoined(state, "The Black Hand") ? c.green : c.red)}`,
    `${badge(c, "BitRunners", yesNo(isJoined(state, "BitRunners")), isJoined(state, "BitRunners") ? c.green : c.red)} ` +
    `${badge(c, "Daedalus", yesNo(isJoined(state, "Daedalus")), isJoined(state, "Daedalus") ? c.green : c.red)}`,
  ], c.cyan);

  const lines = [];
  lines.push(
    `${c.gray}${padRight("Faction", 18)} ${padRight("Join", 5)} ${padRight("Hack", 9)} ${padRight("Root", 5)} ${padRight("BD", 5)} ${padLeft("Rep", 11)} ${padLeft("Favor", 8)} ${padRight("Next", 28)}${c.reset}`
  );

  for (const f of state.factions.slice(0, CONFIG.maxRows)) {
    const joinedColor = f.joined ? c.green : c.red;
    const hackColor = f.hackReady ? c.green : c.red;
    const rootColor = f.rooted || !f.server ? c.green : c.red;
    const bdColor = f.backdoored || !f.server ? c.green : c.yellow;

    lines.push(
      `${c.white}${padRight(shorten(f.name, 18), 18)}${c.reset} ` +
      `${joinedColor}${padRight(f.joined ? "YES" : "NO", 5)}${c.reset} ` +
      `${hackColor}${padRight(`${state.hacking}/${f.requiredHack}`, 9)}${c.reset} ` +
      `${rootColor}${padRight(f.server ? yesNo(f.rooted) : "-", 5)}${c.reset} ` +
      `${bdColor}${padRight(f.server ? yesNo(f.backdoored) : "-", 5)}${c.reset} ` +
      `${c.cyan}${padLeft(formatNum(f.rep), 11)}${c.reset} ` +
      `${c.yellow}${padLeft(formatNum(f.favor), 8)}${c.reset} ` +
      `${c.gray}${padRight(shorten(f.nextAction, 28), 28)}${c.reset}`
    );
  }

  printAccordionSection(ns, "Faction Status", true, lines, c.cyan);

  const pathLines = [];

  for (const f of state.factions.filter(x => x.server && !x.backdoored).slice(0, 4)) {
    pathLines.push(`${c.yellow}${f.name}${c.reset}: ${f.path.length ? f.path.join(" -> ") : "path not found"}`);
  }

  printAccordionSection(ns, "Backdoor Paths Needed", true, pathLines.length ? pathLines : [
    `${c.green}No immediate backdoor paths needed.${c.reset}`,
  ], c.yellow);

  printAccordionSection(ns, "Next Actions", true, state.nextActions.length ? state.nextActions.map(x => `${c.green}${x}${c.reset}`) : [
    `${c.green}No obvious faction blockers detected.${c.reset}`,
  ], c.green);
}

function isJoined(state, faction) {
  return state.joinedFactions.includes(faction);
}

function findPath(ns, start, target) {
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === target) return path;

    let neighbors = [];
    try {
      neighbors = ns.scan(node);
    } catch {
      neighbors = [];
    }

    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...path, next]);
    }
  }

  return [];
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

function printTitleBox(ns, title, lines, c) {
  const width = 106;
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
  ns.print("");
  ns.print(`${color}${isOpen ? "[-]" : "[+]"} ${title}${reset}`);
  if (!isOpen) return;
  for (const line of lines) ns.print(`    ${line}`);
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

function yesNo(value) {
  return value ? "YES" : "NO";
}

function formatNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "k";
  return n.toFixed(0);
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

function padLeft(value, length) {
  return String(value).padStart(length, " ");
}