// /tools/darknet-scout.js
const DATA_FILE = '/data/darknet-scout.txt';
const SCRIPT = '/tools/darknet-scout.js';

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog('ALL');

  const flags = ns.flags([
    ['depth', 3],
    ['password', ''],
    ['auth', true],
    ['realloc', false],
    ['stasis', false],
    ['peek', true],
    ['spread', true],
    ['refresh', 60000],
    ['once', true],
    ['child', false],
    ['origin', ''],
  ]);

  const options = {
    maxDepth: Math.max(0, Number(flags.depth) || 0),
    password: String(flags.password ?? ''),
    doAuth: asBool(flags.auth),
    doRealloc: asBool(flags.realloc),
    doStasis: asBool(flags.stasis),
    peek: asBool(flags.peek),
    spread: asBool(flags.spread),
    refreshMs: Math.max(5000, Number(flags.refresh) || 60000),
    once: asBool(flags.once),
    child: asBool(flags.child),
    origin: String(flags.origin ?? ''),
  };

  while (true) {
    const state = await buildDarknetScoutState(ns, options);
    const outFile = getOutputFile(ns, options);

    writeJson(ns, outFile, state);

    if (options.child) {
      await copyReportHome(ns, outFile);
    }

    printSummary(ns, state, outFile, options);

    if (options.once) return;

    await ns.sleep(options.refreshMs);
  }
}

async function buildDarknetScoutState(ns, options) {
  const start = safeHostname(ns);

  if (!hasDnet(ns)) {
    return {
      updatedAt: Date.now(),
      updatedAtText: new Date().toLocaleTimeString(),
      status: 'unavailable',
      start,
      reason: 'ns.dnet API not available. Buy/run DarkscapeNavigator.exe first.',
      hasNavigator: ns.fileExists('DarkscapeNavigator.exe', 'home'),
      results: [],
      launches: [],
    };
  }

  const seen = new Set();
  const results = [];
  const launches = [];

  await walk(ns, start, 0, options, seen, results, launches);

  return {
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    status: 'ready',
    start,
    child: options.child,
    origin: options.origin || null,
    maxDepth: options.maxDepth,
    options: {
      auth: options.doAuth,
      realloc: options.doRealloc,
      stasis: options.doStasis,
      peek: options.peek,
      spread: options.spread,
    },
    totals: summarizeResults(results, launches),
    results,
    launches,
  };
}

async function walk(ns, host, depth, options, seen, results, launches) {
  if (seen.has(host) || depth > options.maxDepth) return;
  seen.add(host);

  const neighbors = safeProbe(ns);

  if (!Array.isArray(neighbors)) {
    results.push({
      host,
      depth,
      error: 'probe failed or returned no list',
    });
    return;
  }

  for (const target of neighbors) {
    const record = await inspectTarget(ns, target, depth + 1, options);
    results.push(record);

    if (record.authenticated && options.spread && depth + 1 < options.maxDepth && !options.child) {
      const launch = await launchChildScout(ns, target, options, depth + 1);
      launches.push(launch);
    }
  }
}

async function inspectTarget(ns, host, depth, options) {
  const record = {
    host,
    depth,
    isDarknet: false,
    isOnline: null,
    darknetDepth: null,
    requiredCharisma: null,
    blockedRam: null,
    maxRam: 0,
    usedRam: 0,
    details: null,
    logs: [],
    authenticated: false,
    authResult: null,
    reallocResult: null,
    stasisResult: null,
  };

  try {
    record.isDarknet = callDnet(ns, 'isDarknetServer', host) === true;
    record.darknetDepth = callDnet(ns, 'getDepth', host);
    record.requiredCharisma = callDnet(ns, 'getServerRequiredCharismaLevel', host);
    record.blockedRam = callDnet(ns, 'getBlockedRam', host);
    record.details = callDnet(ns, 'getServerDetails', host);
    record.isOnline = record.details?.isOnline ?? null;
    record.maxRam = safeMaxRam(ns, host);
    record.usedRam = safeUsedRam(ns, host);
  } catch (error) {
    record.error = `details failed: ${String(error)}`;
  }

  try {
    const heartbleed = await ns.dnet.heartbleed(host, { peek: options.peek });
    record.logs = Array.isArray(heartbleed?.logs) ? heartbleed.logs : [];
    record.heartbleed = summarizeResult(heartbleed);
  } catch (error) {
    record.heartbleedError = String(error);
  }

  if (options.doAuth) {
    try {
      const auth = await ns.dnet.authenticate(host, options.password, 0);
      record.authenticated = auth?.success === true;
      record.authResult = summarizeResult(auth);
    } catch (error) {
      record.authError = String(error);
    }
  }

  if (record.authenticated && options.doRealloc) {
    try {
      const realloc = await ns.dnet.memoryReallocation(host);
      record.reallocResult = summarizeResult(realloc);
    } catch (error) {
      record.reallocError = String(error);
    }
  }

  if (record.authenticated && options.doStasis) {
    try {
      const stasis = await ns.dnet.setStasisLink(true);
      record.stasisResult = summarizeResult(stasis);
    } catch (error) {
      record.stasisError = String(error);
    }
  }

  ns.print(
    `[DNET] ${host} auth=${record.authenticated} ` +
      `ram=${record.usedRam}/${record.maxRam} blocked=${record.blockedRam}`,
  );

  return record;
}

