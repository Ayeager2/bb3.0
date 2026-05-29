// faction-ai.js
const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const FACTION_AI_STATE_FILE = "/data/faction-ai-state.txt";


const CONFIG = {
  refreshMs: 5000,

  factions: [
    { name: "CyberSec", server: "CSEC", minHack: 50, priority: 100 },
    { name: "NiteSec", server: "avmnite-02h", minHack: 200, priority: 90 },
    { name: "The Black Hand", server: "I.I.I.I", minHack: 300, priority: 80 },
    { name: "BitRunners", server: "run4theh111z", minHack: 500, priority: 70 },
    { name: "Daedalus", server: null, minHack: 2500, priority: 60 },
  ],
};

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.resizeTail(1000, 650);

  while (true) {
    const daemon = readJson(ns, DAEMON_STATE_FILE);
    const state = buildFactionAiState(ns, daemon);

    writeJson(ns, FACTION_AI_STATE_FILE, state);
    draw(ns, state);

    if (state.canUseSingularity && state.mode === "active") {
      runSingularityActions(ns, state);
    }

    await ns.sleep(CONFIG.refreshMs);
  }
}

function buildFactionAiState(ns, daemon) {
  const player = ns.getPlayer();
  const hacking = ns.getHackingLevel();

  const canUseSingularity =
    daemon?.capabilities?.singularity === true &&
    hasSingularityAccess(ns);

  const factions = CONFIG.factions.map(f => analyzeFaction(ns, f, player, hacking, canUseSingularity));
  const best = chooseBestFactionGoal(factions);

  return {
    version: 1,
    updatedAt: Date.now(),

    mode: canUseSingularity ? "active" : "planner-only",
    canUseSingularity,

    daemon: {
      mode: daemon?.mode ?? "unknown",
      priority: daemon?.spendingPolicy?.priority ?? "unknown",
      target: daemon?.target ?? "unknown",
    },

    player: {
      hacking,
      money: player.money,
      factions: player.factions ?? [],
    },

    bestFactionGoal: best,
    factions,
    recommendation: getRecommendation(best, canUseSingularity),
  };
}

function analyzeFaction(ns, faction, player, hacking, canUseSingularity) {
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
  let availableAugCount = 0;

  if (canUseSingularity && joined) {
    try { rep = ns.singularity.getFactionRep(faction.name); } catch { }
    try { favor = ns.singularity.getFactionFavor(faction.name); } catch { }

    try {
      const owned = new Set(ns.singularity.getOwnedAugmentations(true));
      availableAugCount = ns.singularity
        .getAugmentationsFromFaction(faction.name)
        .filter(a => !owned.has(a)).length;
    } catch { }
  }

  const blocker = getBlocker({
    faction,
    joined,
    hackReady,
    serverExists,
    rooted,
    backdoored,
  });

  return {
    name: faction.name,
    server: faction.server,
    priority: faction.priority,

    joined,
    hackReady,
    serverExists,
    rooted,
    backdoored,
    requiredHack,
    path,

    rep,
    favor,
    availableAugCount,

    blocker,
    score: scoreFaction({
      faction,
      joined,
      hackReady,
      serverExists,
      rooted,
      backdoored,
      availableAugCount,
    }),
  };
}

function getBlocker(x) {
  if (!x.faction.server && x.faction.name === "Daedalus") {
    return x.joined ? "READY_FOR_REP" : "LATE_GAME_REQUIREMENTS";
  }

  if (!x.serverExists) return "SERVER_NOT_FOUND";
  if (!x.hackReady) return "NEED_HACKING";
  if (!x.rooted) return "NEED_ROOT";
  if (!x.backdoored) return "NEED_BACKDOOR";
  if (!x.joined) return "NEED_INVITE_JOIN";
  return "READY_FOR_REP";
}

function scoreFaction(x) {
  let score = x.faction.priority;

  if (x.joined) score += 50;
  if (x.hackReady) score += 20;
  if (x.rooted) score += 20;
  if (x.backdoored) score += 30;
  if (x.availableAugCount > 0) score += x.availableAugCount * 5;

  if (x.blocker === "READY_FOR_REP") score += 100;
  if (x.blocker === "NEED_BACKDOOR") score += 60;
  if (x.blocker === "NEED_ROOT") score += 30;
  if (x.blocker === "NEED_HACKING") score -= 40;

  return score;
}

