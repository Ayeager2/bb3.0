import { refreshDaemonState } from '/lib/daemon/dev-reset.js';

const BOOTSTRAP_DAEMON = 'bootstrap-daemon.js';
const FULL_DAEMON = 'daemon.js';
const BN2_GANG_MANAGER = '/tools/gang-manager-service.js';
const BN2_CRIME_BOOTSTRAP = '/tools/crime-bootstrap.js';
const HACKNET_BUYER = '/economy/hacknet-buyer-service.js';
const HOME_RAM_BUYER = '/economy/home-ram-buyer-service.js';
const SERVER_PURCHASER = '/economy/server-purchaser-service.js';
const FINAL_LEVEL_STUDY = '/tools/final-level-study-service.js';
const CORP_MANAGER = '/tools/corp-manager-service.js';
const CORP_BOOTSTRAP = '/tools/corp-bootstrap-service.js';
const MIN_HOME_RAM_FOR_FULL_DAEMON = 64;

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog('ALL');

  const flags = ns.flags([
    ['clean', true],
    ['sessions', true],
    ['completions', true],
    ['volatile', true],
  ]);

  if (flags.clean) {
    refreshDaemonState(ns, {
      volatile: flags.volatile,
      completions: flags.completions,
      sessions: flags.sessions,
      verbose: true,
    });
  }

  await ns.sleep(1000);

  startBn2CoreServices(ns);
  startCorporationManager(ns);

  if (shouldUseBootstrap(ns)) {
    if (!ns.scriptRunning(BOOTSTRAP_DAEMON, 'home')) {
      stopFullDaemonIfRunning(ns);
      startScript(ns, BOOTSTRAP_DAEMON, [], {
        label: 'bootstrap-daemon.js',
        priority: false,
      });
    } else {
      ns.tprint('[STARTUP] bootstrap-daemon.js already running.');
    }

    return;
  }

  if (!ns.scriptRunning(FULL_DAEMON, 'home')) {
    ns.run(FULL_DAEMON, 1, '--skip-refresh', true);
    ns.tprint('[STARTUP] daemon.js started.');
  } else {
    ns.tprint('[STARTUP] daemon.js already running.');
  }

  startBn2GangManager(ns);
  startCorporationManager(ns);
  startFinalLevelStudy(ns);
}

function shouldUseBootstrap(ns) {
  return (
    ns.getServerMaxRam('home') < MIN_HOME_RAM_FOR_FULL_DAEMON &&
    ns.fileExists(BOOTSTRAP_DAEMON, 'home')
  );
}

function stopFullDaemonIfRunning(ns) {
  try {
    if (ns.scriptRunning(FULL_DAEMON, 'home')) {
      ns.kill(FULL_DAEMON, 'home');
    }
  } catch {
    // If kill fails, let bootstrap try to work with remaining RAM.
  }
}

function startBn2GangManager(ns) {
  if (getCurrentBitNode(ns) !== 2) return;

  startScript(ns, BN2_GANG_MANAGER, [], {
    label: 'BN2 gang manager',
    priority: true,
  });
}

function startBn2CoreServices(ns) {
  if (getCurrentBitNode(ns) !== 2) return;

  startBn2GangManager(ns);
  startScript(
    ns,
    HACKNET_BUYER,
    [
      '--refresh',
      3000,
      '--nodes',
      0,
      '--level',
      0,
      '--ram',
      0,
      '--cores',
      0,
      '--cache',
      0,
      '--reserve',
      0,
      '--max-payback',
      0,
      '--min-production',
      100_000,
      '--max-purchases',
      25,
      '--force',
      true,
      '--debug',
      false,
      '--toast',
      false,
      '--terminal',
      false,
    ],
    {
      label: 'BN2 Hacknet economy buyer',
      priority: true,
    },
  );
  startScript(
    ns,
    HOME_RAM_BUYER,
    ['--refresh', 5000, '--min-money', 1_000_000, '--force', true, '--debug', false],
    {
      label: 'BN2 home RAM buyer',
      priority: true,
    },
  );
  startScript(
    ns,
    SERVER_PURCHASER,
    ['--refresh', 5000, '--debug', false, '--toast', false, '--terminal', false],
    {
      label: 'BN2 cloud server purchaser',
      priority: true,
    },
  );
  startScript(
    ns,
    BN2_CRIME_BOOTSTRAP,
    [
      '--crime',
      'auto',
      '--stop-money',
      10_000_000,
      '--stop-home-ram',
      MIN_HOME_RAM_FOR_FULL_DAEMON,
      '--focus',
      false,
    ],
    {
      label: 'BN2 auto crime bootstrap',
      priority: true,
    },
  );
}

function startFinalLevelStudy(ns) {
  if (!shouldStartFinalLevelStudy(ns)) return;

  startScript(ns, FINAL_LEVEL_STUDY, ['--refresh', 5000, '--focus', false], {
    label: 'final level study',
    priority: false,
  });
}

function shouldStartFinalLevelStudy(ns) {
  if (!hasInstalledRedPill(ns)) return false;

  try {
    const required = ns.serverExists('w0r1d_d43m0n')
      ? ns.getServerRequiredHackingLevel('w0r1d_d43m0n')
      : 0;
    return required > 0 && ns.getHackingLevel() < required;
  } catch {
    return false;
  }
}

