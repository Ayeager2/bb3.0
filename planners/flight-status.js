const DAEMON_STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(1000, 850);
  }

  const CONFIG = {
    refreshMs: 3000,

    bn4: {
      targetBitNode: 4,
      minHackingLevel: 2500,
      minMoney: 100_000_000_000,
      desiredHomeRamGb: 1024,
      desiredAugments: 30,
    },

    factions: [
      { name: "CyberSec", server: "CSEC" },
      { name: "NiteSec", server: "avmnite-02h" },
      { name: "The Black Hand", server: "I.I.I.I" },
      { name: "BitRunners", server: "run4theh111z" },
      { name: "Daedalus", server: null },
    ],

    exes: [
      "BruteSSH.exe",
      "FTPCrack.exe",
      "relaySMTP.exe",
      "HTTPWorm.exe",
      "SQLInject.exe",
    ],
  };

  while (true) {
    const daemonState = readDaemonState(ns);
    const flight = buildFlightState(ns, CONFIG, daemonState);

    drawDashboard(ns, CONFIG, flight);

    await ns.sleep(CONFIG.refreshMs);
  }
}

function buildFlightState(ns, CONFIG, daemonState) {
  const player = ns.getPlayer();

  const hacking = ns.getHackingLevel();
  const money = player.money;
  const homeRam = ns.getServerMaxRam("home");

  const ownedAugs = getOwnedAugments(ns, true);
  const installedAugs = getOwnedAugments(ns, false);
  const queuedAugCount = Math.max(0, ownedAugs.length - installedAugs.length);

  const factions = CONFIG.factions.map(faction => getFactionStatus(ns, faction));
  const exes = CONFIG.exes.map(name => ({
    name,
    owned: ns.fileExists(name, "home"),
  }));

  const hasTor = ns.fileExists("brutessh.exe", "home") || ns.fileExists("BruteSSH.exe", "home") || exes.some(x => x.owned);

  const stockAccess = getStockAccess(ns);

  const hackingReady = hacking >= CONFIG.bn4.minHackingLevel;
  const moneyReady = money >= CONFIG.bn4.minMoney;
  const ramReady = homeRam >= CONFIG.bn4.desiredHomeRamGb;
  const augReady = ownedAugs.length >= CONFIG.bn4.desiredAugments;

  const checks = [
    hackingReady,
    moneyReady,
    ramReady,
    augReady,
  ];

  const readyCount = checks.filter(Boolean).length;

  return {
    daemon: {
      mode: daemonState?.mode ?? "unknown",
      priority: daemonState?.spendingPolicy?.priority ?? "unknown",
      target: daemonState?.target ?? "unknown",
      reason: daemonState?.controller?.reason ?? "No daemon state found.",
    },

    player: {
      hacking,
      money,
      homeRam,
    },

    augments: {
      owned: ownedAugs.length,
      installed: installedAugs.length,
      queued: queuedAugCount,
    },

    exes,
    factions,
    stockAccess,
    hasTor,

    bn4: {
      targetBitNode: CONFIG.bn4.targetBitNode,
      hackingReady,
      moneyReady,
      ramReady,
      augReady,
      readyCount,
      totalChecks: checks.length,
      ready: hackingReady && moneyReady && ramReady && augReady,
    },
  };
}

function getFactionStatus(ns, faction) {
  let joined = false;
  let rep = 0;
  let favor = 0;
  let favorGain = 0;
  let augCount = 0;
  let backdoored = false;
  let serverRooted = false;
  let serverHackLevel = null;

  try {
    joined = ns.getPlayer().factions.includes(faction.name);
  } catch { }

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

  if (faction.server) {
    try {
      const server = ns.getServer(faction.server);
      backdoored = server.backdoorInstalled;
      serverRooted = server.hasAdminRights;
      serverHackLevel = server.requiredHackingSkill;
    } catch { }
  }

  return {
    name: faction.name,
    server: faction.server,
    joined,
    rep,
    favor,
    favorGain,
    augCount,
    backdoored,
    serverRooted,
    serverHackLevel,
  };
}

