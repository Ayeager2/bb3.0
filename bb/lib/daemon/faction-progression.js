// /lib/daemon/faction-progression.js

import { buildBackdoorState } from "/lib/daemon/backdoor.js";
import { getAugmentationDecision } from "/lib/daemon/augmentation-decision.js";
import { CONFIG } from "/lib/daemon/config.js";
import { getAllServers, getRootedServers } from "/lib/daemon/network.js";
import {
  getBestExpTarget,
  getBestMoneyTarget,
  safeGetRequiredHackingLevel,
  scoreExpTarget,
  scoreMoneyTarget,
} from "/lib/daemon/targets.js";

const DAEDALUS_HACKING_REQUIREMENT = 2500;
const DAEDALUS_MONEY_REQUIREMENT = 100_000_000_000;
const DAEDALUS_AUGMENT_REQUIREMENT = 30;
const WORLD_DAEMON_HACKING_REQUIREMENT = 3000;

const FACTION_STAGES = [
  {
    id: "cybersec",
    faction: "CyberSec",
    server: "CSEC",
    requiredHack: 58,
  },
  {
    id: "nitesec",
    faction: "NiteSec",
    server: "avmnite-02h",
    requiredHack: 220,
  },
  {
    id: "black-hand",
    faction: "The Black Hand",
    server: "I.I.I.I",
    requiredHack: 341,
  },
  {
    id: "bitrunners",
    faction: "BitRunners",
    server: "run4theh111z",
    requiredHack: 545,
  },
];

export function buildFactionProgressionState(ns) {
  const player = ns.getPlayer();
  const playerHack = ns.getHackingLevel();
  const joinedFactions = getJoinedFactions(ns);
  const backdoorState = buildBackdoorState(ns);
  const augmentationDecision = getAugmentationDecision(ns);
  const hasRedPill = hasAugmentation(ns, "The Red Pill");

  for (const stage of FACTION_STAGES) {
    const backdoorInfo = backdoorState.progressionServers.find(
      x => x.server === stage.server
    );

    const joined = joinedFactions.includes(stage.faction);
    const backdoored = backdoorInfo?.backdoored === true;
    const rooted = backdoorInfo?.rooted === true;
    const hackingEligible = playerHack >= stage.requiredHack;

    if (!hackingEligible) {
      return withCalculations(ns, makeState(stage, {
        blocker: "hacking-level",
        nextAction: "exp",
        recommendedMode: "exp",
        reason: `${stage.faction} requires hacking ${stage.requiredHack}; current ${playerHack}.`,
        backdoorInfo,
        joined,
        hasRedPill,
      }));
    }

    if (!rooted || !backdoored) {
      return withCalculations(ns, makeState(stage, {
        blocker: !rooted ? "root-required" : "backdoor-required",
        nextAction: "backdoor",
        recommendedMode: "progression",
        reason: `${stage.server} must be rooted/backdoored for ${stage.faction}.`,
        backdoorInfo,
        joined,
        hasRedPill,
      }));
    }

    if (!joined) {
      return withCalculations(ns, makeState(stage, {
        blocker: "faction-join",
        nextAction: "faction-join",
        recommendedMode: "progression",
        reason: `${stage.faction} is unlocked but not joined.`,
        backdoorInfo,
        joined,
        hasRedPill,
      }));
    }
  }

  const joinedDaedalus = joinedFactions.includes("Daedalus");
  const daedalusRequirements = buildDaedalusRequirements(ns);

  if (!joinedDaedalus) {
    let blocker = "daedalus-join";
    let nextBestAction = "faction-join";
    let recommendedMode = "progression";
    let reason = "BitRunners path complete. Waiting to qualify for and join Daedalus.";

    if (!daedalusRequirements.hackingReady) {
      blocker = "hacking-level";
      nextBestAction = "exp";
      recommendedMode = "exp";
      reason = `Daedalus requires hacking ${DAEDALUS_HACKING_REQUIREMENT}; current ${playerHack}.`;
    } else if (!daedalusRequirements.moneyReady) {
      blocker = "money";
      nextBestAction = "earn-money";
      recommendedMode = "money";
      reason = `Daedalus path needs ${formatMoney(DAEDALUS_MONEY_REQUIREMENT)}; current ${formatMoney(player.money)}.`;
    } else if (!daedalusRequirements.augmentReady) {
      blocker = "augmentation-count";
      nextBestAction = "augmentation-progress";
      recommendedMode = getAugmentationMode(augmentationDecision);
      reason = `Daedalus path needs about ${DAEDALUS_AUGMENT_REQUIREMENT} owned or queued augmentations; current ${daedalusRequirements.augmentCount}.`;
    }

    return withCalculations(ns, {
      currentFactionStage: "daedalus",
      currentBlocker: blocker,
      nextBestAction,
      recommendedMode,
      targetFaction: "Daedalus",
      targetServer: null,
      requiredHack: DAEDALUS_HACKING_REQUIREMENT,
      reason,
      playerHack,
      hasRedPill,
      daedalusRequirements,
      augmentationDecision,
    });
  }

  if (!hasRedPill) {
    const redPillState = buildRedPillState(ns, augmentationDecision);

    return withCalculations(ns, {
      currentFactionStage: "daedalus",
      currentBlocker: redPillState.blocker,
      nextBestAction: redPillState.nextBestAction,
      recommendedMode: redPillState.recommendedMode,
      targetFaction: "Daedalus",
      targetServer: null,
      requiredHack: DAEDALUS_HACKING_REQUIREMENT,
      reason: redPillState.reason,
      playerHack,
      hasRedPill,
      augmentationDecision,
    });
  }

  const worldReady = playerHack >= WORLD_DAEMON_HACKING_REQUIREMENT;

  return withCalculations(ns, {
    currentFactionStage: "complete",
    currentBlocker: worldReady ? "world-daemon" : "hacking-level",
    nextBestAction: worldReady ? "destroy-node" : "exp",
    recommendedMode: worldReady ? "destroy-node" : "exp",
    targetFaction: null,
    targetServer: "w0r1d_d43m0n",
    requiredHack: WORLD_DAEMON_HACKING_REQUIREMENT,
    reason: worldReady
      ? "Faction progression complete. Red Pill owned. Destroy BitNode."
      : `Red Pill owned. Need hacking ${WORLD_DAEMON_HACKING_REQUIREMENT} for w0r1d_d43m0n; current ${playerHack}.`,
    playerHack,
    hasRedPill,
  });
}

