const STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.resizeTail(1100, 800);

  const CONFIG = {
    refreshMs: 5000,
    maxRows: 18,
    maxRecent: 8,

    // Safe default: recommend always, buy only when daemon allows aug purchases.
    autoBuyWhenAllowed: true,

    fallbackReserveMoney: 1_000_000_000,

    priorityWeights: {
      hacking: 100,
      faction: 85,
      company: 45,
      charisma: 20,
      combat: 10,
      crime: 10,
      misc: 5,
    },
  };

  const state = {
    started: Date.now(),
    cycles: 0,
    daemonMode: "unknown",
    daemonPriority: "unknown",
    allowAugPurchases: false,
    reserveMoney: CONFIG.fallbackReserveMoney,
    money: 0,
    factions: [],
    ownedCount: 0,
    installedCount: 0,
    queuedCount: 0,
    options: [],
    blockers: [],
    recentActions: [],
    lastAction: "Starting augmentation planner...",
  };

  while (true) {
    const daemonState = readDaemonState(ns);
    const policy = daemonState?.spendingPolicy ?? {};

    state.cycles++;
    state.daemonMode = daemonState?.mode ?? "unknown";
    state.daemonPriority = policy.priority ?? "unknown";
    state.allowAugPurchases = policy.allowAugmentPurchases === true;
    state.reserveMoney = Number.isFinite(policy.reserveMoney)
      ? policy.reserveMoney
      : CONFIG.fallbackReserveMoney;
    state.money = ns.getPlayer().money;

    updateAugState(ns, CONFIG, state);

    drawDashboard(ns, CONFIG, state);

    if (CONFIG.autoBuyWhenAllowed && state.allowAugPurchases) {
      const best = state.options.find(x => x.affordable && x.hasRep);

      if (best && state.money - state.reserveMoney >= best.price) {
        try {
          const bought = ns.singularity.purchaseAugmentation(best.faction, best.name);
          if (bought) {
            log(state, `Bought ${best.name} from ${best.faction}`);
          }
        } catch {
          log(state, `Failed buying ${best.name}`);
        }
      }
    }

    await ns.sleep(CONFIG.refreshMs);
  }
}

function updateAugState(ns, CONFIG, state) {
  const player = ns.getPlayer();
  const owned = new Set(safeOwnedAugments(ns, true));
  const installed = new Set(safeOwnedAugments(ns, false));

  state.factions = player.factions ?? [];
  state.ownedCount = owned.size;
  state.installedCount = installed.size;
  state.queuedCount = Math.max(0, owned.size - installed.size);

  const options = [];
  const blockers = [];

  for (const faction of state.factions) {
    const factionRep = safeFactionRep(ns, faction);
    const augs = safeFactionAugs(ns, faction);

    for (const aug of augs) {
      if (owned.has(aug)) continue;

      const price = safeAugPrice(ns, aug);
      const repReq = safeAugRepReq(ns, aug);
      const stats = safeAugStats(ns, aug);

      const hasRep = factionRep >= repReq;
      const affordable = state.money - state.reserveMoney >= price;

      const score = scoreAug(CONFIG, aug, stats, price, repReq);

      const option = {
        name: aug,
        faction,
        price,
        repReq,
        factionRep,
        hasRep,
        affordable,
        stats,
        score,
        category: getAugCategory(stats, aug),
      };

      options.push(option);

      if (!hasRep || !affordable) {
        blockers.push({
          name: aug,
          faction,
          missingRep: Math.max(0, repReq - factionRep),
          missingMoney: Math.max(0, price - Math.max(0, state.money - state.reserveMoney)),
          score,
        });
      }
    }
  }

  state.options = options.sort((a, b) => b.score - a.score);
  state.blockers = blockers.sort((a, b) => b.score - a.score);
}

