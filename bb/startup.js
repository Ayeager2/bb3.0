import { refreshDaemonState } from '/lib/daemon/dev-reset.js';

const FULL_DAEMON = 'daemon.js';
const GANG_MANAGER = '/tools/gang-manager-service.js';
const HACKNET_BUYER = '/economy/hacknet-buyer-service.js';
const HOME_RAM_BUYER = '/economy/home-ram-buyer-service.js';
const SERVER_PURCHASER = '/economy/server-purchaser-service.js';
const FINAL_LEVEL_STUDY = '/tools/final-level-study-service.js';
const CORP_MANAGER = '/tools/corp-manager-service.js';
const DASHBOARD_STATE_WRITER = '/tools/dashboard-state-writer.js';
const DASHBOARD_COMMAND_RUNNER = '/tools/dashboard-command-runner.js';
const BN3_MIN_HOME_RAM_FOR_CORP_MANAGER = 512;

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

  if (shouldUseBn3GangRamBootstrap(ns)) {
    startDashboardServices(ns);
    startGangManager(ns);
    startHomeRamBuyer(ns);
    ns.tprint(
      `[STARTUP] BN3 corporation deferred until home RAM is above ${formatRam(BN3_MIN_HOME_RAM_FOR_CORP_MANAGER)}.`,
    );
    return;
  }

  const isBn3CorpMode = getCurrentBitNode(ns) === 3 && hasCorporationStartupAccess(ns);
  let corporationManagerStarted = false;

  if (isBn3CorpMode) {
    corporationManagerStarted = startCorporationManager(ns);
    startDashboardServices(ns);
    startGangManager(ns);
  } else {
    startDashboardServices(ns);
    startBn2CoreServices(ns);
    corporationManagerStarted = startCorporationManager(ns);
    startGangManager(ns);
  }

  if (isBn3CorpMode && corporationManagerStarted && ns.getServerMaxRam('home') <= 1024) {
    ns.tprint('[STARTUP] BN3 corp mode: skipping daemon.js until home RAM is above 1.00TB.');
    return;
  }

  if (!ns.scriptRunning(FULL_DAEMON, 'home')) {
    ns.run(FULL_DAEMON, 1, '--skip-refresh', true);
    ns.tprint('[STARTUP] daemon.js started.');
  } else {
    ns.tprint('[STARTUP] daemon.js already running.');
  }

  startFinalLevelStudy(ns);
}

function startDashboardServices(ns) {
  startScript(ns, DASHBOARD_STATE_WRITER, ['--refresh', 3000], {
    label: 'dashboard state writer',
    priority: true,
  });

  startScript(ns, DASHBOARD_COMMAND_RUNNER, [], {
    label: 'dashboard command runner',
    priority: true,
  });
}

function shouldUseBn3GangRamBootstrap(ns) {
  return getCurrentBitNode(ns) === 3 && ns.getServerMaxRam('home') <= BN3_MIN_HOME_RAM_FOR_CORP_MANAGER;
}

function startGangManager(ns) {
  if (!hasGangStartupAccess(ns)) return;

  startScript(ns, GANG_MANAGER, [], {
    label: 'gang manager',
    priority: true,
  });
}

function startBn2CoreServices(ns) {
  if (getCurrentBitNode(ns) !== 2) return;

  startGangManager(ns);
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
}

function startHomeRamBuyer(ns) {
  startScript(ns, HOME_RAM_BUYER, ['--refresh', 10000, '--min-money', 1_000_000], {
    label: 'home RAM buyer',
    priority: true,
  });
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
  if (!hasCorporationStartupAccess(ns)) return false;

  if (!canRunScript(ns, CORP_MANAGER)) {
    ns.tprint(
      `[STARTUP] corporation manager deferred. Need ${formatRam(getScriptRam(ns, CORP_MANAGER))} home RAM; current home RAM is ${formatRam(ns.getServerMaxRam('home'))}.`,
    );
    return false;
  }

  return startScript(ns, CORP_MANAGER, ['--refresh', 5000], {
    label: 'corporation manager',
    priority: true,
  });
}

function hasCorporationStartupAccess(ns) {
  if (!ns.corporation) return false;
  if (getCurrentBitNode(ns) === 3) return true;
  return getOwnedSourceFileLevel(ns, 3) > 0;
}

function hasGangStartupAccess(ns) {
  if (!ns.gang) return false;
  if (getCurrentBitNode(ns) === 2) return true;
  if (hasGang(ns)) return true;
  return getOwnedSourceFileLevel(ns, 2) > 0;
}

function hasCorporation(ns) {
  try {
    return ns.corporation?.hasCorporation?.() === true;
  } catch {
    return false;
  }
}

function hasGang(ns) {
  try {
    return ns.gang?.inGang?.() === true;
  } catch {
    return false;
  }
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
  const label = options.label ?? script;

  if (!ns.fileExists(script, 'home')) {
    ns.tprint(`[STARTUP] ${label} missing: ${script}`);
    return false;
  }

  if (isScriptRunning(ns, script)) return true;

  const scriptRam = ns.getScriptRam(script, 'home');
  if (!Number.isFinite(scriptRam) || scriptRam <= 0) {
    ns.tprint(`[STARTUP] ${label} has invalid RAM cost: ${formatRam(scriptRam)}.`);
    return false;
  }

  if (options.priority === true) {
    freeHomeRamFor(ns, scriptRam);
  }

  const pid = ns.run(script, 1, ...args);

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

  const killOrder = [
    '/workers/w1.js',
    '/workers/g1.js',
    '/workers/h1.js',
    '/tools/final-level-study-service.js',
    '/tools/faction-work-service.js',
    '/economy/stock-trader.js',
    FULL_DAEMON,
    GANG_MANAGER,
    HOME_RAM_BUYER,
    DASHBOARD_STATE_WRITER,
    DASHBOARD_COMMAND_RUNNER,
  ];

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

function getScriptRam(ns, script) {
  try {
    return ns.getScriptRam(script, 'home');
  } catch {
    return 0;
  }
}

function formatRam(value) {
  const n = Number(value) || 0;
  if (n >= 1024) return `${(n / 1024).toFixed(2)}TB`;
  return `${n.toFixed(2)}GB`;
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