function makeState(stage, data) {
  return {
    currentFactionStage: stage.id,
    currentBlocker: data.blocker,
    nextBestAction: data.nextAction,
    recommendedMode: data.recommendedMode,
    targetFaction: stage.faction,
    targetServer: stage.server,
    requiredHack: stage.requiredHack,
    joined: data.joined,
    hasRedPill: data.hasRedPill,
    backdoorInfo: data.backdoorInfo ?? null,
    reason: data.reason,
  };
}

function withCalculations(ns, state) {
  return {
    ...state,
    expPolicy: buildExpPolicy(ns, state),
    progressionAction: buildProgressionAction(state),
    calculations: buildProgressionCalculations(ns, state),
  };
}

function buildExpPolicy(ns, state) {
  const currentLevel = ns.getHackingLevel();
  const hasRedPill = state.hasRedPill === true;
  const targetLevel = getProgressionHackTarget(state, currentLevel);
  const shouldLevelNow =
    state.currentBlocker === "hacking-level" &&
    targetLevel > currentLevel;

  if (hasRedPill) {
    return {
      phase: "post-red-pill",
      softCap: WORLD_DAEMON_HACKING_REQUIREMENT,
      targetLevel: Math.max(currentLevel, WORLD_DAEMON_HACKING_REQUIREMENT),
      shouldLevelNow: currentLevel < WORLD_DAEMON_HACKING_REQUIREMENT,
      reason: `Red Pill owned; level toward hacking ${WORLD_DAEMON_HACKING_REQUIREMENT} for w0r1d_d43m0n.`,
    };
  }

  return {
    phase: "pre-red-pill",
    softCap: DAEDALUS_HACKING_REQUIREMENT,
    targetLevel,
    shouldLevelNow,
    reason: shouldLevelNow
      ? `Current blocker needs hacking ${targetLevel}; EXP is useful now.`
      : `No active hacking blocker; hold pre-Red-Pill EXP at current stage instead of blindly grinding to ${DAEDALUS_HACKING_REQUIREMENT}.`,
  };
}

function buildProgressionAction(state) {
  const action = state.nextBestAction ?? "none";
  const blocker = state.currentBlocker ?? "none";

  const actionTypes = {
    exp: "hacking",
    backdoor: "backdoor",
    "faction-join": "join",
    "faction-work": "reputation",
    "faction-donation": "donation",
    "earn-money": "money",
    "buy-augmentation": "buy-augmentation",
    "augmentation-progress": "augmentation",
    "destroy-node": "destroy-node",
  };

  return {
    type: actionTypes[action] ?? blocker,
    action,
    blocker,
    targetFaction: state.targetFaction ?? null,
    targetServer: state.targetServer ?? null,
    reason: state.reason ?? null,
  };
}

