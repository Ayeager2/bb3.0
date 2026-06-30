const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const STATE_FILE = "/data/final-level-study-state.txt";
const UNIVERSITY = "Rothman University";
const COURSE = "Algorithms";
const WORLD_DAEMON = "w0r1d_d43m0n";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 5000],
    ["focus", false],
  ]);

  const refreshMs = Math.max(1000, Number(flags.refresh) || 5000);
  const focus = flags.focus === true || flags.focus === "true";

  while (true) {
    const state = runStudyCycle(ns, focus);
    writeState(ns, state);
    await ns.sleep(refreshMs);
  }
}

function runStudyCycle(ns, focus) {
  const bitNode = getCurrentBitNode(ns);
  const daemonState = readJson(ns, DAEMON_STATE_FILE);
  const progression = daemonState?.factionProgression ?? {};
  const currentWork = getCurrentWork(ns);
  const hacking = ns.getHackingLevel();
  const hasRedPill = hasInstalledRedPill(ns, progression);
  const worldHackRequired = getWorldHackRequirement(ns, progression);
  const shouldStudy =
    hasRedPill &&
    worldHackRequired > 0 &&
    hacking < worldHackRequired;

  if (!shouldStudy) {
    return {
      status: "idle",
      bitNode,
      hacking,
      targetLevel: worldHackRequired,
      hasRedPill,
      currentWork: summarizeWork(currentWork),
      reason: hasRedPill
        ? "World daemon hacking requirement is already met or unknown."
        : "Red Pill is not installed; final leveling study is not active.",
    };
  }

  if (isAlgorithmsStudy(currentWork)) {
    return {
      status: "studying",
      bitNode,
      hacking,
      targetLevel: worldHackRequired,
      hasRedPill,
      currentWork: summarizeWork(currentWork),
      university: UNIVERSITY,
      course: COURSE,
      reason: `Already studying ${COURSE} at ${UNIVERSITY} for w0r1d_d43m0n ${hacking}/${worldHackRequired}.`,
    };
  }

  stopCurrentWork(ns);
  const started = startAlgorithms(ns, focus);

  return {
    status: started ? "started" : "blocked",
    bitNode,
    hacking,
    targetLevel: worldHackRequired,
    hasRedPill,
    currentWork: summarizeWork(getCurrentWork(ns)),
    university: UNIVERSITY,
    course: COURSE,
    reason: started
      ? `Started ${COURSE} at ${UNIVERSITY} for final hacking level ${hacking}/${worldHackRequired}.`
      : `Unable to start ${COURSE} at ${UNIVERSITY}.`,
  };
}

function startAlgorithms(ns, focus) {
  try {
    travelToSector12(ns);
    return ns.singularity.universityCourse(UNIVERSITY, COURSE, focus);
  } catch {
    return false;
  }
}

function travelToSector12(ns) {
  try {
    if (ns.getPlayer().city !== "Sector-12") {
      ns.singularity.travelToCity("Sector-12");
    }
  } catch {
    // Course start will report blocked if travel/course fails.
  }
}

function stopCurrentWork(ns) {
  try {
    return ns.singularity.stopAction();
  } catch {
    // Try alternate API below.
  }

  try {
    return ns.singularity.stopWork();
  } catch {
    return false;
  }
}

function isAlgorithmsStudy(work) {
  if (!work) return false;

  const type = String(work.type ?? "").toUpperCase();
  const classType = String(work.classType ?? work.className ?? "").toLowerCase();
  const location = String(work.locationName ?? "").toLowerCase();

  return (
    type === "CLASS" &&
    (
      classType.includes("algorithm") ||
      classType.includes("computer science")
    ) &&
    (
      !location ||
      location.includes("rothman")
    )
  );
}

function hasInstalledRedPill(ns, progression) {
  if (progression?.hasRedPill === true) return true;

  try {
    return ns.singularity.getOwnedAugmentations(false).includes("The Red Pill");
  } catch {
    return false;
  }
}

function getWorldHackRequirement(ns, progression) {
  const fromProgression =
    Number(progression?.requiredHack ?? progression?.expPolicy?.targetLevel);
  if (Number.isFinite(fromProgression) && fromProgression > 0) {
    return Math.floor(fromProgression);
  }

  try {
    if (ns.serverExists(WORLD_DAEMON)) {
      return ns.getServerRequiredHackingLevel(WORLD_DAEMON);
    }
  } catch {
    // Fall through to no requirement.
  }

  return 0;
}

function getCurrentWork(ns) {
  try {
    return ns.singularity.getCurrentWork() ?? null;
  } catch {
    return null;
  }
}

function summarizeWork(work) {
  if (!work) return null;

  return {
    type: work.type ?? null,
    classType: work.classType ?? work.className ?? null,
    locationName: work.locationName ?? null,
    factionName: work.factionName ?? null,
    factionWorkType: work.factionWorkType ?? null,
    crimeType: work.crimeType ?? null,
  };
}

function getCurrentBitNode(ns) {
  try {
    return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
  } catch {
    return 1;
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

function writeState(ns, state) {
  ns.write(STATE_FILE, JSON.stringify({
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: "final-level-study-service",
    ...state,
  }, null, 2), "w");
}