async function launchChildScout(ns, target, options, depth) {
  const launch = {
    target,
    depth,
    copied: false,
    pid: 0,
    reason: '',
  };

  try {
    launch.copied = await ns.scp(SCRIPT, target, 'home');
  } catch (error) {
    launch.reason = `copy failed: ${String(error)}`;
    return launch;
  }

  if (isScoutAlreadyRunning(ns, target)) {
    launch.reason = 'child scout already running';
    return launch;
  }

  const freeRam = safeMaxRam(ns, target) - safeUsedRam(ns, target);
  const scriptRam = safeScriptRam(ns, SCRIPT, target);

  if (scriptRam <= 0) {
    launch.reason = 'script RAM unavailable on target';
    return launch;
  }

  if (freeRam < scriptRam) {
    launch.reason = `not enough RAM: needs ${scriptRam}, free ${freeRam}`;
    return launch;
  }

  try {
    launch.pid = ns.exec(
      SCRIPT,
      target,
      1,
      '--depth',
      Math.max(0, options.maxDepth - depth),
      '--password',
      options.password,
      '--auth',
      options.doAuth,
      '--realloc',
      options.doRealloc,
      '--stasis',
      options.doStasis,
      '--peek',
      options.peek,
      '--spread',
      false,
      '--once',
      true,
      '--child',
      true,
      '--origin',
      safeHostname(ns),
    );

    launch.reason = launch.pid > 0 ? 'started child scout' : 'exec returned 0';
  } catch (error) {
    launch.reason = `exec failed: ${String(error)}`;
  }

  return launch;
}

function hasDnet(ns) {
  return !!(ns.dnet && typeof ns.dnet.probe === 'function');
}

function safeProbe(ns) {
  try {
    return ns.dnet.probe(false) ?? [];
  } catch {
    return null;
  }
}

function callDnet(ns, method, ...args) {
  const fn = ns.dnet?.[method];

  if (typeof fn !== 'function') return null;

  return fn.apply(ns.dnet, args);
}

async function copyReportHome(ns, file) {
  const host = safeHostname(ns);

  if (host === 'home') return true;

  try {
    return await ns.scp(file, 'home', host);
  } catch {
    return false;
  }
}

function getOutputFile(ns, options) {
  if (!options.child) return DATA_FILE;

  return `/data/darknet-scout-${sanitizeFilePart(safeHostname(ns))}.txt`;
}

function summarizeResult(result) {
  if (!result || typeof result !== 'object') return result;

  return {
    success: result.success,
    message: result.message,
    error: result.error,
  };
}

function summarizeResults(results, launches) {
  return {
    records: results.length,
    darknetServers: results.filter((item) => item.isDarknet === true).length,
    authenticated: results.filter((item) => item.authenticated === true).length,
    online: results.filter((item) => item.isOnline === true).length,
    errors: results.filter((item) => item.error || item.authError || item.heartbleedError).length,
    childLaunches: launches.filter((item) => item.pid > 0).length,
  };
}

function printSummary(ns, state, file, options) {
  ns.clearLog();
  ns.print('Darknet Scout');
  ns.print('='.repeat(60));
  ns.print(`Status: ${state.status}`);
  ns.print(`Start: ${state.start}`);
  ns.print(`Depth: ${options.maxDepth}`);
  ns.print(`Auth: ${options.doAuth ? 'ON' : 'OFF'}`);
  ns.print(`Peek: ${options.peek ? 'ON' : 'OFF'}`);
  ns.print(`Realloc: ${options.doRealloc ? 'ON' : 'OFF'}`);
  ns.print(`Stasis: ${options.doStasis ? 'ON' : 'OFF'}`);
  ns.print(`Spread: ${options.spread ? 'ON' : 'OFF'}`);

  if (state.status !== 'ready') {
    ns.print(`DarkscapeNavigator.exe: ${state.hasNavigator ? 'YES' : 'NO'}`);
    ns.print(state.reason ?? 'waiting');
    if (options.once) ns.tprint(`[DNET] ${state.reason ?? 'not ready'}`);
    return;
  }

  ns.print('-'.repeat(60));
  ns.print(`Records: ${state.totals.records}`);
  ns.print(`Authenticated: ${state.totals.authenticated}`);
  ns.print(`Child scouts: ${state.totals.childLaunches}`);

  //   if (options.once) {
  //     ns.tprint(`[DNET] Scout complete. Found ${state.totals.records} records. Wrote ${file}`);
  //   }
}

function safeHostname(ns) {
  try {
    return ns.getHostname();
  } catch {
    return 'home';
  }
}

function safeMaxRam(ns, host) {
  try {
    return ns.getServerMaxRam(host);
  } catch {
    return 0;
  }
}

function safeUsedRam(ns, host) {
  try {
    return ns.getServerUsedRam(host);
  } catch {
    return 0;
  }
}

function safeScriptRam(ns, script, host) {
  try {
    return ns.getScriptRam(script, host);
  } catch {
    return 0;
  }
}

function isScoutAlreadyRunning(ns, host) {
  try {
    return ns
      .ps(host)
      .some(
        (process) => process.filename === SCRIPT || process.filename === SCRIPT.replace(/^\/+/, ''),
      );
  } catch {
    return false;
  }
}

function asBool(value) {
  return value === true || value === 'true';
}

function sanitizeFilePart(value) {
  return String(value ?? 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function writeJson(ns, file, data) {
  ns.write(file, JSON.stringify(data, null, 2), 'w');
}