function buildProgressionCalculations(ns, state) {
  const formulasUnlocked = hasHackingFormulas(ns);
  const rootedServers = getRootedServers(ns, getAllServers(ns));
  const expTarget = getBestExpTarget(ns, rootedServers, {
    phase: state.recommendedMode === "exp" ? "exp" : "scaling",
    lane: "exp",
    purpose: state.recommendedMode === "exp" ? "leveling" : "background",
  });
  const moneyTarget = getBestMoneyTarget(ns, rootedServers, {
    phase: "scaling",
    lane: "money",
  });

  return {
    formulasUnlocked,
    source: formulasUnlocked ? "formulas" : "fallback",
    exp: buildExpCalculation(ns, state, expTarget, formulasUnlocked),
    money: buildMoneyCalculation(ns, state, moneyTarget, formulasUnlocked),
    augmentation: buildAugmentationCalculation(state),
  };
}

function buildExpCalculation(ns, state, target, formulasUnlocked) {
  const player = ns.getPlayer();
  const currentLevel = ns.getHackingLevel();
  const currentExp = getCurrentHackingExp(player);
  const targetLevel = getProgressionHackTarget(state, currentLevel);
  const targetExp = calculateHackingExpForLevel(ns, targetLevel, player, formulasUnlocked);
  const missingExp = Math.max(0, targetExp - currentExp);
  const expPerAction = estimateHackingExpPerAction(ns, target, formulasUnlocked);

  return {
    target,
    currentLevel,
    targetLevel,
    levelsRemaining: Math.max(0, targetLevel - currentLevel),
    currentExp,
    targetExp,
    missingExp,
    expPerAction,
    estimatedActions: expPerAction > 0
      ? Math.ceil(missingExp / expPerAction)
      : null,
    targetScore: target ? scoreExpTarget(ns, target, {
      purpose: state.recommendedMode === "exp" ? "leveling" : "background",
    }) : 0,
    calculationSource: formulasUnlocked ? "formulas.skills/formulas.hacking" : "fallback-skill-estimate",
  };
}

function buildMoneyCalculation(ns, state, target, formulasUnlocked) {
  const player = ns.getPlayer();
  const reserveMoney = getReserveMoneyForState(state);
  const spendable = Math.max(0, player.money - reserveMoney);
  const moneyGoal = getMoneyGoalForState(state, player.money, spendable);
  const income = estimateMoneyTargetIncome(ns, target, formulasUnlocked);

  return {
    target,
    currentMoney: player.money,
    reserveMoney,
    spendable,
    requiredMoney: moneyGoal.requiredMoney,
    requiredSpendableMoney: moneyGoal.requiredSpendableMoney,
    missingMoney: moneyGoal.missingMoney,
    goalType: moneyGoal.goalType,
    estimatedMoneyPerSecond: income.moneyPerSecond,
    estimatedSecondsToGoal:
      moneyGoal.missingMoney > 0 && income.moneyPerSecond > 0
        ? Math.ceil(moneyGoal.missingMoney / income.moneyPerSecond)
        : 0,
    targetScore: target ? scoreMoneyTarget(ns, target) : 0,
    calculationSource: income.source,
    incomeModel: income.model,
  };
}

function buildAugmentationCalculation(state) {
  const decision = state.augmentationDecision ?? null;

  if (!decision) {
    return {
      targetFaction: state.targetFaction ?? null,
      targetAugmentation: null,
      missingRep: 0,
      missingMoney: 0,
      estimatedDonation: 0,
    };
  }

  return {
    targetFaction: decision.targetFaction ?? state.targetFaction ?? null,
    targetAugmentation: decision.targetAugmentation ?? null,
    missingRep: decision.missingRep ?? 0,
    missingMoney: decision.missingMoney ?? 0,
    estimatedDonation: decision.estimatedDonation ?? 0,
    shouldWorkFaction: decision.shouldWorkFaction === true,
    shouldDonateFaction: decision.shouldDonateFaction === true,
    shouldEarnMoney: decision.shouldEarnMoney === true,
    shouldBuyAugment: decision.shouldBuyAugment === true,
    stagePolicy: decision.stagePolicy ?? null,
    timing: decision.augmentationTiming ?? null,
    reason: decision.reason ?? null,
  };
}

function getProgressionHackTarget(state, currentLevel) {
  if (state.currentBlocker === "hacking-level" && state.requiredHack) {
    return Math.max(currentLevel, state.requiredHack);
  }

  if (state.hasRedPill) {
    return Math.max(currentLevel, WORLD_DAEMON_HACKING_REQUIREMENT);
  }

  return Math.max(currentLevel, getNextFactionHackTarget(currentLevel));
}

