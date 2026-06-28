const STATE_FILE = "/data/gang-state.txt";

const MEMBER_NAMES = [
  "Darth Vader",
  "Joker",
  "Two-Face",
  "Warden Norton",
  "Hannibal Lecter",
  "Sauron",
  "Bane",
  "Tyler Durden",
  "Agent Smith",
  "Gollum",
  "Vincent Vega",
  "Saruman",
  "Loki",
  "Vito Corleone",
  "Balrog",
  "Palpatine",
  "Michael Corleone",
  "Talia al Ghul",
  "John Doe",
  "Scarecrow",
  "Commodus",
  "Jabba the Hutt",
  "Scar",
  "Grand Moff Tarkin",
  "Boba Fett",
  "Thanos",
  "Terminator",
  "Frank Costello",
  "Hector Barbossa",
  "Xenomorph",
];

const TRAIN_COMBAT_MIN = 350;
const TRAIN_COMBAT_AVG = 650;
const WANTED_PENALTY_FLOOR = 0.995;
const TERRITORY_TASK = "Territory Warfare";
const TERRITORY_MIN_MEMBERS = 8;
const TERRITORY_BUILD_POWER_UNTIL = 1_000_000;
const TERRITORY_CLASH_POWER_MIN = 1_000_000;
const TERRITORY_POWER_LEAD_MULT = 1.2;
const TERRITORY_MAX_BUILD_RATIO = 0.75;
const TERRITORY_CLASH_WIN_CHANCE = 0.78;
const TERRITORY_SAFE_WIN_CHANCE = 0.9;
const MONEY_TASKS = [
  {
    name: "Traffick Illegal Arms",
    minCombat: 650,
  },
  {
    name: "Armed Robbery",
    minCombat: 450,
  },
  {
    name: "Strongarm Civilians",
    minCombat: 180,
  },
  {
    name: "Mug People",
    minCombat: 25,
  },
];

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 2500],
    ["reserve", 0],
    ["create", true],
    ["faction", "Slum Snakes"],
    ["buy-equipment", true],
    ["ascend", true],
    ["asc-mult", 10],
    ["fast-asc-mult", 100],
    ["debug", true],
  ]);

  const refreshMs = Number(flags.refresh) || 2500;
  const debug = flags.debug === true;

  while (true) {
    const state = runGangCycle(ns, {
      reserve: Number(flags.reserve) || 0,
      create: flags.create === true,
      faction: String(flags.faction || "Slum Snakes"),
      buyEquipment: flags["buy-equipment"] === true,
      ascend: flags.ascend === true,
      ascMult: Number(flags["asc-mult"]) || 10,
      fastAscMult: Number(flags["fast-asc-mult"]) || 100,
    });

    writeState(ns, state);

    if (debug) {
      ns.clearLog();
      ns.print("BN2 Gang Manager");
      ns.print("===============");
      ns.print(`Status: ${state.status}`);
      ns.print(`Message: ${state.message}`);
      ns.print(`Members: ${state.memberCount}`);
      ns.print(`Respect: ${ns.format.number(state.respect ?? 0)}`);
      ns.print(`Wanted: ${ns.format.number(state.wantedLevel ?? 0)}`);
      ns.print(`Territory: ${state.territoryPolicy?.status ?? "unknown"} | ${state.territoryPolicy?.reason ?? "no territory policy"}`);
      ns.print(`Bought: ${state.boughtEquipment ?? 0} | Ascended: ${state.ascended ?? 0}`);
    }

    await ns.sleep(refreshMs);
  }
}