function drawDashboard(ns, CONFIG, flight) {
  const c = colors();
  ns.clearLog();

  printTitleBox(ns, "Flight Status / BN4 Readiness HUD", [
    `Daemon Mode : ${flight.daemon.mode}`,
    `Priority    : ${flight.daemon.priority}`,
    `Target      : ${flight.daemon.target}`,
    `Reason      : ${shorten(flight.daemon.reason, 72)}`,
  ], c);

  printAccordionSection(ns, "Core Progress", true, [
    `${badge(c, "HACKING", flight.player.hacking, flight.bn4.hackingReady ? c.green : c.yellow)} ` +
    `${badge(c, "MONEY", "$" + formatNum(flight.player.money), flight.bn4.moneyReady ? c.green : c.yellow)} ` +
    `${badge(c, "HOME RAM", formatRam(flight.player.homeRam), flight.bn4.ramReady ? c.green : c.yellow)}`,
    `${badge(c, "AUGS", `${flight.augments.owned}/${CONFIG.bn4.desiredAugments}`, flight.bn4.augReady ? c.green : c.yellow)} ` +
    `${badge(c, "INSTALLED", flight.augments.installed, c.cyan)} ` +
    `${badge(c, "QUEUED", flight.augments.queued, flight.augments.queued > 0 ? c.green : c.gray)}`,
  ], c.cyan);

  printAccordionSection(ns, "BN4 Checklist", true, [
    checklistLine(c, "Hacking level", flight.bn4.hackingReady, `${flight.player.hacking}/${CONFIG.bn4.minHackingLevel}`),
    checklistLine(c, "Money", flight.bn4.moneyReady, `$${formatNum(flight.player.money)} / $${formatNum(CONFIG.bn4.minMoney)}`),
    checklistLine(c, "Home RAM", flight.bn4.ramReady, `${formatRam(flight.player.homeRam)} / ${formatRam(CONFIG.bn4.desiredHomeRamGb)}`),
    checklistLine(c, "Augments", flight.bn4.augReady, `${flight.augments.owned}/${CONFIG.bn4.desiredAugments}`),
    "",
    `${badge(c, "READY", flight.bn4.ready ? "YES" : "NO", flight.bn4.ready ? c.green : c.red)} ` +
    `${badge(c, "CHECKS", `${flight.bn4.readyCount}/${flight.bn4.totalChecks}`, flight.bn4.ready ? c.green : c.yellow)}`,
  ], c.magenta);

  printAccordionSection(ns, "Programs / EXEs", true, [
    checklistLine(c, "TOR / Dark Web Access", flight.hasTor, flight.hasTor ? "likely available" : "not detected"),
    ...flight.exes.map(exe => checklistLine(c, exe.name, exe.owned, exe.owned ? "owned" : "missing")),
    checklistLine(c, "TIX API", flight.stockAccess.hasTix, flight.stockAccess.hasTix ? "owned" : "missing"),
    checklistLine(c, "4S API", flight.stockAccess.has4S, flight.stockAccess.has4S ? "owned" : "missing"),
  ], c.cyan);

  const factionLines = [];
  factionLines.push(
    `${c.gray}${padRight("Faction", 18)} ${padRight("Join", 6)} ${padLeft("Rep", 12)} ${padLeft("Favor", 8)} ${padRight("Backdoor", 10)} ${padRight("Server", 14)}${c.reset}`
  );

  for (const faction of flight.factions) {
    const joinedColor = faction.joined ? c.green : c.red;
    const backdoorColor = faction.server
      ? faction.backdoored ? c.green : c.yellow
      : c.gray;

    factionLines.push(
      `${c.white}${padRight(shorten(faction.name, 18), 18)}${c.reset} ` +
      `${joinedColor}${padRight(faction.joined ? "YES" : "NO", 6)}${c.reset} ` +
      `${c.cyan}${padLeft(formatNum(faction.rep), 12)}${c.reset} ` +
      `${c.yellow}${padLeft(formatNum(faction.favor), 8)}${c.reset} ` +
      `${backdoorColor}${padRight(faction.server ? faction.backdoored ? "DONE" : "NEEDED" : "-", 10)}${c.reset} ` +
      `${c.gray}${padRight(faction.server ?? "-", 14)}${c.reset}`
    );
  }

  printAccordionSection(ns, "Faction Flight Path", true, factionLines, c.cyan);

  printAccordionSection(ns, "Next Practical Actions", true, getNextActions(c, CONFIG, flight), c.green);
}