function hasInstalledRedPill(ns) {
  try {
    return ns.singularity?.getOwnedAugmentations?.(false)?.includes('The Red Pill') === true;
  } catch {
    return false;
  }
}

function startCorporationManager(ns) {
  if (!hasCorporationStartupAccess(ns)) return;

  if (!canRunScript(ns, CORP_MANAGER)) {
    startScript(ns, CORP_BOOTSTRAP, [], {
      label: 'corporation bootstrap',
      priority: true,
    });
    return;
  }

  startScript(ns, CORP_MANAGER, ['--refresh', 5000], {
    label: 'corporation manager',
    priority: true,
  });
}

function hasCorporationStartupAccess(ns) {
  if (!ns.corporation) return false;
  if (getCurrentBitNode(ns) === 3) return true;
  return getOwnedSourceFileLevel(ns, 3) > 0;
}

function getOwnedSourceFileLevel(ns, sourceFileNumber) {
  const sources = [];

  try {
    sources.push(ns.getOwnedSourceFiles?.());
  } catch {
    // API availability depends on the current BitNode/source files.
  }

  try {
    sources.push(ns.singularity?.getOwnedSourceFiles?.());
  } catch {
    // Singularity can be unavailable early.
  }

  try {
    const resetInfo = ns.getResetInfo?.();
    sources.push(resetInfo?.ownedSF, resetInfo?.ownedSourceFiles, resetInfo?.sourceFiles);
  } catch {
    // Reset info shape has changed across Bitburner versions.
  }

  for (const source of sources) {
    const level = findSourceFileLevel(source, sourceFileNumber);
    if (level > 0) return level;
  }

  return 0;
}

function findSourceFileLevel(sourceFiles, sourceFileNumber) {
  if (!sourceFiles) return 0;

  if (Array.isArray(sourceFiles)) {
    return sourceFiles.reduce((best, sourceFile) => {
      const entry = normalizeSourceFile(sourceFile);
      if (entry.n !== sourceFileNumber) return best;
      return Math.max(best, entry.lvl);
    }, 0);
  }

  const directLevel = Number(sourceFiles[sourceFileNumber]);
  if (Number.isFinite(directLevel)) return directLevel;

  return Object.entries(sourceFiles).reduce((best, [key, value]) => {
    const entry = normalizeSourceFile(
      value && typeof value === 'object' ? { n: key, ...value } : { n: key, lvl: value },
    );
    if (entry.n !== sourceFileNumber) return best;
    return Math.max(best, entry.lvl);
  }, 0);
}

function normalizeSourceFile(sourceFile) {
  if (Array.isArray(sourceFile)) {
    return {
      n: Number(sourceFile[0]),
      lvl: Number(sourceFile[1]),
    };
  }

  return {
    n: Number(
      sourceFile?.n ??
        sourceFile?.number ??
        sourceFile?.bitNode ??
        sourceFile?.bitnode ??
        sourceFile?.sourceFile ??
        sourceFile?.sourceFileNumber ??
        sourceFile?.id ??
        0,
    ),
    lvl: Number(
      sourceFile?.lvl ??
        sourceFile?.level ??
        sourceFile?.levelOwned ??
        sourceFile?.sfLevel ??
        sourceFile?.sourceFileLevel ??
        sourceFile?.value ??
        0,
    ),
  };
}

function startScript(ns, script, args = [], options = {}) {
  if (!ns.fileExists(script, 'home')) return false;
  if (isScriptRunning(ns, script)) return true;

  const scriptRam = ns.getScriptRam(script, 'home');
  if (!Number.isFinite(scriptRam) || scriptRam <= 0) return false;

  if (options.priority === true) {
    freeHomeRamFor(ns, scriptRam);
  }

  const pid = ns.run(script, 1, ...args);
  const label = options.label ?? script;

  if (pid > 0) {
    ns.tprint(`[STARTUP] ${label} started.`);
    return true;
  }

  ns.tprint(`[STARTUP] ${label} could not start yet.`);
  return false;
}

function canRunScript(ns, script) {
  if (!ns.fileExists(script, 'home')) return false;
  const scriptRam = ns.getScriptRam(script, 'home');
  return Number.isFinite(scriptRam) && scriptRam > 0 && ns.getServerMaxRam('home') >= scriptRam;
}

function freeHomeRamFor(ns, neededRam) {
  if (getFreeHomeRam(ns) >= neededRam) return;

  const killOrder = ['/workers/tiny-worker.js', BOOTSTRAP_DAEMON];

  for (const script of killOrder) {
    for (const proc of ns.ps('home')) {
      if (normalizePath(proc.filename) !== normalizePath(script)) continue;
      try {
        ns.kill(proc.pid);
      } catch {
        // Best effort. Startup will report if the service still cannot launch.
      }
      if (getFreeHomeRam(ns) >= neededRam) return;
    }
  }
}

function getFreeHomeRam(ns) {
  return Math.max(0, ns.getServerMaxRam('home') - ns.getServerUsedRam('home'));
}

function isScriptRunning(ns, script) {
  const normalized = normalizePath(script);

  try {
    return ns.ps('home').some((proc) => normalizePath(proc.filename) === normalized);
  } catch {
    return false;
  }
}

function normalizePath(path) {
  return String(path ?? '').replace(/^\/+/, '');
}

function getCurrentBitNode(ns) {
  try {
    return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
  } catch {
    return 1;
  }
}