function runGangCycle(ns, options) {
  if (getCurrentBitNode(ns) !== 2) {
    return baseState("blocked", "Gang manager is only enabled for BN2.", {});
  }

  if (!ns.gang) {
    return baseState("blocked", "Gang API is unavailable.", {});
  }

  if (!safeInGang(ns)) {
    safeJoinGangFaction(ns, options.faction);

    const created =
      options.create === true &&
      safeCreateGang(ns, options.faction);

    if (!created) {
      return baseState("waiting-gang", `Waiting until ${options.faction} gang can be created.`, {
        money: ns.getPlayer().money,
      });
    }
  }

  const recruited = recruitMembers(ns);
  const names = safeMemberNames(ns);
  const equipmentBuyer =
    options.buyEquipment
      ? buyGangEquipment(ns, names, options.reserve)
      : {
        bought: 0,
        status: "disabled",
        message: "Gang equipment buying is disabled.",
        nextItem: null,
      };
  const ascended =
    options.ascend ? ascendGangMembers(ns, names, options) : 0;
  const territory = buildTerritoryPolicy(ns, names);
  const assignments = assignGangTasks(ns, names, territory);
  const info = safeGangInfo(ns);

  return {
    ...baseState("running", "Gang manager active.", {}),
    inGang: true,
    gang: info?.faction ?? null,
    memberCount: names.length,
    recruited,
    boughtEquipment: equipmentBuyer.bought,
    equipmentBuyer,
    ascended,
    assignments,
    territoryPolicy: territory,
    respect: info?.respect ?? 0,
    respectGainRate: info?.respectGainRate ?? 0,
    wantedLevel: info?.wantedLevel ?? 0,
    wantedLevelGainRate: info?.wantedLevelGainRate ?? 0,
    wantedPenalty: info?.wantedPenalty ?? 1,
    moneyGainRate: info?.moneyGainRate ?? 0,
    territory: info?.territory ?? 0,
    power: info?.power ?? 0,
    money: ns.getPlayer().money,
    members: names.map(name => summarizeMember(ns, name, options)),
  };
}

function recruitMembers(ns) {
  let recruited = 0;

  while (safeCanRecruit(ns)) {
    const count = safeMemberNames(ns).length;
    const name = MEMBER_NAMES[count] ?? `Operator-${count + 1}`;
    if (!safeRecruit(ns, name)) break;
    recruited++;
  }

  return recruited;
}

function buyGangEquipment(ns, names, reserve) {
  const spendable = () => Math.max(0, ns.getPlayer().money - reserve);
  const equipment = safeEquipment(ns)
    .sort((a, b) => a.cost - b.cost);
  let bought = 0;
  let nextItem = null;
  let failedItem = null;

  for (const item of equipment) {
    for (const name of names) {
      const member = safeMemberInfo(ns, name);
      if (!member) continue;
      if ((member.upgrades ?? []).includes(item.name)) continue;
      if ((member.augmentations ?? []).includes(item.name)) continue;

      if (spendable() < item.cost) {
        if (!nextItem || item.cost < nextItem.cost) {
          nextItem = {
            member: name,
            item: item.name,
            type: item.type,
            cost: item.cost,
            spendable: spendable(),
            reserve,
          };
        }
        continue;
      }

      if (safePurchaseEquipment(ns, name, item.name)) {
        bought++;
      } else if (!failedItem) {
        failedItem = {
          member: name,
          item: item.name,
          type: item.type,
          cost: item.cost,
          spendable: spendable(),
          reserve,
        };
      }
    }
  }

  return {
    bought,
    status: bought > 0 ? "bought" : nextItem ? "waiting-money" : failedItem ? "purchase-failed" : "complete",
    message: bought > 0
      ? `Bought ${bought} gang equipment/augmentation item${bought === 1 ? "" : "s"}.`
      : nextItem
        ? `Waiting for ${nextItem.member} to buy ${nextItem.item}; need ${formatMoney(nextItem.cost)}, spendable ${formatMoney(nextItem.spendable)} after ${formatMoney(reserve)} reserve.`
        : failedItem
          ? `Tried to buy ${failedItem.item} for ${failedItem.member}, but purchaseEquipment returned false. Cost ${formatMoney(failedItem.cost)}, spendable ${formatMoney(failedItem.spendable)}.`
        : "All affordable configured gang equipment is already owned.",
    nextItem,
    failedItem,
  };
}

function ascendGangMembers(ns, names, options) {
  const candidates = names
    .map(name => ({
      name,
      info: safeMemberInfo(ns, name),
      result: safeAscensionResult(ns, name),
    }))
    .filter(x => x.info && x.result)
    .filter(x => shouldAscend(x.info, x.result, options))
    .sort((a, b) => (a.info.earnedRespect ?? 0) - (b.info.earnedRespect ?? 0))
    .slice(0, Math.max(1, Math.ceil(names.length / 3)));

  let ascended = 0;

  for (const candidate of candidates) {
    if (safeAscend(ns, candidate.name)) ascended++;
  }

  return ascended;
}

function shouldAscend(info, result, options) {
  const current =
    Math.max(
      Number(info.str_asc_mult) || 1,
      Number(info.dex_asc_mult) || 1,
      Number(info.hack_asc_mult) || 1,
    );
  const projected =
    Math.max(
      Number(result.str) || 1,
      Number(result.dex) || 1,
      Number(result.hack) || 1,
    );

  if (current >= options.fastAscMult) return false;
  if (current < 2) return projected >= 1.5;
  if (current < options.ascMult) return projected >= 1.25;
  return projected >= 1.15;
}