function scoreAug(CONFIG, name, stats, price, repReq) {
  const category = getAugCategory(stats, name);

  let multiplierScore = 0;

  for (const [key, value] of Object.entries(stats ?? {})) {
    if (typeof value !== "number") continue;
    if (value <= 1) continue;

    const gain = value - 1;

    if (key.toLowerCase().includes("hack")) multiplierScore += gain * CONFIG.priorityWeights.hacking;
    else if (key.toLowerCase().includes("faction")) multiplierScore += gain * CONFIG.priorityWeights.faction;
    else if (key.toLowerCase().includes("company")) multiplierScore += gain * CONFIG.priorityWeights.company;
    else if (key.toLowerCase().includes("charisma")) multiplierScore += gain * CONFIG.priorityWeights.charisma;
    else if (key.toLowerCase().includes("combat")) multiplierScore += gain * CONFIG.priorityWeights.combat;
    else if (key.toLowerCase().includes("crime")) multiplierScore += gain * CONFIG.priorityWeights.crime;
    else multiplierScore += gain * CONFIG.priorityWeights.misc;
  }

  const nameBonus =
    name.includes("NeuroFlux") ? 10 :
      name.toLowerCase().includes("neurotrainer") ? 40 :
        name.toLowerCase().includes("cranial") ? 50 :
          name.toLowerCase().includes("bitwire") ? 35 :
            name.toLowerCase().includes("datajack") ? 35 :
              name.toLowerCase().includes("neural") ? 45 :
                name.toLowerCase().includes("bitrunners") ? 80 :
                  name.toLowerCase().includes("black hand") ? 70 :
                    0;

  const categoryBonus =
    category === "hacking" ? 50 :
      category === "faction" ? 45 :
        category === "company" ? 15 :
          0;

  const costPenalty = Math.log10(Math.max(10, price)) * 4;
  const repPenalty = Math.log10(Math.max(10, repReq)) * 2;

  return multiplierScore + nameBonus + categoryBonus - costPenalty - repPenalty;
}

function getAugCategory(stats, name) {
  const text = `${name} ${Object.keys(stats ?? {}).join(" ")}`.toLowerCase();

  if (text.includes("hack")) return "hacking";
  if (text.includes("faction")) return "faction";
  if (text.includes("company")) return "company";
  if (text.includes("charisma")) return "charisma";
  if (text.includes("crime")) return "crime";
  if (text.includes("strength") || text.includes("defense") || text.includes("dexterity") || text.includes("agility")) return "combat";

  return "misc";
}