function getNextActions(c, CONFIG, flight) {
  const actions = [];

  const missingExe = flight.exes.find(x => !x.owned);
  const missingBackdoorFaction = flight.factions.find(x => x.server && !x.backdoored);
  const unjoinedFaction = flight.factions.find(x => !x.joined);

  if (missingExe) {
    actions.push(`${c.yellow}Buy or unlock ${missingExe.name}.${c.reset}`);
  }

  if (missingBackdoorFaction) {
    actions.push(`${c.yellow}Backdoor ${missingBackdoorFaction.server} to unlock ${missingBackdoorFaction.name}.${c.reset}`);
  }

  if (unjoinedFaction) {
    actions.push(`${c.cyan}Join ${unjoinedFaction.name} when invite appears.${c.reset}`);
  }

  if (!flight.bn4.hackingReady) {
    actions.push(`${c.cyan}Keep EXP/money engine running until hacking reaches ${CONFIG.bn4.minHackingLevel}.${c.reset}`);
  }

  if (!flight.bn4.moneyReady) {
    actions.push(`${c.green}Keep batching for money until $${formatNum(CONFIG.bn4.minMoney)} cash.${c.reset}`);
  }

  if (!flight.bn4.ramReady) {
    actions.push(`${c.green}Upgrade home RAM toward ${formatRam(CONFIG.bn4.desiredHomeRamGb)}.${c.reset}`);
  }

  if (!flight.bn4.augReady) {
    actions.push(`${c.magenta}Buy useful hacking/faction augments; target ${CONFIG.bn4.desiredAugments} owned.${c.reset}`);
  }

  if (flight.bn4.ready) {
    actions.push(`${c.green}BN4-ready. Prepare reset / BitNode transition.${c.reset}`);
  }

  return actions.length > 0 ? actions : [`${c.green}No obvious blockers detected.${c.reset}`];
}

function getOwnedAugments(ns, includeQueued) {
  try {
    return ns.singularity.getOwnedAugmentations(includeQueued);
  } catch {
    return [];
  }
}

function getStockAccess(ns) {
  let hasTix = false;
  let has4S = false;

  try {
    ns.stock.getPosition("ECP");
    hasTix = true;
  } catch { }

  try {
    ns.stock.getForecast("ECP");
    has4S = true;
  } catch { }

  return { hasTix, has4S };
}

function readDaemonState(ns) {
  try {
    if (!ns.fileExists(DAEMON_STATE_FILE, "home")) return {};
    const raw = ns.read(DAEMON_STATE_FILE);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function checklistLine(c, label, done, detail = "") {
  const icon = done ? "✓" : " ";
  const color = done ? c.green : c.red;

  return `${color}[${icon}]${c.reset} ${padRight(label, 24)} ${c.gray}${detail}${c.reset}`;
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

function formatNum(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "k";

  return n.toFixed(0);
}

function formatRam(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "0GB";
  if (n >= 1_048_576) return (n / 1_048_576).toFixed(0) + "PB";
  if (n >= 1024) return (n / 1024).toFixed(0) + "TB";

  return n.toFixed(0) + "GB";
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
    magenta: "\u001b[35m",
  };
}

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}

function padLeft(value, length) {
  return String(value).padStart(length, " ");
}