function getNextFactionHackTarget(currentLevel) {
  for (const stage of FACTION_STAGES) {
    if (stage.requiredHack > currentLevel) return stage.requiredHack;
  }

  return DAEDALUS_HACKING_REQUIREMENT;
}

function getMoneyGoalForState(state, currentMoney, spendable) {
  if (state.augmentationDecision?.missingMoney > 0) {
    return {
      goalType: "augmentation-spendable",
      requiredMoney: currentMoney + state.augmentationDecision.missingMoney,
      requiredSpendableMoney: spendable + state.augmentationDecision.missingMoney,
      missingMoney: state.augmentationDecision.missingMoney,
    };
  }

  if (
    state.currentFactionStage === "daedalus" &&
    state.currentBlocker === "money"
  ) {
    return {
      goalType: "daedalus-invite-money",
      requiredMoney: DAEDALUS_MONEY_REQUIREMENT,
      requiredSpendableMoney: Math.max(0, DAEDALUS_MONEY_REQUIREMENT - getReserveMoneyForState(state)),
      missingMoney: Math.max(0, DAEDALUS_MONEY_REQUIREMENT - currentMoney),
    };
  }

  if (state.augmentationDecision?.estimatedDonation > 0) {
    return {
      goalType: "faction-donation",
      requiredMoney: currentMoney + state.augmentationDecision.estimatedDonation,
      requiredSpendableMoney: spendable + state.augmentationDecision.estimatedDonation,
      missingMoney: state.augmentationDecision.estimatedDonation,
    };
  }

  return {
    goalType: "none",
    requiredMoney: 0,
    requiredSpendableMoney: 0,
    missingMoney: 0,
  };
}

function getReserveMoneyForState(state) {
  if (state.currentFactionStage === "daedalus") {
    return CONFIG.highReserveMoney;
  }

  return CONFIG.minReserveMoney;
}

function estimateMoneyTargetIncome(ns, target, formulasUnlocked) {
  if (!target) {
    return {
      moneyPerSecond: 0,
      source: "none",
      model: "no target",
    };
  }

  try {
    const maxMoney = Math.max(1, ns.getServerMaxMoney(target));
    const weakenTime = Math.max(1, getWeakenTime(ns, target, formulasUnlocked));
    const chance = Math.max(0.01, getHackChance(ns, target, formulasUnlocked));
    const hackPercent = Math.max(0.000001, getHackPercent(ns, target, formulasUnlocked));

    return {
      moneyPerSecond: (maxMoney * hackPercent * chance) / (weakenTime / 1000),
      source: formulasUnlocked ? "formulas" : "fallback",
      model: "single-thread hack value per weaken window",
    };
  } catch {
    return {
      moneyPerSecond: 0,
      source: formulasUnlocked ? "formulas-failed" : "fallback-failed",
      model: "unavailable",
    };
  }
}

function estimateHackingExpPerAction(ns, target, formulasUnlocked) {
  if (!target) return 0;

  if (formulasUnlocked) {
    try {
      return Math.max(
        0,
        ns.formulas.hacking.hackExp(ns.getServer(target), ns.getPlayer())
      );
    } catch {
      // Fall through to the estimate below.
    }
  }

  try {
    const required = Math.max(1, safeGetRequiredHackingLevel(ns, target));
    const minSecurity = Math.max(1, ns.getServerMinSecurityLevel(target));

    return Math.max(1, Math.sqrt(required) + minSecurity * 0.3);
  } catch {
    return 1;
  }
}

function getHackChance(ns, target, formulasUnlocked) {
  if (formulasUnlocked) {
    try {
      return ns.formulas.hacking.hackChance(ns.getServer(target), ns.getPlayer());
    } catch {
      return ns.hackAnalyzeChance(target);
    }
  }

  return ns.hackAnalyzeChance(target);
}

function getHackPercent(ns, target, formulasUnlocked) {
  if (formulasUnlocked) {
    try {
      return ns.formulas.hacking.hackPercent(ns.getServer(target), ns.getPlayer());
    } catch {
      return ns.hackAnalyze(target);
    }
  }

  return ns.hackAnalyze(target);
}

function getWeakenTime(ns, target, formulasUnlocked) {
  if (formulasUnlocked) {
    try {
      return ns.formulas.hacking.weakenTime(ns.getServer(target), ns.getPlayer());
    } catch {
      return ns.getWeakenTime(target);
    }
  }

  return ns.getWeakenTime(target);
}