function assignGangTasks(ns, names, territory = null) {
  const info = safeGangInfo(ns);
  const assignments = [];
  const wantedLevel = Number(info?.wantedLevel) || 0;
  const respect = Number(info?.respect) || 0;
  const wantedGain = Number(info?.wantedLevelGainRate) || 0;
  const respectGain = Number(info?.respectGainRate) || 0;
  const wantedPenalty = Number(info?.wantedPenalty) || 1;
  const needVigilante =
    wantedLevel > 10 &&
    (
      wantedPenalty < WANTED_PENALTY_FLOOR ||
      (wantedLevel > 500 && wantedGain > 0) ||
      wantedGain > respectGain / 10 ||
      wantedLevel * 10 > Math.max(1, respect)
    );

  const sorted = [...names]
    .sort((a, b) => getCombatScore(ns, b).average - getCombatScore(ns, a).average);
  const territoryNames = new Set(territory?.warriorNames ?? []);
  let vigilantes =
    needVigilante
      ? Math.max(1, Math.ceil(sorted.length * (wantedPenalty < 0.98 ? 0.5 : 0.25)))
      : 0;

  for (const name of sorted) {
    const member = safeMemberInfo(ns, name);
    if (!member) continue;

    let task = "Train Combat";
    const combat = getMemberCombat(member);
    const shouldTrain =
      combat.minimum < TRAIN_COMBAT_MIN ||
      (
        combat.average < TRAIN_COMBAT_AVG &&
        (member.upgrades?.length ?? 0) < 6
      );

    if (vigilantes > 0) {
      task = "Vigilante Justice";
      vigilantes--;
    } else if (shouldTrain) {
      task = "Train Combat";
    } else if (territoryNames.has(name)) {
      task = TERRITORY_TASK;
    } else {
      task = chooseMoneyTask(combat.average);
    }

    task = setBestAvailableTask(ns, name, task);
    assignments.push({ name, task });
  }

  return assignments;
}

function buildTerritoryPolicy(ns, names) {
  const info = safeGangInfo(ns);
  const otherGangs = safeOtherGangInfo(ns);
  const territory = Number(info?.territory) || 0;
  const power = Number(info?.power) || 0;
  const memberCount = names.length;
  const chance = getTerritoryWinChance(ns, info, otherGangs);
  const lowestWinChance = chance.lowestWinChance;
  const sorted = [...names]
    .sort((a, b) => getCombatScore(ns, b).average - getCombatScore(ns, a).average);

  const complete =
    territory >= 0.99;
  const enoughMembers =
    memberCount >= TERRITORY_MIN_MEMBERS;
  const shouldBuildPower =
    !complete &&
    enoughMembers &&
    (
      power < TERRITORY_BUILD_POWER_UNTIL ||
      lowestWinChance === null ||
      lowestWinChance < TERRITORY_SAFE_WIN_CHANCE
    );
  const safeToClash =
    !complete &&
    enoughMembers &&
    power >= TERRITORY_CLASH_POWER_MIN &&
    lowestWinChance !== null &&
    lowestWinChance >= TERRITORY_CLASH_WIN_CHANCE;
  const strongestRivalPower =
    chance.strongestRivalPower;
  const targetPower =
    Math.max(
      TERRITORY_BUILD_POWER_UNTIL,
      strongestRivalPower * TERRITORY_POWER_LEAD_MULT
    );
  const warriorCount =
    shouldBuildPower || safeToClash
      ? getTerritoryWarriorCount(memberCount, {
        power,
        targetPower,
        safeToClash,
        verySafe: lowestWinChance !== null && lowestWinChance >= TERRITORY_SAFE_WIN_CHANCE,
      })
      : 0;
  const warriorNames =
    sorted.slice(0, warriorCount);

  const clashEnabled =
    safeToClash;
  const clashSet =
    safeSetTerritoryWarfare(ns, clashEnabled);

  return {
    active: shouldBuildPower || safeToClash,
    status: complete
      ? "complete"
      : !enoughMembers
        ? "waiting-members"
        : safeToClash
          ? "clashing"
          : shouldBuildPower
            ? "building-power"
            : "idle",
    reason: complete
      ? "Territory is effectively complete."
      : !enoughMembers
        ? `Need ${TERRITORY_MIN_MEMBERS} members before territory warfare.`
        : safeToClash
          ? `Clash enabled: lowest win chance ${(lowestWinChance * 100).toFixed(1)}%, power ${formatNumber(power)}.`
          : shouldBuildPower
            ? `Building gang power before clashes. Power ${formatNumber(power)} / target ${formatNumber(targetPower)}, lowest win chance ${lowestWinChance === null ? "unknown" : `${(lowestWinChance * 100).toFixed(1)}%`}.`
            : "Territory warfare idle.",
    territory,
    power,
    memberCount,
    warriorCount,
    warriorNames,
    clashEnabled,
    clashSet,
    lowestWinChance,
    strongestRivalPower,
    targetPower,
    winChances: chance.chances,
    thresholds: {
      minMembers: TERRITORY_MIN_MEMBERS,
      buildPowerUntil: TERRITORY_BUILD_POWER_UNTIL,
      clashPowerMin: TERRITORY_CLASH_POWER_MIN,
      powerLeadMult: TERRITORY_POWER_LEAD_MULT,
      maxBuildRatio: TERRITORY_MAX_BUILD_RATIO,
      clashWinChance: TERRITORY_CLASH_WIN_CHANCE,
      safeWinChance: TERRITORY_SAFE_WIN_CHANCE,
    },
  };
}