function drawDashboard(ns, CONFIG, state) {
  const c = colors();
  ns.clearLog();

  const allowedColor = state.allowAugPurchases ? c.green : c.red;
  const priorityColor =
    state.daemonPriority === "faction" ? c.magenta :
      state.daemonPriority === "reset-prep" ? c.red :
        state.daemonPriority === "income" ? c.green :
          state.daemonPriority === "upgrades" ? c.yellow :
            c.gray;

  printTitleBox(ns, "Augmentation Planner - Daemon Controlled", [
    `Daemon     : ${state.daemonMode} | ${state.daemonPriority}`,
    `Auto Buy   : ${state.allowAugPurchases ? "ENABLED" : "RECOMMEND ONLY"}`,
    `Last Action: ${state.lastAction}`,
  ], c);

  printAccordionSection(ns, "Augment Summary", true, [
    `${badge(c, "OWNED", state.ownedCount, c.cyan)} ` +
    `${badge(c, "INSTALLED", state.installedCount, c.green)} ` +
    `${badge(c, "QUEUED", state.queuedCount, state.queuedCount > 0 ? c.yellow : c.gray)}`,
    `${badge(c, "FACTIONS", state.factions.length, c.cyan)} ` +
    `${badge(c, "MONEY", "$" + formatNum(state.money), c.green)} ` +
    `${badge(c, "RESERVE", "$" + formatNum(state.reserveMoney), c.yellow)}`,
    `${badge(c, "AUG BUYING", state.allowAugPurchases ? "YES" : "NO", allowedColor)} ` +
    `${badge(c, "PRIORITY", state.daemonPriority, priorityColor)}`,
  ], c.cyan);

  const bestLines = [];
  bestLines.push(
    `${c.gray}${padRight("Score", 8)} ${padRight("Augmentation", 34)} ${padRight("Faction", 18)} ${padLeft("Price", 12)} ${padLeft("Rep", 12)} ${padRight("Flags", 10)}${c.reset}`
  );

  for (const option of state.options.slice(0, CONFIG.maxRows)) {
    const flags =
      `${option.affordable ? "💰" : "  "}${option.hasRep ? " REP" : " ---"}`;

    const rowColor =
      option.affordable && option.hasRep ? c.green :
        option.hasRep ? c.yellow :
          c.gray;

    bestLines.push(
      `${rowColor}${padRight(option.score.toFixed(1), 8)}${c.reset} ` +
      `${c.white}${padRight(shorten(option.name, 34), 34)}${c.reset} ` +
      `${c.cyan}${padRight(shorten(option.faction, 18), 18)}${c.reset} ` +
      `${c.green}${padLeft("$" + formatNum(option.price), 12)}${c.reset} ` +
      `${c.yellow}${padLeft(formatNum(option.repReq), 12)}${c.reset} ` +
      `${rowColor}${padRight(flags, 10)}${c.reset}`
    );
  }

  if (state.options.length === 0) {
    bestLines.push(`${c.gray}No available augmentations detected.${c.reset}`);
  }

  printAccordionSection(ns, "Best Available Augments", true, bestLines, c.cyan);

  const blockerLines = [];

  blockerLines.push(
    `${c.gray}${padRight("Augmentation", 34)} ${padRight("Faction", 18)} ${padLeft("Need Rep", 12)} ${padLeft("Need $", 12)}${c.reset}`
  );

  for (const blocker of state.blockers.slice(0, 10)) {
    blockerLines.push(
      `${c.white}${padRight(shorten(blocker.name, 34), 34)}${c.reset} ` +
      `${c.cyan}${padRight(shorten(blocker.faction, 18), 18)}${c.reset} ` +
      `${c.yellow}${padLeft(formatNum(blocker.missingRep), 12)}${c.reset} ` +
      `${c.green}${padLeft("$" + formatNum(blocker.missingMoney), 12)}${c.reset}`
    );
  }

  printAccordionSection(ns, "Top Blockers", true, blockerLines, c.yellow);

  const recent =
    state.recentActions.length === 0
      ? [`${c.gray}No purchases yet.${c.reset}`]
      : state.recentActions.slice(0, CONFIG.maxRecent).map(x => `${c.gray}${shorten(x, 90)}${c.reset}`);

  printAccordionSection(ns, "Recent Purchases", true, recent, c.cyan);
}

function safeOwnedAugments(ns, includeQueued) {
  try {
    return ns.singularity.getOwnedAugmentations(includeQueued);
  } catch {
    return [];
  }
}

function safeFactionRep(ns, faction) {
  try {
    return ns.singularity.getFactionRep(faction);
  } catch {
    return 0;
  }
}

function safeFactionAugs(ns, faction) {
  try {
    return ns.singularity.getAugmentationsFromFaction(faction);
  } catch {
    return [];
  }
}

function safeAugPrice(ns, aug) {
  try {
    return ns.singularity.getAugmentationPrice(aug);
  } catch {
    return Infinity;
  }
}

function safeAugRepReq(ns, aug) {
  try {
    return ns.singularity.getAugmentationRepReq(aug);
  } catch {
    return Infinity;
  }
}

function safeAugStats(ns, aug) {
  try {
    return ns.singularity.getAugmentationStats(aug);
  } catch {
    return {};
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

function log(state, message) {
  state.lastAction = message;
  state.recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  state.recentActions = state.recentActions.slice(0, 20);
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

function formatNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "∞";
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