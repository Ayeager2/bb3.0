// /lib/daemon/faction-progression.js

import { buildBackdoorState } from "/lib/daemon/backdoor.js";

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
  const playerHack = ns.getHackingLevel();
  const joinedFactions = getJoinedFactions(ns);
  const backdoorState = buildBackdoorState(ns);

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
      return makeState(stage, {
        blocker: "hacking-level",
        nextAction: "exp",
        recommendedMode: "exp",
        reason: `${stage.faction} requires hacking ${stage.requiredHack}; current ${playerHack}.`,
        backdoorInfo,
        joined,
        hasRedPill,
      });
    }

    if (!rooted || !backdoored) {
      return makeState(stage, {
        blocker: !rooted ? "root-required" : "backdoor-required",
        nextAction: "backdoor",
        recommendedMode: "progression",
        reason: `${stage.server} must be rooted/backdoored for ${stage.faction}.`,
        backdoorInfo,
        joined,
        hasRedPill,
      });
    }

    if (!joined) {
      return makeState(stage, {
        blocker: "faction-join",
        nextAction: "faction-join",
        recommendedMode: "progression",
        reason: `${stage.faction} is unlocked but not joined.`,
        backdoorInfo,
        joined,
        hasRedPill,
      });
    }

  }

  const joinedDaedalus = joinedFactions.includes("Daedalus");

  if (!joinedDaedalus) {
    return {
      currentFactionStage: "daedalus",
      currentBlocker: "daedalus-join",
      nextBestAction: "faction-join",
      recommendedMode: "progression",
      targetFaction: "Daedalus",
      targetServer: null,
      reason: "BitRunners path complete. Waiting to qualify for and join Daedalus.",
      playerHack,
      hasRedPill,
    };
  }

  if (!hasRedPill) {
    return {
      currentFactionStage: "daedalus",
      currentBlocker: "red-pill",
      nextBestAction: "faction-work",
      recommendedMode: "progression",
      targetFaction: "Daedalus",
      targetServer: null,
      reason: "Daedalus joined. Work Daedalus reputation until Red Pill can be purchased.",
      playerHack,
      hasRedPill,
    };
  }

  return {
      currentFactionStage: "complete",
      currentBlocker: "world-daemon",
      nextBestAction: "destroy-node",
      recommendedMode: "destroy-node",
      targetFaction: null,
      targetServer: "w0r1d_d43m0n",
      reason: "Faction progression complete. Red Pill owned. Destroy BitNode.",
      playerHack,
      hasRedPill,
  };
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