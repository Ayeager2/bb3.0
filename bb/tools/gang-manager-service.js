const STATE_FILE = "/data/gang-state.txt";
const MODE_FILE = "/data/gang-mode.txt";
const TASK_OVERRIDE_FILE = "/data/gang-task-overrides.txt";
const ASCEND_REQUEST_FILE = "/data/gang-ascend-request.txt";
const ASCEND_STATE_FILE = "/data/gang-ascend-state.txt";
const DIAGNOSTIC_VERSION = "gang-ascend-1-5-v12";
const ASCENSION_GAIN_THRESHOLD = 1.5;
const GANG_MODE_BALANCED = "balanced";
const GANG_MODE_OLD_LOGIC = "old-logic";
const GANG_MODE_MONEY_ONLY = "money-only";
const GANG_MODE_COMBAT_TRAIN_ONLY = "combat-train-only";
const GANG_MODE_CUSTOM = "custom";
const GANG_MODES = [
  GANG_MODE_BALANCED,
  GANG_MODE_OLD_LOGIC,
  GANG_MODE_MONEY_ONLY,
  GANG_MODE_COMBAT_TRAIN_ONLY,
  GANG_MODE_CUSTOM,
];
const GANG_TICKS_PER_SECOND = 5;

const MEMBER_NAME_PREFIX = "Operator";
const STRIKE_TEAM_NAMES = [
  "Operator-1",
  "Operator-2",
  "Operator-3",
  "Operator-4",
  "Operator-5",
];
const STRIKE_TEAM_STR_DEF_MIN = 100000;
const SUPPORT_TRAIN_COMBAT_MIN = 1000;
const SUPPORT_TRAIN_COMBAT_AVG = 5000;
const TERRITORY_STRIKE_TEAM_SIZE = 5;
const WANTED_PENALTY_SOFT_FLOOR = 0.90;
const WANTED_PENALTY_HARD_FLOOR = 0.75;
const WANTED_PENALTY_CRITICAL_FLOOR = 0.50;
const WANTED_PENALTY_EMERGENCY_FLOOR = 0.25;
const TERRITORY_TASK = "Territory Warfare";
const TERRITORY_MIN_MEMBERS = 1;
const TERRITORY_CLASH_WIN_CHANCE = 0.99;
const GANG_FACTIONS = [
  "Slum Snakes",
  "Tetrads",
  "The Syndicate",
  "The Dark Army",
  "Speakers for the Dead",
  "The Black Hand",
  "NiteSec",
];
const MONEY_TASKS = [
  {
    name: "Traffick Illegal Arms",
    minCombat: 5000,
  },
  {
    name: "Armed Robbery",
    minCombat: 2500,
  },
  {
    name: "Strongarm Civilians",
    minCombat: 1000,
  },
  {
    name: "Mug People",
    minCombat: 25,
  },
];
let cycleCache = null;
let previousTerritorySnapshot = null;
let lastAscendRequestId = null;

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
    ["mode", "auto"],
    ["debug", false],
  ]);

  const refreshMs = Number(flags.refresh) || 2500;
  const debug = flags.debug === true;

  while (true) {
    const state = await runGangCycle(ns, {
      reserve: Number(flags.reserve) || 0,
      create: flags.create === true,
      faction: String(flags.faction || "Slum Snakes"),
      buyEquipment: flags["buy-equipment"] === true,
      ascend: flags.ascend === true,
      ascMult: Number(flags["asc-mult"]) || 10,
      fastAscMult: Number(flags["fast-asc-mult"]) || 100,
      mode: String(flags.mode ?? "auto"),
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

function processManualAscendRequest(ns, names) {
  const request =
    readJson(ns, ASCEND_REQUEST_FILE, null);

  if (!request?.id || request.id === lastAscendRequestId) {
    return readJson(ns, ASCEND_STATE_FILE, null);
  }

  lastAscendRequestId = request.id;

  const requested =
    String(request.member ?? "").trim();
  const member =
    findGangMemberName(names, requested);

  if (!member) {
    return writeAscendState(ns, {
      status: "error",
      message: `Cannot ascend: ${requested || "unknown member"} was not found.`,
      request,
      requested,
      members: names,
      ascended: false,
    });
  }

  const before =
    safeMemberInfo(ns, member);
  const projected =
    safeAscensionResult(ns, member);
  const result =
    safeAscendRaw(ns, member);

  invalidateMemberInfoCache();

  return writeAscendState(ns, {
    status: result ? "success" : "error",
    message: result ? `Ascended ${member}.` : `Ascend failed for ${member}.`,
    request,
    requested,
    member,
    before,
    projected,
    result,
    ascended: !!result,
  });
}

function findGangMemberName(names, requested) {
  const exact =
    names.find(name => name === requested);
  if (exact) return exact;

  const wanted =
    String(requested ?? "").toLowerCase();

  return names.find(name => String(name).toLowerCase() === wanted) ?? null;
}

function writeAscendState(ns, state) {
  const next = {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: "gang-manager-service",
    ...state,
  };

  try {
    ns.write(ASCEND_STATE_FILE, JSON.stringify(next, null, 2), "w");
  } catch {
    // Ascend telemetry should not stop gang control.
  }

  return next;
}

async function runGangCycle(ns, options) {
  cycleCache = createCycleCache();

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
  const manualAscend =
    processManualAscendRequest(ns, names);
  const mode = getGangMode(ns, options.mode);
  const storedTaskOverrides = getTaskOverrides(ns);
  const taskOverrides =
    mode === GANG_MODE_CUSTOM
      ? storedTaskOverrides
      : {};
  const equipmentBuyer =
    options.buyEquipment
      ? buyGangEquipment(ns, names, options.reserve)
      : {
        bought: 0,
        status: "disabled",
        message: "Gang equipment buying is disabled.",
        nextItem: null,
      };
  const autoAscended =
    options.ascend
      ? mode === GANG_MODE_OLD_LOGIC
        ? ascendGangMembersOldLogic(ns, names, options)
        : ascendGangMembers(ns, names, options)
      : 0;
  const ascended =
    autoAscended + (manualAscend?.ascended ? 1 : 0);
  const territory =
    mode === GANG_MODE_BALANCED
      ? buildTerritoryPolicy(ns, names)
      : buildInactiveTerritoryPolicy(ns, mode);
  const wantedPolicy =
    mode === GANG_MODE_OLD_LOGIC
      ? buildOldWantedPolicy(safeGangInfo(ns), names.length)
      : buildWantedPolicy(safeGangInfo(ns), names.length);
  const assignments = assignGangTasks(ns, names, territory, wantedPolicy, mode, taskOverrides);

  // Let Bitburner recalculate gang production after task changes before publishing telemetry.
  // Without this, the dashboard can show the previous task mix while the in-game Gang page
  // has already refreshed to the new money/respect/wanted rates.
  await ns.sleep(50);

  invalidateMemberInfoCache();
  invalidateGangInfoCache();
  const info = safeGangInfo(ns);
  const territoryDelta = getTerritoryDelta(info);

  return {
    ...baseState("running", "Gang manager active.", {}),
    inGang: true,
    gang: info?.faction ?? null,
    mode,
    modeLabel: getGangModeLabel(mode),
    availableModes: GANG_MODES,
    taskOverrides,
    memberCount: names.length,
    recruited,
    boughtEquipment: equipmentBuyer.bought,
    equipmentBuyer,
    ascended,
    autoAscended,
    manualAscend,
    assignments,
    wantedPolicy,
    territoryPolicy: territory,
    territoryDelta,
    respect: info?.respect ?? 0,
    respectGainRate: info?.respectGainRate ?? 0,
    respectGainPerSecond: (info?.respectGainRate ?? 0) * GANG_TICKS_PER_SECOND,
    wantedLevel: info?.wantedLevel ?? 0,
    wantedLevelGainRate: info?.wantedLevelGainRate ?? 0,
    wantedLevelGainPerSecond: (info?.wantedLevelGainRate ?? 0) * GANG_TICKS_PER_SECOND,
    wantedPenalty: info?.wantedPenalty ?? 1,
    wantedPenaltyLossPercent: (1 - (info?.wantedPenalty ?? 1)) * 100,
    moneyGainRate: info?.moneyGainRate ?? 0,
    moneyGainPerSecond: (info?.moneyGainRate ?? 0) * GANG_TICKS_PER_SECOND,
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
    const name = `${MEMBER_NAME_PREFIX}-${count + 1}`;
    if (!safeRecruit(ns, name)) break;
    invalidateMemberNameCache();
    recruited++;
  }

  return recruited;
}

function buyGangEquipment(ns, names, reserve) {
  const spendable = () => Math.max(0, ns.getPlayer().money - reserve);
  const equipment = safeEquipment(ns)
    .sort((a, b) => a.cost - b.cost);
  const buyerNames =
    getGangEquipmentBuyerNames(ns, names, equipment.map(item => item.name));
  let bought = 0;
  let nextItem = null;
  let failedItem = null;

  for (const item of equipment) {
    for (const name of buyerNames.names) {
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
    targetScope: buyerNames.scope,
    targetNames: buyerNames.names,
    strikeTeamReady: buyerNames.strikeTeamReady,
    status: bought > 0 ? "bought" : nextItem ? "waiting-money" : failedItem ? "purchase-failed" : "complete",
    message: bought > 0
      ? `Bought ${bought} gang equipment/augmentation item${bought === 1 ? "" : "s"} for ${buyerNames.scope}.`
      : nextItem
        ? `Waiting for ${nextItem.member} to buy ${nextItem.item}; need ${formatMoney(nextItem.cost)}, spendable ${formatMoney(nextItem.spendable)} after ${formatMoney(reserve)} reserve.`
        : failedItem
          ? `Tried to buy ${failedItem.item} for ${failedItem.member}, but purchaseEquipment returned false. Cost ${formatMoney(failedItem.cost)}, spendable ${formatMoney(failedItem.spendable)}.`
          : "All affordable configured gang equipment is already owned.",
    nextItem,
    failedItem,
  };
}

function getGangEquipmentBuyerNames(ns, names, equipmentNames) {
  const sorted = [...names]
    .sort((a, b) => getCombatScore(ns, b).average - getCombatScore(ns, a).average);

  return {
    scope: "whole gang",
    names: sorted,
    strikeTeamReady: sorted.length > 0 &&
      sorted.every(name => getMemberEquipmentCompletion(ns, name, equipmentNames).complete),
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

function ascendGangMembersOldLogic(ns, names, options) {
  const members =
    names
      .map(name => safeMemberInfo(ns, name))
      .filter(Boolean);
  const equipmentNames =
    safeEquipment(ns)
      .filter(item => item.type !== "Augmentation")
      .map(item => item.name);
  const minStrengthAsc =
    members.length > 0
      ? Math.min(...members.map(member => Number(member.str_asc_mult) || 1))
      : 1;
  const expectedStrengthAsc =
    Math.min(minStrengthAsc + 2, Number(options.fastAscMult) || 100);
  const earlyAscension =
    minStrengthAsc < 2;
  const maxAscensions =
    Math.min(5, Math.max(1, Math.ceil(names.length / 3)));
  const candidates =
    members
      .filter(member => (Number(member.str_asc_mult) || 1) < expectedStrengthAsc)
      .filter(member => {
        const upgrades =
          Array.isArray(member.upgrades) ? member.upgrades : [];
        if (earlyAscension) return upgrades.length > 10;
        return equipmentNames.length === 0 || upgrades.length >= equipmentNames.length;
      })
      .sort((a, b) => (a.earnedRespect ?? 0) - (b.earnedRespect ?? 0))
      .slice(0, maxAscensions);

  let ascended = 0;

  for (const member of candidates) {
    if (safeAscend(ns, member.name)) ascended++;
  }

  return ascended;
}

function shouldAscend(info, result, options) {
  const projected =
    Math.max(
      Number(result.str) || 1,
      Number(result.dex) || 1,
      Number(result.hack) || 1,
    );

  return projected >= ASCENSION_GAIN_THRESHOLD;
}

function buildWantedPolicy(info, memberCount) {
  const wantedLevel = Number(info?.wantedLevel) || 0;
  const wantedGain = Number(info?.wantedLevelGainRate) || 0;
  const respectGain = Number(info?.respectGainRate) || 0;
  const wantedPenalty = Number(info?.wantedPenalty) || 1;
  const count =
    Math.max(0, Number(memberCount) || 0);
  let status =
    count > 0 ? "money-training" : "no-members";
  let reason =
    count > 0
      ? "Wanted penalty is healthy enough; keep members on the train/money split."
      : "No gang members available for wanted control.";
  let vigilanteCount = 0;
  let borrowStrikeTeam = false;

  if (count > 0 && wantedPenalty < WANTED_PENALTY_EMERGENCY_FLOOR) {
    status = "emergency-control";
    vigilanteCount = Math.max(1, Math.ceil(count * 0.80));
    borrowStrikeTeam = true;
    reason =
      `Wanted penalty ${(wantedPenalty * 100).toFixed(1)}% is wrecking production; most members reduce wanted until recovery.`;
  } else if (count > 0 && wantedPenalty < WANTED_PENALTY_CRITICAL_FLOOR) {
    status = "critical-control";
    vigilanteCount = Math.max(1, Math.ceil(count * 0.60));
    borrowStrikeTeam = true;
    reason =
      `Wanted penalty ${(wantedPenalty * 100).toFixed(1)}% is critical; heavy wanted control enabled.`;
  } else if (count > 0 && wantedPenalty < WANTED_PENALTY_HARD_FLOOR) {
    status = "hard-control";
    vigilanteCount = Math.max(1, Math.ceil(count * 0.40));
    reason =
      `Wanted penalty ${(wantedPenalty * 100).toFixed(1)}% is below the hard floor; support members reduce wanted.`;
  } else if (count > 0 && wantedPenalty < WANTED_PENALTY_SOFT_FLOOR) {
    status = "soft-control";
    vigilanteCount = Math.max(1, Math.ceil(count * 0.25));
    reason =
      `Wanted penalty ${(wantedPenalty * 100).toFixed(1)}% is below the soft floor; light wanted control enabled.`;
  }

  return {
    active: vigilanteCount > 0,
    status,
    reason,
    vigilanteCount,
    borrowStrikeTeam,
    wantedLevel,
    wantedGain,
    respectGain,
    wantedPenalty,
    thresholds: {
      strikeTeamStrDefMin: STRIKE_TEAM_STR_DEF_MIN,
      softPenalty: WANTED_PENALTY_SOFT_FLOOR,
      hardPenalty: WANTED_PENALTY_HARD_FLOOR,
      criticalPenalty: WANTED_PENALTY_CRITICAL_FLOOR,
      emergencyPenalty: WANTED_PENALTY_EMERGENCY_FLOOR,
    },
  };
}

function buildOldWantedPolicy(info, memberCount) {
  const wantedLevel = Number(info?.wantedLevel) || 0;
  const wantedGain = Number(info?.wantedLevelGainRate) || 0;
  const respectGain = Number(info?.respectGainRate) || 0;
  const respect = Number(info?.respect) || 0;
  const wantedPenalty = Number(info?.wantedPenalty) || 1;
  const count = Math.max(0, Number(memberCount) || 0);
  const wantToReduceWanted =
    count > 0 &&
    wantedLevel > 10 &&
    (
      (wantedGain > 0 && respectGain < wantedGain * 10) ||
      wantedLevel * 10 > respect
    );
  const vigilanteCount =
    wantToReduceWanted
      ? Math.max(1, Math.ceil(count / 3))
      : 0;

  return {
    active: vigilanteCount > 0,
    status: wantToReduceWanted ? "old-logic-control" : "old-logic-money",
    reason: wantToReduceWanted
      ? "Old Logic: wanted pressure is high, so about one third of the gang runs Vigilante Justice."
      : "Old Logic: wanted pressure is acceptable, so members split between Terrorism, arms trafficking, and fallback crime.",
    vigilanteCount,
    borrowStrikeTeam: true,
    wantedLevel,
    wantedGain,
    respectGain,
    wantedPenalty,
    respect,
    thresholds: {
      oldWantedLevel: 10,
      oldRespectRatio: 10,
    },
  };
}

function assignGangTasks(ns, names, territory = null, wantedPolicy = null, mode = GANG_MODE_BALANCED, taskOverrides = {}) {
  if (mode === GANG_MODE_OLD_LOGIC) {
    return assignOldLogicTasks(ns, names, wantedPolicy);
  }

  const assignments = [];

  if (mode === GANG_MODE_COMBAT_TRAIN_ONLY) {
    for (const name of names) {
      assignments.push({
        name,
        task: setBestAvailableTask(ns, name, "Train Combat"),
      });
    }

    return assignments;
  }

  const sorted = [...names]
    .sort((a, b) => getCombatScore(ns, b).average - getCombatScore(ns, a).average);
  const allowTerritoryTasks =
    territory?.territoryTaskAllowed === true &&
    (territory?.warriorCount ?? 0) > 0;
  const territoryNames =
    allowTerritoryTasks
      ? new Set(territory?.warriorNames ?? [])
      : new Set();
  const strikeTeamNames =
    new Set(territory?.strikeTeamNames ?? getStrikeTeamNames(names));
  const territoryTrainingNames =
    new Set(territory?.trainingNames ?? []);
  const wantedControlNames =
    getWantedControlNames(ns, sorted, strikeTeamNames, wantedPolicy);

  for (const name of sorted) {
    const member = safeMemberInfo(ns, name);
    if (!member) continue;

    let task = "Train Combat";
    const combat = getMemberCombat(member);
    const shouldTrainStrikeTeam =
      !hasStrikeTeamDurability(member);
    const shouldSupportTrain =
      combat.minimum < SUPPORT_TRAIN_COMBAT_MIN ||
      combat.average < SUPPORT_TRAIN_COMBAT_AVG;

    if (mode === GANG_MODE_CUSTOM && taskOverrides[name]) {
      task = taskOverrides[name];
    } else if (mode === GANG_MODE_MONEY_ONLY || mode === GANG_MODE_CUSTOM) {
      if (wantedControlNames.has(name)) {
        task = "Vigilante Justice";
      } else {
        task = chooseMoneyTask(combat.average);
      }
    } else if (territoryNames.has(name)) {
      task = TERRITORY_TASK;
    } else if (wantedControlNames.has(name)) {
      task = "Vigilante Justice";
    } else if (territoryTrainingNames.has(name)) {
      task = "Train Combat";
    } else if (strikeTeamNames.has(name) && shouldTrainStrikeTeam) {
      task = "Train Combat";
    } else if (shouldSupportTrain) {
      task = "Train Combat";
    } else {
      task = chooseMoneyTask(combat.average);
    }

    task = setBestAvailableTask(ns, name, task);
    assignments.push({ name, task });
  }

  return mode === GANG_MODE_CUSTOM
    ? applyTaskOverrides(ns, assignments, taskOverrides)
    : assignments;
}

function applyTaskOverrides(ns, assignments, taskOverrides = {}) {
  if (!taskOverrides || Object.keys(taskOverrides).length === 0) return assignments;

  return assignments.map(assignment => {
    const override =
      String(taskOverrides[assignment.name] ?? "").trim();
    if (!override) return assignment;

    return {
      name: assignment.name,
      task: setBestAvailableTask(ns, assignment.name, override),
      override: true,
    };
  });
}

function assignOldLogicTasks(ns, names, wantedPolicy = null) {
  const info = safeGangInfo(ns);
  const memberCount = names.length;
  const wantedTarget =
    Math.max(0, Math.ceil(Number(wantedPolicy?.vigilanteCount) || 0));
  const terrorismDividerRate =
    Number(info?.wantedLevel) > Number(info?.respect) ||
      Number(info?.respect) < 2_500_000
      ? 2
      : 4;
  let wantedRemaining =
    wantedTarget;
  let terrorismRemaining =
    Math.ceil(Math.max(0, memberCount - wantedTarget) / terrorismDividerRate);
  let traffickRemaining =
    Math.max(0, memberCount - wantedTarget - terrorismRemaining);
  const sorted =
    [...names].sort((a, b) => {
      const aInfo = safeMemberInfo(ns, a) ?? {};
      const bInfo = safeMemberInfo(ns, b) ?? {};
      return getOldVigilanteAbility(bInfo) - getOldVigilanteAbility(aInfo) ||
        getOldTerrorismAbility(bInfo) - getOldTerrorismAbility(aInfo) ||
        compareGangMemberNames(a, b);
    });
  const assignments = [];

  for (const name of sorted) {
    const member = safeMemberInfo(ns, name);
    if (!member) continue;

    const terrorismAbility = getOldTerrorismAbility(member);
    const isTerrorismRisky =
      terrorismAbility > 620 && terrorismAbility < 710;
    let task;

    if (wantedRemaining > 0) {
      task = "Vigilante Justice";
      wantedRemaining--;
    } else if (!isTerrorismRisky && terrorismRemaining > 0) {
      task = "Terrorism";
      terrorismRemaining--;
    } else if (terrorismAbility > 800 && traffickRemaining > 0) {
      task = "Traffick Illegal Arms";
      traffickRemaining--;
    } else if (memberCount < 30 && (Number(member.str) || 0) > 20 && (Number(member.str) || 0) < 120) {
      task = "Mug People";
    } else if (isTerrorismRisky) {
      if ((Number(member.str) || 0) > 120) {
        task = "Strongarm Civilians";
      } else if ((Number(member.str) || 0) > 20) {
        task = "Mug People";
      } else {
        task = "Vigilante Justice";
      }
    } else {
      task = "Terrorism";
    }

    task = setBestAvailableTask(ns, name, task);
    assignments.push({ name, task });
  }

  return assignments;
}

function getOldTerrorismAbility(member) {
  return (
    (Number(member.hack) || 0) +
    (Number(member.str) || 0) +
    (Number(member.def) || 0) +
    (Number(member.dex) || 0) +
    (Number(member.cha) || 0)
  );
}

function getOldVigilanteAbility(member) {
  return (
    (Number(member.hack) || 0) +
    (Number(member.str) || 0) +
    (Number(member.def) || 0) +
    (Number(member.dex) || 0) +
    (Number(member.agi) || 0)
  );
}

function buildInactiveTerritoryPolicy(ns, mode) {
  const failClosedSet = safeSetTerritoryWarfare(ns, false);
  const info = safeGangInfo(ns);
  const otherGangs = safeOtherGangInfo(ns);
  const chance = getTerritoryWinChance(ns, info, otherGangs);

  return {
    active: false,
    status: mode === GANG_MODE_OLD_LOGIC ? "old-logic-disabled" : "money-only-disabled",
    reason: mode === GANG_MODE_OLD_LOGIC
      ? "Old Logic mode does not assign territory warfare; it follows the original money/respect/wanted task split."
      : "Money Only mode disables territory warfare and training so members focus on cash and wanted control.",
    territory: Number(info?.territory) || 0,
    power: Number(info?.power) || 0,
    warriorCount: 0,
    warriorNames: [],
    trainingCount: 0,
    trainingNames: [],
    respectCount: 0,
    territoryTaskAllowed: false,
    clashEnabled: false,
    clashSet: failClosedSet,
    failClosedSet,
    lowestWinChance: chance.lowestWinChance,
    allRivalsChecked: chance.chances.length > 0,
    allRivalsReady: false,
    unsafeRivals: chance.chances,
    strongestRivalPower: chance.strongestRivalPower,
    winChances: chance.chances,
  };
}

function buildTerritoryPolicy(ns, names) {
  // Territory clashes are dangerous; fail closed before any telemetry-dependent logic.
  const failClosedSet = safeSetTerritoryWarfare(ns, false);
  const info = safeGangInfo(ns);
  const otherGangs = safeOtherGangInfo(ns);
  const territory = Number(info?.territory) || 0;
  const power = Number(info?.power) || 0;
  const memberCount = names.length;
  const chance = getTerritoryWinChance(ns, info, otherGangs);
  const lowestWinChance = chance.lowestWinChance;
  const unsafeRivals = chance.chances
    .filter(item => item.chance < TERRITORY_CLASH_WIN_CHANCE);
  const allRivalsChecked =
    chance.chances.length > 0;
  const allRivalsReady =
    allRivalsChecked &&
    unsafeRivals.length === 0;
  const strongestRivalPower =
    chance.strongestRivalPower;
  const targetPower =
    strongestRivalPower;
  const powerLeadRatio =
    strongestRivalPower > 0
      ? power / strongestRivalPower
      : Number.POSITIVE_INFINITY;
  const winChanceSafe =
    allRivalsReady;
  const sorted = [...names]
    .sort((a, b) => getCombatScore(ns, b).average - getCombatScore(ns, a).average);
  const bestCombatAverage =
    sorted.length > 0
      ? getCombatScore(ns, sorted[0]).average
      : 0;
  const strikeTeamSize =
    Math.min(TERRITORY_STRIKE_TEAM_SIZE, memberCount);
  const strikeTeamNames =
    getStrikeTeamNames(names);
  const equipmentNames =
    safeEquipment(ns).map(item => item.name);
  const equipmentReadiness =
    strikeTeamNames.map(name => getMemberEquipmentCompletion(ns, name, equipmentNames));
  const topEquipmentReadyCount =
    equipmentReadiness.filter(item => item.complete).length;
  const strikeTeamFullyEquipped =
    strikeTeamSize >= TERRITORY_STRIKE_TEAM_SIZE &&
    topEquipmentReadyCount >= TERRITORY_STRIKE_TEAM_SIZE;
  const durabilityReadiness =
    strikeTeamNames.map(name => getStrikeTeamDurabilityState(ns, name));
  const strikeTeamDurable =
    strikeTeamSize >= TERRITORY_STRIKE_TEAM_SIZE &&
    durabilityReadiness.every(item => item.ready);

  const complete =
    territory >= 0.99;
  const enoughMembers =
    memberCount >= TERRITORY_MIN_MEMBERS;
  const safeToClash =
    !complete &&
    enoughMembers &&
    strikeTeamFullyEquipped &&
    strikeTeamDurable &&
    winChanceSafe;
  const shouldBuildPower =
    !complete &&
    enoughMembers &&
    strikeTeamDurable &&
    !safeToClash;
  const warriorCount =
    safeToClash || shouldBuildPower
      ? Math.min(TERRITORY_STRIKE_TEAM_SIZE, memberCount)
      : 0;
  const warriorNames =
    strikeTeamNames.slice(0, warriorCount);
  const trainingNames =
    !complete && !strikeTeamDurable
      ? strikeTeamNames
      : [];
  const trainingCount =
    trainingNames.length;

  const clashEnabled =
    safeToClash === true;
  const territoryTaskAllowed =
    (clashEnabled || shouldBuildPower) &&
    warriorCount > 0;
  const clashSet =
    safeSetTerritoryWarfare(ns, clashEnabled);
  const status =
    complete
      ? "complete"
      : !enoughMembers
        ? "waiting-members"
        : !strikeTeamDurable
          ? "training-strike-team"
          : safeToClash
            ? "clashing"
            : "building-power";

  return {
    active: safeToClash,
    status,
    reason: complete
      ? "Territory is effectively complete."
      : !enoughMembers
        ? `Need ${TERRITORY_MIN_MEMBERS} members before territory warfare.`
        : !strikeTeamDurable
          ? `Top ${TERRITORY_STRIKE_TEAM_SIZE} train until STR and DEF reach ${formatNumber(STRIKE_TEAM_STR_DEF_MIN)}.`
          : safeToClash
            ? `Clash enabled: all rival gangs are at least ${(TERRITORY_CLASH_WIN_CHANCE * 100).toFixed(0)}%; lowest win chance ${(lowestWinChance * 100).toFixed(1)}%.`
            : `Building gang power with clashes OFF. Top ${TERRITORY_STRIKE_TEAM_SIZE} are durable; ${topEquipmentReadyCount}/${TERRITORY_STRIKE_TEAM_SIZE} fully equipped. Clashes wait until every rival reaches ${(TERRITORY_CLASH_WIN_CHANCE * 100).toFixed(0)}%+. ${formatTerritoryBlocker(allRivalsChecked, unsafeRivals)}`,
    territory,
    power,
    memberCount,
    strikeTeamSize: TERRITORY_STRIKE_TEAM_SIZE,
    strikeTeamNames,
    strikeTeamDurable,
    durabilityReadiness,
    strikeTeamFullyEquipped,
    topEquipmentReadyCount,
    equipmentReadiness,
    warriorCount,
    warriorNames,
    trainingCount,
    trainingNames,
    respectCount: 0,
    territoryTaskAllowed,
    clashEnabled,
    clashSet,
    failClosedSet,
    lowestWinChance,
    allRivalsChecked,
    allRivalsReady,
    unsafeRivals,
    strongestRivalPower,
    targetPower,
    powerLeadRatio,
    bestCombatAverage,
    winChanceSafe,
    winChances: chance.chances,
    thresholds: {
      minMembers: TERRITORY_MIN_MEMBERS,
      clashWinChance: TERRITORY_CLASH_WIN_CHANCE,
      strikeTeamStrDefMin: STRIKE_TEAM_STR_DEF_MIN,
      supportTrainCombatMin: SUPPORT_TRAIN_COMBAT_MIN,
      supportTrainCombatAvg: SUPPORT_TRAIN_COMBAT_AVG,
      strikeTeamSize: TERRITORY_STRIKE_TEAM_SIZE,
    },
  };
}

function getMemberEquipmentCompletion(ns, name, equipmentNames) {
  const member = safeMemberInfo(ns, name);
  const owned = new Set([
    ...(member?.upgrades ?? []),
    ...(member?.augmentations ?? []),
  ]);
  const missing =
    equipmentNames.filter(item => !owned.has(item));

  return {
    name,
    complete: equipmentNames.length > 0 && missing.length === 0,
    ownedCount: Math.max(0, equipmentNames.length - missing.length),
    totalCount: equipmentNames.length,
    missingCount: missing.length,
    missingPreview: missing.slice(0, 5),
  };
}

function getStrikeTeamDurabilityState(ns, name) {
  const member =
    safeMemberInfo(ns, name);
  const strength =
    Number(member?.str) || 0;
  const defense =
    Number(member?.def) || 0;

  return {
    name,
    strength,
    defense,
    ready:
      strength >= STRIKE_TEAM_STR_DEF_MIN &&
      defense >= STRIKE_TEAM_STR_DEF_MIN,
    missingStrength:
      Math.max(0, STRIKE_TEAM_STR_DEF_MIN - strength),
    missingDefense:
      Math.max(0, STRIKE_TEAM_STR_DEF_MIN - defense),
  };
}

function getStrikeTeamNames(names) {
  const available =
    new Set(names);
  const pinned =
    STRIKE_TEAM_NAMES.filter(name => available.has(name));

  if (pinned.length >= Math.min(TERRITORY_STRIKE_TEAM_SIZE, names.length)) {
    return pinned.slice(0, TERRITORY_STRIKE_TEAM_SIZE);
  }

  const remaining =
    [...names]
      .filter(name => !pinned.includes(name))
      .sort(compareGangMemberNames);

  return [...pinned, ...remaining]
    .slice(0, Math.min(TERRITORY_STRIKE_TEAM_SIZE, names.length));
}

function getWantedControlNames(ns, sortedNames, strikeTeamNames, wantedPolicy) {
  const count =
    Math.max(0, Math.floor(Number(wantedPolicy?.vigilanteCount) || 0));

  if (count <= 0) return new Set();

  const byWeakestCombat =
    [...sortedNames].sort((a, b) =>
      getCombatScore(ns, a).average - getCombatScore(ns, b).average
    );
  const support =
    byWeakestCombat.filter(name => !strikeTeamNames.has(name));
  const strike =
    wantedPolicy?.borrowStrikeTeam === true
      ? byWeakestCombat.filter(name => strikeTeamNames.has(name))
      : [];

  return new Set([...support, ...strike].slice(0, count));
}

function compareGangMemberNames(a, b) {
  const aIndex =
    getGangMemberNumericSuffix(a);
  const bIndex =
    getGangMemberNumericSuffix(b);

  if (aIndex !== bIndex) return aIndex - bIndex;

  return String(a).localeCompare(String(b));
}

function getGangMemberNumericSuffix(name) {
  const match =
    String(name ?? "").match(/-(\d+)$/);

  return match
    ? Number(match[1])
    : Number.MAX_SAFE_INTEGER;
}

function getTerritoryDelta(info) {
  const now = Date.now();
  const snapshot = {
    updatedAt: now,
    power: Number(info?.power) || 0,
    territory: Number(info?.territory) || 0,
  };

  if (!previousTerritorySnapshot) {
    previousTerritorySnapshot = snapshot;
    return {
      ageMs: 0,
      powerDelta: 0,
      territoryDelta: 0,
      powerPerMinute: 0,
      territoryPerMinute: 0,
    };
  }

  const ageMs =
    Math.max(1, now - previousTerritorySnapshot.updatedAt);
  const powerDelta =
    snapshot.power - previousTerritorySnapshot.power;
  const territoryDelta =
    snapshot.territory - previousTerritorySnapshot.territory;
  previousTerritorySnapshot = snapshot;

  return {
    ageMs,
    powerDelta,
    territoryDelta,
    powerPerMinute: powerDelta / ageMs * 60_000,
    territoryPerMinute: territoryDelta / ageMs * 60_000,
  };
}

function formatUnsafeRivals(unsafeRivals) {
  if (!unsafeRivals.length) return "no unsafe rivals";
  return unsafeRivals
    .map(item => `${item.gang} ${(item.chance * 100).toFixed(1)}%`)
    .join(", ");
}

function formatTerritoryBlocker(allRivalsChecked, unsafeRivals) {
  if (!allRivalsChecked) return "Waiting for rival clash chance telemetry.";
  return `Blocked by ${formatUnsafeRivals(unsafeRivals)}.`;
}

function getTerritoryWinChance(ns, info, otherGangs) {
  const ownFaction = info?.faction ?? "";
  const chances = [];
  const knownGangNames = Object.keys(otherGangs ?? {});
  const gangNames =
    knownGangNames.length > 0
      ? knownGangNames
      : GANG_FACTIONS;

  for (const gangName of gangNames) {
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

function hasStrikeTeamDurability(member) {
  return (
    (Number(member?.str) || 0) >= STRIKE_TEAM_STR_DEF_MIN &&
    (Number(member?.def) || 0) >= STRIKE_TEAM_STR_DEF_MIN
  );
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
  if (cycleCache?.equipment) return cycleCache.equipment;

  try {
    const equipment = ns.gang.getEquipmentNames().map(name => ({
      name,
      type: ns.gang.getEquipmentType(name),
      cost: ns.gang.getEquipmentCost(name),
    }));
    if (cycleCache) cycleCache.equipment = equipment;
    return equipment;
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

function getGangMode(ns, requestedMode = "auto") {
  const normalized =
    normalizeGangMode(requestedMode);

  if (normalized) return normalized;

  const stored =
    readJson(ns, MODE_FILE, null);
  const storedMode =
    normalizeGangMode(stored?.mode ?? stored);

  return storedMode ?? GANG_MODE_BALANCED;
}

function normalizeGangMode(mode) {
  const text =
    String(mode ?? "").trim().toLowerCase();

  if (!text || text === "auto") return null;
  if (["old", "oldlogic", "old-logic", "legacy"].includes(text)) return GANG_MODE_OLD_LOGIC;
  if (["balanced", "current", "train", "training"].includes(text)) return GANG_MODE_BALANCED;
  if (["money", "money-only", "pure-money", "cash"].includes(text)) return GANG_MODE_MONEY_ONLY;
  if (["combat", "combat-train", "combat-train-only", "train-combat", "train-combat-only"].includes(text)) return GANG_MODE_COMBAT_TRAIN_ONLY;
  if (["custom", "manual", "override", "overrides"].includes(text)) return GANG_MODE_CUSTOM;
  return GANG_MODES.includes(text) ? text : null;
}

function getGangModeLabel(mode) {
  if (mode === GANG_MODE_OLD_LOGIC) return "Old Logic";
  if (mode === GANG_MODE_MONEY_ONLY) return "Money Only";
  if (mode === GANG_MODE_COMBAT_TRAIN_ONLY) return "Combat Train Only";
  if (mode === GANG_MODE_CUSTOM) return "Custom";
  return "Balanced";
}

function getTaskOverrides(ns) {
  const state =
    readJson(ns, TASK_OVERRIDE_FILE, {});
  const rawOverrides =
    state?.overrides && typeof state.overrides === "object"
      ? state.overrides
      : state;
  const overrides = {};

  for (const [name, task] of Object.entries(rawOverrides ?? {})) {
    const memberName =
      String(name ?? "").trim();
    const taskName =
      String(task ?? "").trim();
    if (memberName && taskName) overrides[memberName] = taskName;
  }

  return overrides;
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
    moneyGainPerSecond: (info.moneyGain ?? 0) * GANG_TICKS_PER_SECOND,
    respectGain: info.respectGain ?? 0,
    respectGainPerSecond: (info.respectGain ?? 0) * GANG_TICKS_PER_SECOND,
    wantedLevelGain: info.wantedLevelGain ?? 0,
    wantedLevelGainPerSecond: (info.wantedLevelGain ?? 0) * GANG_TICKS_PER_SECOND,
    str: info.str ?? 0,
    def: info.def ?? 0,
    dex: info.dex ?? 0,
    agi: info.agi ?? 0,
    cha: info.cha ?? 0,
    hack: info.hack ?? 0,
    combatAverage: combat.average,
    combatMinimum: combat.minimum,
    strAsc: info.str_asc_mult ?? 1,
    defAsc: info.def_asc_mult ?? 1,
    dexAsc: info.dex_asc_mult ?? 1,
    agiAsc: info.agi_asc_mult ?? 1,
    chaAsc: info.cha_asc_mult ?? 1,
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
    ASCENSION_GAIN_THRESHOLD;
  const progress =
    Math.max(0, Math.min(1, projected / threshold));

  return {
    current,
    projected,
    threshold,
    progress,
    ready: projected >= threshold,
    result: result ?? null,
  };
}

function baseState(status, message, extra) {
  return {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: "gang-manager-service",
    diagnosticVersion: DIAGNOSTIC_VERSION,
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

function readJson(ns, file, fallback = null) {
  try {
    if (!ns.fileExists(file, "home")) return fallback;
    const raw = ns.read(file);
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
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
  if (cycleCache?.gangInfo) return cycleCache.gangInfo;

  try {
    const info = ns.gang.getGangInformation();
    if (cycleCache) cycleCache.gangInfo = info;
    return info;
  } catch {
    return null;
  }
}

function safeMemberNames(ns) {
  if (cycleCache?.memberNames) return cycleCache.memberNames;

  try {
    const names = ns.gang.getMemberNames();
    if (cycleCache) cycleCache.memberNames = names;
    return names;
  } catch {
    return [];
  }
}

function safeMemberInfo(ns, name) {
  if (cycleCache?.memberInfo?.has(name)) {
    return cycleCache.memberInfo.get(name);
  }

  try {
    const info = ns.gang.getMemberInformation(name);
    cycleCache?.memberInfo?.set(name, info);
    return info;
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
  if (cycleCache?.ascensionResult?.has(name)) {
    return cycleCache.ascensionResult.get(name);
  }

  try {
    const result = ns.gang.getAscensionResult(name);
    cycleCache?.ascensionResult?.set(name, result);
    return result;
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

function safeAscendRaw(ns, name) {
  try {
    return ns.gang.ascendMember(name);
  } catch {
    return null;
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
  if (cycleCache?.otherGangInfo) return cycleCache.otherGangInfo;

  try {
    const info = ns.gang.getOtherGangInformation() ?? {};
    if (cycleCache) cycleCache.otherGangInfo = info;
    return info;
  } catch {
    return {};
  }
}

function safeChanceToWinClash(ns, gangName) {
  if (cycleCache?.clashChance?.has(gangName)) {
    return cycleCache.clashChance.get(gangName);
  }

  try {
    const chance = ns.gang.getChanceToWinClash(gangName);
    const normalized = Number.isFinite(chance) ? chance : null;
    cycleCache?.clashChance?.set(gangName, normalized);
    return normalized;
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

function createCycleCache() {
  return {
    gangInfo: null,
    memberNames: null,
    equipment: null,
    otherGangInfo: null,
    memberInfo: new Map(),
    ascensionResult: new Map(),
    clashChance: new Map(),
  };
}

function invalidateMemberNameCache() {
  if (!cycleCache) return;
  cycleCache.memberNames = null;
}

function invalidateMemberInfoCache() {
  if (!cycleCache) return;
  cycleCache.memberInfo = new Map();
}

function invalidateGangInfoCache() {
  if (!cycleCache) return;
  cycleCache.gangInfo = null;
}