function getTerritoryWarriorCount(memberCount, { power, targetPower, safeToClash, verySafe }) {
  if (memberCount <= 0) return 0;
  if (safeToClash && verySafe) return Math.max(2, Math.ceil(memberCount * 0.25));
  if (safeToClash) return Math.max(3, Math.ceil(memberCount * 0.33));

  const safeTarget =
    Math.max(1, Number(targetPower) || TERRITORY_BUILD_POWER_UNTIL);
  const powerRatio =
    Math.max(0, Math.min(1, (Number(power) || 0) / safeTarget));
  const buildRatio =
    Math.max(0.25, Math.min(TERRITORY_MAX_BUILD_RATIO, 1 - powerRatio));

  return Math.max(2, Math.ceil(memberCount * buildRatio));
}

function getTerritoryWinChance(ns, info, otherGangs) {
  const ownFaction = info?.faction ?? "";
  const chances = [];

  for (const gangName of Object.keys(otherGangs ?? {})) {
    if (gangName === ownFaction) continue;

    const chance = safeChanceToWinClash(ns, gangName);
    if (chance === null) continue;

    chances.push({
      gang: gangName,
      chance,
      power: Number(otherGangs?.[gangName]?.power) || 0,
      territory: Number(otherGangs?.[gangName]?.territory) || 0,
    });
  }

  const lowestWinChance =
    chances.length > 0
      ? Math.min(...chances.map(item => item.chance))
      : null;
  const strongestRivalPower =
    chances.length > 0
      ? Math.max(...chances.map(item => item.power))
      : 0;

  return {
    lowestWinChance,
    strongestRivalPower,
    chances: chances.sort((a, b) => a.chance - b.chance),
  };
}

function getCombatScore(ns, name) {
  const member = safeMemberInfo(ns, name);
  if (!member) return { average: 0, minimum: 0 };
  return getMemberCombat(member);
}

function getMemberCombat(member) {
  const values = [
    Number(member.str) || 0,
    Number(member.def) || 0,
    Number(member.dex) || 0,
    Number(member.agi) || 0,
  ];

  return {
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    minimum: Math.min(...values),
  };
}

function chooseMoneyTask(combatAverage) {
  const task =
    MONEY_TASKS.find(candidate => combatAverage >= candidate.minCombat);

  return task?.name ?? "Mug People";
}

function setBestAvailableTask(ns, name, preferredTask) {
  const fallbacks = [
    preferredTask,
    "Strongarm Civilians",
    "Mug People",
    "Train Combat",
  ];

  for (const task of fallbacks) {
    if (task && safeSetTask(ns, name, task)) return task;
  }

  return safeMemberInfo(ns, name)?.task ?? preferredTask;
}

function safeEquipment(ns) {
  try {
    return ns.gang.getEquipmentNames().map(name => ({
      name,
      type: ns.gang.getEquipmentType(name),
      cost: ns.gang.getEquipmentCost(name),
    }));
  } catch {
    return [];
  }
}

function formatMoney(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}t`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}b`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}k`;
  return `$${n.toFixed(0)}`;
}

function formatNumber(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}t`;
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(2);
}

