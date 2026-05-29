const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const BACKDOOR_AI_STATE_FILE = "/data/backdoor-ai-state.txt";

const CONFIG = {
  refreshMs: 5000,
  autoBackdoor: true,

  targets: [
    { name: "CSEC", faction: "CyberSec", priority: 100 },
    { name: "avmnite-02h", faction: "NiteSec", priority: 90 },
    { name: "I.I.I.I", faction: "The Black Hand", priority: 80 },
    { name: "run4theh111z", faction: "BitRunners", priority: 70 },
    { name: "w0r1d_d43m0n", faction: "World Daemon", priority: 10 },
  ],
};

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.resizeTail(1000, 650);

  while (true) {
    const daemon = readJson(ns, DAEMON_STATE_FILE);
    const state = buildState(ns, daemon);

    writeJson(ns, BACKDOOR_AI_STATE_FILE, state);
    draw(ns, state);

    if (state.canUseSingularity && CONFIG.autoBackdoor) {
      await tryInstallBestBackdoor(ns, state);
    }

    await ns.sleep(CONFIG.refreshMs);
  }
}

function buildState(ns, daemon) {
  const capabilities = daemon?.capabilities ?? {};
  const canUseSingularity = capabilities.singularity === true && hasSingularityAccess(ns);

  const player = ns.getPlayer();
  const hacking = ns.getHackingLevel();

  const targets = CONFIG.targets.map(t => analyzeTarget(ns, t, hacking));
  const best = chooseBestTarget(targets);

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
    },

    bestTarget: best,
    targets,
    recommendation: getRecommendation(best, canUseSingularity),
  };
}

function analyzeTarget(ns, target, hacking) {
  let exists = false;
  let rooted = false;
  let backdoored = false;
  let requiredHack = 0;
  let path = [];

  try {
    exists = ns.serverExists(target.name);

    if (exists) {
      const server = ns.getServer(target.name);
      rooted = server.hasAdminRights;
      backdoored = server.backdoorInstalled;
      requiredHack = server.requiredHackingSkill;
      path = findPath(ns, "home", target.name);
    }
  } catch { }

  const hackReady = exists && hacking >= requiredHack;

  const blocker = getBlocker({
    exists,
    rooted,
    backdoored,
    hackReady,
    path,
  });

  return {
    name: target.name,
    faction: target.faction,
    priority: target.priority,

    exists,
    rooted,
    backdoored,
    requiredHack,
    hackReady,
    path,

    blocker,
    score: scoreTarget(target, {
      exists,
      rooted,
      backdoored,
      hackReady,
      path,
    }),
  };
}

function getBlocker(x) {
  if (!x.exists) return "SERVER_NOT_FOUND";
  if (!x.path.length) return "PATH_NOT_FOUND";
  if (!x.hackReady) return "NEED_HACKING";
  if (!x.rooted) return "NEED_ROOT";
  if (x.backdoored) return "DONE";
  return "READY_TO_BACKDOOR";
}

function scoreTarget(target, x) {
  let score = target.priority;

  if (!x.exists) score -= 100;
  if (x.hackReady) score += 20;
  if (x.rooted) score += 30;
  if (x.path.length) score += 10;
  if (x.backdoored) score -= 1000;
  if (x.blocker === "READY_TO_BACKDOOR") score += 100;

  return score;
}

function chooseBestTarget(targets) {
  return [...targets]
    .filter(t => t.blocker !== "DONE")
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

function getRecommendation(best, canUseSingularity) {
  if (!best) return "All known backdoor targets are complete or unavailable.";

  if (best.blocker === "SERVER_NOT_FOUND") return `${best.name}: server not discovered yet.`;
  if (best.blocker === "PATH_NOT_FOUND") return `${best.name}: no route found from home.`;
  if (best.blocker === "NEED_HACKING") return `${best.name}: raise hacking to ${best.requiredHack}.`;
  if (best.blocker === "NEED_ROOT") return `${best.name}: root required before backdoor.`;
  if (best.blocker === "READY_TO_BACKDOOR") {
    return canUseSingularity
      ? `${best.name}: ready. Auto-backdoor can run.`
      : `${best.name}: ready, but Singularity is unavailable. Manual backdoor needed.`;
  }

  return `${best.name}: ${best.blocker}`;
}

async function tryInstallBestBackdoor(ns, state) {
  const target = state.bestTarget;
  if (!target) return;
  if (target.blocker !== "READY_TO_BACKDOOR") return;

  try {
    ns.print(`Attempting backdoor: ${target.name}`);

    for (const server of target.path) {
      ns.singularity.connect(server);
      await ns.sleep(20);
    }

    await ns.singularity.installBackdoor();

    ns.singularity.connect("home");
    ns.tprint(`Backdoor installed on ${target.name} for ${target.faction}.`);
  } catch (err) {
    try {
      ns.singularity.connect("home");
    } catch { }

    ns.print(`Backdoor failed for ${target.name}: ${String(err)}`);
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

function draw(ns, state) {
  const c = colors();
  ns.clearLog();

  ns.print(`${c.cyan}Backdoor AI - ${state.mode}${c.reset}`);
  ns.print(`${c.gray}Daemon: ${state.daemon.mode} | ${state.daemon.priority} | ${state.daemon.target}${c.reset}`);
  ns.print(`${c.yellow}${state.recommendation}${c.reset}`);
  ns.print("");

  ns.print(`${c.gray}${padRight("Server", 16)} ${padRight("Faction", 16)} ${padRight("Root", 6)} ${padRight("BD", 6)} ${padRight("Hack", 12)} ${padRight("Blocker", 20)} ${padRight("Score", 8)}${c.reset}`);

  for (const t of state.targets) {
    ns.print(
      `${c.white}${padRight(t.name, 16)}${c.reset} ` +
      `${c.cyan}${padRight(t.faction, 16)}${c.reset} ` +
      `${t.rooted ? c.green : c.red}${padRight(yesNo(t.rooted), 6)}${c.reset} ` +
      `${t.backdoored ? c.green : c.yellow}${padRight(yesNo(t.backdoored), 6)}${c.reset} ` +
      `${t.hackReady ? c.green : c.red}${padRight(`${state.player.hacking}/${t.requiredHack}`, 12)}${c.reset} ` +
      `${c.gray}${padRight(t.blocker, 20)}${c.reset} ` +
      `${c.yellow}${padRight(t.score.toFixed(0), 8)}${c.reset}`
    );
  }

  ns.print("");
  ns.print(`${c.gray}Best path:${c.reset}`);

  if (state.bestTarget?.path?.length) {
    ns.print(`${c.green}${state.bestTarget.path.join(" -> ")}${c.reset}`);
  } else {
    ns.print(`${c.red}No path available.${c.reset}`);
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