function chooseBestFactionGoal(factions) {
  return [...factions].sort((a, b) => b.score - a.score)[0] ?? null;
}

function getRecommendation(best, canUseSingularity) {
  if (!best) return "No faction goal found.";

  if (!canUseSingularity) {
    if (best.blocker === "NEED_HACKING") return `Planner mode: raise hacking for ${best.name}.`;
    if (best.blocker === "NEED_ROOT") return `Planner mode: root ${best.server} for ${best.name}.`;
    if (best.blocker === "NEED_BACKDOOR") return `Planner mode: backdoor ${best.server} for ${best.name}.`;
    if (best.blocker === "NEED_INVITE_JOIN") return `Planner mode: ready for ${best.name}; wait for invite/manual join.`;
    if (best.blocker === "READY_FOR_REP") return `Planner mode: ${best.name} is the best future rep target.`;
    return `Planner mode: ${best.name} blocker is ${best.blocker}.`;
  }

  if (best.blocker === "READY_FOR_REP") return `Active mode: work for ${best.name}.`;
  if (best.blocker === "NEED_INVITE_JOIN") return `Active mode: join ${best.name} if invited.`;
  if (best.blocker === "NEED_BACKDOOR") return `Active mode: backdoor needed for ${best.name}.`;

  return `Active mode: resolve ${best.blocker} for ${best.name}.`;
}

function runSingularityActions(ns, state) {
  const best = state.bestFactionGoal;
  if (!best) return;

  if (best.blocker === "NEED_INVITE_JOIN") {
    try {
      const invites = ns.singularity.checkFactionInvitations();
      if (invites.includes(best.name)) {
        ns.singularity.joinFaction(best.name);
      }
    } catch { }
  }

  if (best.blocker === "READY_FOR_REP" && best.joined) {
    try {
      ns.singularity.workForFaction(best.name, "hacking", false);
    } catch { }
  }
}

function hasSingularityAccess(ns) {
  try {
    ns.singularity.checkFactionInvitations();
    return true;
  } catch {
    return false;
  }
}

function findPath(ns, start, target) {
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === target) return path;

    let neighbors = [];
    try { neighbors = ns.scan(node); } catch { neighbors = []; }

    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...path, next]);
    }
  }

  return [];
}

function draw(ns, state) {
  const c = colors();
  ns.clearLog();

  ns.print(`${c.cyan}Faction AI - ${state.mode}${c.reset}`);
  ns.print(`${c.gray}Daemon: ${state.daemon.mode} | ${state.daemon.priority} | ${state.daemon.target}${c.reset}`);
  ns.print(`${c.yellow}${state.recommendation}${c.reset}`);
  ns.print("");

  ns.print(`${c.gray}${padRight("Faction", 18)} ${padRight("Joined", 7)} ${padRight("Hack", 10)} ${padRight("Root", 6)} ${padRight("BD", 6)} ${padRight("Blocker", 18)} ${padRight("Score", 8)}${c.reset}`);

  for (const f of state.factions) {
    ns.print(
      `${c.white}${padRight(f.name, 18)}${c.reset} ` +
      `${f.joined ? c.green : c.red}${padRight(f.joined ? "YES" : "NO", 7)}${c.reset} ` +
      `${f.hackReady ? c.green : c.red}${padRight(`${state.player.hacking}/${f.requiredHack}`, 10)}${c.reset} ` +
      `${f.rooted || !f.server ? c.green : c.red}${padRight(f.server ? yesNo(f.rooted) : "-", 6)}${c.reset} ` +
      `${f.backdoored || !f.server ? c.green : c.yellow}${padRight(f.server ? yesNo(f.backdoored) : "-", 6)}${c.reset} ` +
      `${c.gray}${padRight(f.blocker, 18)}${c.reset} ` +
      `${c.cyan}${padRight(f.score.toFixed(0), 8)}${c.reset}`
    );
  }
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

function yesNo(value) {
  return value ? "YES" : "NO";
}

function padRight(value, length) {
  return String(value ?? "").padEnd(length, " ");
}