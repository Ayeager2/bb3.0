const DAEMON_STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.resizeTail(1050, 750);

  const CONFIG = {
    refreshMs: 5000,
    minQueuedAugs: 10,
    goodQueuedAugs: 20,
    bn4TargetQueuedAugs: 30,
    minMoneyAfterResetGoal: 0,
    targetBitNode: 4,
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

  const ownedWithQueued = safeOwnedAugments(ns, true);
  const installed = safeOwnedAugments(ns, false);
  const queued = ownedWithQueued.filter(x => !installed.includes(x));

  const hacking = ns.getHackingLevel();
  const money = player.money;
  const homeRam = ns.getServerMaxRam("home");

  const bn4 = daemon?.bn4Readiness ?? {
    ready: false,
    readyCount: 0,
    totalChecks: 4,
    hackingReady: false,
    moneyReady: false,
    homeRamReady: false,
    augReady: false,
  };

  const resetScore = scoreReset(CONFIG, queued, bn4, money);

  return {
    daemonMode: daemon?.mode ?? "unknown",
    daemonPriority: daemon?.spendingPolicy?.priority ?? "unknown",
    daemonTarget: daemon?.target ?? "unknown",

    hacking,
    money,
    homeRam,

    installedCount: installed.length,
    ownedCount: ownedWithQueued.length,
    queued,
    queuedCount: queued.length,

    bn4,
    resetScore,
    recommendation: getRecommendation(CONFIG, queued.length, bn4, resetScore),
    blockers: getBlockers(CONFIG, queued.length, bn4),
  };
}

function scoreReset(CONFIG, queued, bn4, money) {
  let score = 0;

  score += Math.min(40, queued.length * 2);

  if (queued.length >= CONFIG.minQueuedAugs) score += 15;
  if (queued.length >= CONFIG.goodQueuedAugs) score += 15;
  if (queued.length >= CONFIG.bn4TargetQueuedAugs) score += 15;

  if (bn4.hackingReady) score += 8;
  if (bn4.moneyReady) score += 8;
  if (bn4.homeRamReady) score += 8;
  if (bn4.augReady) score += 8;
  if (bn4.ready) score += 20;

  if (money > 100_000_000_000) score += 5;

  return Math.min(100, score);
}

function getRecommendation(CONFIG, queuedCount, bn4, score) {
  if (queuedCount === 0) {
    return {
      level: "WAIT",
      text: "No queued augmentations yet. Do not reset.",
    };
  }

  if (bn4.ready && queuedCount >= CONFIG.bn4TargetQueuedAugs) {
    return {
      level: "READY",
      text: "BN4 prep looks strong. Manual install/reset is reasonable.",
    };
  }

  if (queuedCount >= CONFIG.goodQueuedAugs && score >= 70) {
    return {
      level: "GOOD",
      text: "Strong reset candidate. Consider installing after checking faction goals.",
    };
  }

  if (queuedCount >= CONFIG.minQueuedAugs) {
    return {
      level: "OK",
      text: "Reset is viable, but waiting for more augments may be better.",
    };
  }

  return {
    level: "WAIT",
    text: "Keep farming. Not enough queued augmentations yet.",
  };
}

function getBlockers(CONFIG, queuedCount, bn4) {
  const blockers = [];

  if (queuedCount < CONFIG.minQueuedAugs) {
    blockers.push(`Need at least ${CONFIG.minQueuedAugs} queued augments for a decent reset.`);
  }

  if (queuedCount < CONFIG.goodQueuedAugs) {
    blockers.push(`Better target: ${CONFIG.goodQueuedAugs}+ queued augments.`);
  }

  if (!bn4.hackingReady) blockers.push("BN4 check: hacking target not met.");
  if (!bn4.moneyReady) blockers.push("BN4 check: money target not met.");
  if (!bn4.homeRamReady) blockers.push("BN4 check: home RAM target not met.");
  if (!bn4.augReady) blockers.push("BN4 check: augment target not met.");

  return blockers;
}

