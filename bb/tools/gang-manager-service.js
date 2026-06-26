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

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 2500],
    ["reserve", 1_000_000_000],
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
  const assignments = assignGangTasks(ns, names);
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
    respect: info?.respect ?? 0,
    wantedLevel: info?.wantedLevel ?? 0,
    wantedPenalty: info?.wantedPenalty ?? 1,
    money: ns.getPlayer().money,
    members: names.map(name => summarizeMember(ns, name)),
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

      if (safePurchaseEquipment(ns, name, item.name)) bought++;
    }
  }

  return {
    bought,
    status: bought > 0 ? "bought" : nextItem ? "waiting-money" : "complete",
    message: bought > 0
      ? `Bought ${bought} gang equipment/augmentation item${bought === 1 ? "" : "s"}.`
      : nextItem
        ? `Waiting for ${nextItem.member} to buy ${nextItem.item}; need ${formatMoney(nextItem.cost)}, spendable ${formatMoney(nextItem.spendable)} after ${formatMoney(reserve)} reserve.`
        : "All affordable configured gang equipment is already owned.",
    nextItem,
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

function assignGangTasks(ns, names) {
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
      wantedPenalty < 0.995 ||
      (wantedLevel > 500 && wantedGain > 0) ||
      wantedGain > respectGain / 10 ||
      wantedLevel * 10 > Math.max(1, respect)
    );

  const sorted = [...names]
    .sort((a, b) => getCombatScore(ns, b) - getCombatScore(ns, a));
  let vigilantes =
    needVigilante ? Math.max(1, Math.ceil(sorted.length / 4)) : 0;
  let terrorism =
    Math.max(0, Math.ceil((sorted.length - vigilantes) / (respect < 2_500_000 ? 2 : 4)));

  for (const name of sorted) {
    const member = safeMemberInfo(ns, name);
    if (!member) continue;

    let task = "Terrorism";
    const terrorismScore = getTerrorismScore(member);
    const riskyTerrorism = terrorismScore > 620 && terrorismScore < 710;

    if (vigilantes > 0) {
      task = "Vigilante Justice";
      vigilantes--;
    } else if (!riskyTerrorism && terrorism > 0) {
      task = "Terrorism";
      terrorism--;
    } else if (terrorismScore > 800) {
      task = "Traffick Illegal Arms";
    } else if (Number(member.str) > 120) {
      task = "Strongarm Civilians";
    } else if (Number(member.str) > 20) {
      task = "Mug People";
    } else {
      task = "Train Combat";
    }

    safeSetTask(ns, name, task);
    assignments.push({ name, task });
  }

  return assignments;
}

function getCombatScore(ns, name) {
  const member = safeMemberInfo(ns, name);
  if (!member) return 0;
  return getTerrorismScore(member);
}

function getTerrorismScore(member) {
  return (
    (Number(member.hack) || 0) +
    (Number(member.str) || 0) +
    (Number(member.def) || 0) +
    (Number(member.dex) || 0) +
    (Number(member.cha) || 0)
  );
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

function summarizeMember(ns, name) {
  const info = safeMemberInfo(ns, name) ?? {};
  return {
    name,
    task: info.task ?? "",
    earnedRespect: info.earnedRespect ?? 0,
    str: info.str ?? 0,
    dex: info.dex ?? 0,
    hack: info.hack ?? 0,
    strAsc: info.str_asc_mult ?? 1,
    dexAsc: info.dex_asc_mult ?? 1,
    hackAsc: info.hack_asc_mult ?? 1,
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