function summarizeMember(ns, name, options) {
  const info = safeMemberInfo(ns, name) ?? {};
  const ascensionResult = safeAscensionResult(ns, name);
  const combat = getMemberCombat(info);
  const ascension = getAscensionReadiness(info, ascensionResult, options);

  return {
    name,
    task: info.task ?? "",
    earnedRespect: info.earnedRespect ?? 0,
    moneyGain: info.moneyGain ?? 0,
    respectGain: info.respectGain ?? 0,
    wantedLevelGain: info.wantedLevelGain ?? 0,
    str: info.str ?? 0,
    def: info.def ?? 0,
    dex: info.dex ?? 0,
    agi: info.agi ?? 0,
    hack: info.hack ?? 0,
    combatAverage: combat.average,
    combatMinimum: combat.minimum,
    strAsc: info.str_asc_mult ?? 1,
    defAsc: info.def_asc_mult ?? 1,
    dexAsc: info.dex_asc_mult ?? 1,
    agiAsc: info.agi_asc_mult ?? 1,
    hackAsc: info.hack_asc_mult ?? 1,
    ascension,
  };
}

function getAscensionReadiness(info, result, options) {
  const current =
    Math.max(
      Number(info.str_asc_mult) || 1,
      Number(info.def_asc_mult) || 1,
      Number(info.dex_asc_mult) || 1,
      Number(info.agi_asc_mult) || 1,
      Number(info.hack_asc_mult) || 1,
    );
  const projected =
    Math.max(
      Number(result?.str) || 1,
      Number(result?.def) || 1,
      Number(result?.dex) || 1,
      Number(result?.agi) || 1,
      Number(result?.hack) || 1,
    );
  const threshold =
    current >= options.fastAscMult
      ? Infinity
      : current < 2
        ? 1.5
        : current < options.ascMult
          ? 1.25
          : 1.15;
  const progress =
    Number.isFinite(threshold)
      ? Math.max(0, Math.min(1, projected / threshold))
      : 0;

  return {
    current,
    projected,
    threshold: Number.isFinite(threshold) ? threshold : null,
    progress,
    ready: Number.isFinite(threshold) && projected >= threshold,
    result: result ?? null,
  };
}

function baseState(status, message, extra) {
  return {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: "gang-manager-service",
    status,
    message,
    ...extra,
  };
}

function writeState(ns, state) {
  try {
    ns.write(STATE_FILE, JSON.stringify(state, null, 2), "w");
  } catch {
    // Telemetry should not stop gang control.
  }
}

function getCurrentBitNode(ns) {
  try {
    return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
  } catch {
    return 1;
  }
}

function safeInGang(ns) {
  try {
    return ns.gang.inGang();
  } catch {
    return false;
  }
}

function safeCreateGang(ns, faction) {
  try {
    return ns.gang.createGang(faction);
  } catch {
    return false;
  }
}

function safeJoinGangFaction(ns, faction) {
  try {
    const invites = ns.singularity?.checkFactionInvitations?.() ?? [];
    if (invites.includes(faction)) {
      ns.singularity.joinFaction(faction);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function safeGangInfo(ns) {
  try {
    return ns.gang.getGangInformation();
  } catch {
    return null;
  }
}

function safeMemberNames(ns) {
  try {
    return ns.gang.getMemberNames();
  } catch {
    return [];
  }
}

function safeMemberInfo(ns, name) {
  try {
    return ns.gang.getMemberInformation(name);
  } catch {
    return null;
  }
}

function safeCanRecruit(ns) {
  try {
    return ns.gang.canRecruitMember();
  } catch {
    return false;
  }
}

function safeRecruit(ns, name) {
  try {
    return ns.gang.recruitMember(name);
  } catch {
    return false;
  }
}

function safePurchaseEquipment(ns, name, equipment) {
  try {
    return ns.gang.purchaseEquipment(name, equipment);
  } catch {
    return false;
  }
}

function safeAscensionResult(ns, name) {
  try {
    return ns.gang.getAscensionResult(name);
  } catch {
    return null;
  }
}

function safeAscend(ns, name) {
  try {
    return !!ns.gang.ascendMember(name);
  } catch {
    return false;
  }
}

function safeSetTask(ns, name, task) {
  try {
    return ns.gang.setMemberTask(name, task);
  } catch {
    return false;
  }
}

function safeOtherGangInfo(ns) {
  try {
    return ns.gang.getOtherGangInformation() ?? {};
  } catch {
    return {};
  }
}

function safeChanceToWinClash(ns, gangName) {
  try {
    const chance = ns.gang.getChanceToWinClash(gangName);
    return Number.isFinite(chance) ? chance : null;
  } catch {
    return null;
  }
}

function safeSetTerritoryWarfare(ns, enabled) {
  try {
    ns.gang.setTerritoryWarfare(enabled === true);
    return true;
  } catch {
    return false;
  }
}