function drawDashboard(ns, CONFIG, state) {
  const c = colors();
  ns.clearLog();

  const recColor =
    state.recommendation.level === "READY" ? c.green :
      state.recommendation.level === "GOOD" ? c.cyan :
        state.recommendation.level === "OK" ? c.yellow :
          c.red;

  printTitleBox(ns, "Reset Planner / Install Readiness HUD", [
    `Daemon     : ${state.daemonMode} | ${state.daemonPriority}`,
    `Target     : ${state.daemonTarget}`,
    `Decision   : ${state.recommendation.level} - ${state.recommendation.text}`,
  ], c);

  printAccordionSection(ns, "Reset Score", true, [
    `${badge(c, "SCORE", `${state.resetScore}/100`, recColor)} ` +
    `${badge(c, "RECOMMEND", state.recommendation.level, recColor)}`,
    `${recColor}${state.recommendation.text}${c.reset}`,
  ], recColor);

  printAccordionSection(ns, "Augmentation Queue", true, [
    `${badge(c, "INSTALLED", state.installedCount, c.green)} ` +
    `${badge(c, "OWNED+QUEUED", state.ownedCount, c.cyan)} ` +
    `${badge(c, "QUEUED", state.queuedCount, state.queuedCount >= CONFIG.minQueuedAugs ? c.green : c.red)}`,
    `${badge(c, "MIN RESET", CONFIG.minQueuedAugs, c.yellow)} ` +
    `${badge(c, "GOOD RESET", CONFIG.goodQueuedAugs, c.cyan)} ` +
    `${badge(c, "BN4 TARGET", CONFIG.bn4TargetQueuedAugs, c.magenta)}`,
  ], c.cyan);

  const queuedLines =
    state.queued.length === 0
      ? [`${c.gray}No queued augmentations detected.${c.reset}`]
      : state.queued.slice(0, 18).map(x => `${c.green}+ ${x}${c.reset}`);

  if (state.queued.length > 18) {
    queuedLines.push(`${c.gray}+${state.queued.length - 18} more queued augment(s) hidden${c.reset}`);
  }

  printAccordionSection(ns, "Queued Augments", true, queuedLines, c.green);

  printAccordionSection(ns, "BN4 Readiness", true, [
    checklistLine(c, "Hacking", state.bn4.hackingReady),
    checklistLine(c, "Money", state.bn4.moneyReady),
    checklistLine(c, "Home RAM", state.bn4.homeRamReady),
    checklistLine(c, "Augment Count", state.bn4.augReady),
    `${badge(c, "CHECKS", `${state.bn4.readyCount ?? 0}/${state.bn4.totalChecks ?? 4}`, state.bn4.ready ? c.green : c.yellow)} ` +
    `${badge(c, "BN4 READY", state.bn4.ready ? "YES" : "NO", state.bn4.ready ? c.green : c.red)}`,
  ], c.magenta);

  const blockerLines =
    state.blockers.length === 0
      ? [`${c.green}No major blockers detected.${c.reset}`]
      : state.blockers.map(x => `${c.yellow}${x}${c.reset}`);

  printAccordionSection(ns, "Blockers", true, blockerLines, c.yellow);

  printAccordionSection(ns, "Safety", true, [
    `${c.red}This script does NOT install augmentations.${c.reset}`,
    `${c.gray}Manual install/reset remains your final confirmation step.${c.reset}`,
  ], c.red);
}

function safeOwnedAugments(ns, includeQueued) {
  try {
    return ns.singularity.getOwnedAugmentations(includeQueued);
  } catch {
    return [];
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

function checklistLine(c, label, done) {
  return `${done ? c.green : c.red}[${done ? "✓" : " "}]${c.reset} ${label}`;
}

function printTitleBox(ns, title, lines, c) {
  const width = 104;
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