function calculateHackingExpForLevel(ns, level, player, formulasUnlocked) {
  const multiplier = getHackingExpMultiplier(player);

  if (formulasUnlocked) {
    try {
      return ns.formulas.skills.calculateExp(level, multiplier);
    } catch {
      // Fall through to the local approximation.
    }
  }

  return Math.max(0, Math.exp((level / multiplier + 200) / 32) - 534.6);
}

function getCurrentHackingExp(player) {
  return (
    player?.exp?.hacking ??
    player?.hacking_exp ??
    player?.skills?.hacking_exp ??
    0
  );
}

function getHackingExpMultiplier(player) {
  return Math.max(
    1,
    player?.mults?.hacking_exp ??
    player?.hacking_exp_mult ??
    1
  );
}

function hasHackingFormulas(ns) {
  return (
    ns.fileExists("Formulas.exe", "home") &&
    !!ns.formulas?.hacking
  );
}

function buildDaedalusRequirements(ns) {
  const player = ns.getPlayer();
  const augmentCount = getOwnedAugmentationCount(ns);

  return {
    hackingRequired: DAEDALUS_HACKING_REQUIREMENT,
    hacking: ns.getHackingLevel(),
    hackingReady: ns.getHackingLevel() >= DAEDALUS_HACKING_REQUIREMENT,
    moneyRequired: DAEDALUS_MONEY_REQUIREMENT,
    money: player.money,
    moneyReady: player.money >= DAEDALUS_MONEY_REQUIREMENT,
    augmentRequired: DAEDALUS_AUGMENT_REQUIREMENT,
    augmentCount,
    augmentReady: augmentCount >= DAEDALUS_AUGMENT_REQUIREMENT,
  };
}

function buildRedPillState(ns, augmentationDecision) {
  if (augmentationDecision?.shouldBuyAugment === true) {
    return {
      blocker: "red-pill-purchase",
      nextBestAction: "buy-augmentation",
      recommendedMode: "progression",
      reason: augmentationDecision.reason ?? "The Red Pill is ready to buy.",
    };
  }

  if (augmentationDecision?.shouldEarnMoney === true) {
    return {
      blocker: "money",
      nextBestAction: "earn-money",
      recommendedMode: "money",
      reason: augmentationDecision.reason ?? "Need more money for The Red Pill.",
    };
  }

  if (
    augmentationDecision?.shouldDonateFaction === true ||
    augmentationDecision?.shouldWorkFaction === true
  ) {
    return {
      blocker: augmentationDecision.shouldDonateFaction ? "donation" : "reputation",
      nextBestAction: augmentationDecision.shouldDonateFaction ? "faction-donation" : "faction-work",
      recommendedMode: "progression",
      reason: augmentationDecision.reason ?? "Need Daedalus reputation for The Red Pill.",
    };
  }

  try {
    const rep = ns.singularity.getFactionRep("Daedalus");
    const repReq = ns.singularity.getAugmentationRepReq("The Red Pill");
    const price = ns.singularity.getAugmentationPrice("The Red Pill");
    const money = ns.getPlayer().money;

    if (rep < repReq) {
      return {
        blocker: "reputation",
        nextBestAction: "faction-work",
        recommendedMode: "progression",
        reason: `Need ${formatNumber(repReq - rep)} more Daedalus rep for The Red Pill.`,
      };
    }

    if (money < price) {
      return {
        blocker: "money",
        nextBestAction: "earn-money",
        recommendedMode: "money",
        reason: `Need ${formatMoney(price - money)} more for The Red Pill.`,
      };
    }
  } catch {
    // Singularity data can be unavailable before SF4 access.
  }

  return {
    blocker: "red-pill",
    nextBestAction: "faction-work",
    recommendedMode: "progression",
    reason: "Daedalus joined. Work Daedalus reputation until Red Pill can be purchased.",
  };
}

function getAugmentationMode(augmentationDecision) {
  if (augmentationDecision?.shouldEarnMoney === true) return "money";
  return "progression";
}

function getOwnedAugmentationCount(ns) {
  try {
    return ns.singularity
      .getOwnedAugmentations(true)
      .filter(name => name !== "NeuroFlux Governor")
      .length;
  } catch {
    return 0;
  }
}

function getJoinedFactions(ns) {
  try {
    return ns.getPlayer().factions ?? [];
  } catch {
    return [];
  }
}

function hasAugmentation(ns, name) {
  try {
    return ns.singularity.getOwnedAugmentations(true).includes(name);
  } catch {
    return false;
  }
}

function formatMoney(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "$0";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}t`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}b`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(2)}k`;

  return `$${n.toFixed(0)}`;
}

function formatNumber(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}t`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}b`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}m`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}k`;

  return n.toFixed(0);
}
