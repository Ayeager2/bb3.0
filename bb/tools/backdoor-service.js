// /tools/backdoor-service.js
import { buildBackdoorState } from "/lib/daemon/backdoor.js";

const STATE_FILE = "/data/backdoor-service-state.txt";

const PROGRESSION_SERVERS = [
  "CSEC",
  "avmnite-02h",
  "I.I.I.I",
  "run4theh111z",
  "w0r1d_d43m0n",
];

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 15000],
    ["execute", true],
    ["debug", true],
  ]);

  const refreshMs = Number(flags.refresh) || 15000;
  const execute = flags.execute === true || flags.execute === "true";
  const debug = flags.debug === true || flags.debug === "true";

  while (true) {
    const rootReport = tryRootProgressionServers(ns, debug);
    const state = buildBackdoorState(ns);
    const target = state.nextTarget;

    writeJson(ns, STATE_FILE, {
      updatedAt: Date.now(),
      execute,
      rootReport,
      backdoorState: state,
      nextTarget: target,
    });

    if (!target) {
      if (debug) {
        const blocker = getBestBlocker(state);
        ns.print(`[BACKDOOR] No ready target. ${blocker}`);
      }

      await ns.sleep(refreshMs);
      continue;
    }

    ns.toast(`Backdoor ready: ${target.server}`, "info", 8000);
    ns.tprint(`[BACKDOOR] Ready: ${target.server} / ${target.faction}`);

    if (execute && hasSingularity(ns)) {
      const success = await installBackdoor(ns, target.path, target.server);

      if (success) {
        ns.toast(`Backdoored ${target.server}`, "success", 10000);
        ns.tprint(`[BACKDOOR] SUCCESS: ${target.server}`);
      } else {
        ns.toast(`Backdoor failed: ${target.server}`, "warning", 10000);
        ns.tprint(`[BACKDOOR] FAILED: ${target.server}`);
      }

      connectHome(ns);
    } else if (!hasSingularity(ns)) {
      ns.tprint("[BACKDOOR] Singularity unavailable; cannot auto-connect/install.");
    }

    await ns.sleep(refreshMs);
  }
}

function getBestBlocker(state) {
  const servers = Array.isArray(state?.progressionServers)
    ? state.progressionServers
    : [];

  const nextBlocked = servers.find(s =>
    s.exists &&
    !s.backdoored &&
    s.reason !== "already backdoored"
  );

  if (!nextBlocked) return "All known progression servers are done or unavailable.";

  return `${nextBlocked.server}: ${nextBlocked.reason}`;
}

function hasSingularity(ns) {
  try {
    return !!ns.singularity?.connect && !!ns.singularity?.installBackdoor;
  } catch {
    return false;
  }
}

async function installBackdoor(ns, path, target) {
  try {
    if (!Array.isArray(path) || path.length === 0) return false;

    connectHome(ns);

    for (const host of path) {
      const ok = ns.singularity.connect(host);
      if (!ok) {
        ns.tprint(`[BACKDOOR] Failed connect step: ${host}`);
        return false;
      }
    }

    await ns.singularity.installBackdoor();

    return ns.getServer(target).backdoorInstalled === true;
  } catch (error) {
    ns.tprint(`[BACKDOOR] Error: ${String(error)}`);
    return false;
  }
}

function tryRootProgressionServers(ns, debug = false) {
  const report = [];

  for (const server of PROGRESSION_SERVERS) {
    const entry = {
      server,
      exists: serverExists(ns, server),
      rooted: false,
      requiredHack: null,
      playerHack: ns.getHackingLevel(),
      requiredPorts: null,
      openedPorts: 0,
      rootedNow: false,
      reason: "",
    };

    if (!entry.exists) {
      entry.reason = "server not discovered";
      report.push(entry);
      continue;
    }

    entry.rooted = ns.hasRootAccess(server);

    if (entry.rooted) {
      entry.reason = "already rooted";
      report.push(entry);
      continue;
    }

    entry.requiredHack = ns.getServerRequiredHackingLevel(server);

    if (entry.playerHack < entry.requiredHack) {
      entry.reason = `needs hacking ${entry.requiredHack}`;
      report.push(entry);
      continue;
    }

    entry.requiredPorts = ns.getServerNumPortsRequired(server);
    entry.openedPorts = openPorts(ns, server);

    if (entry.openedPorts < entry.requiredPorts) {
      entry.reason = `needs ${entry.requiredPorts} ports; opened ${entry.openedPorts}`;
      report.push(entry);
      continue;
    }

    try {
      ns.nuke(server);
      entry.rootedNow = true;
      entry.rooted = true;
      entry.reason = "rooted now";
      ns.tprint(`[BACKDOOR] Rooted ${server}`);
    } catch (error) {
      entry.reason = `nuke failed: ${String(error)}`;
      ns.tprint(`[BACKDOOR] Failed to root ${server}: ${String(error)}`);
    }

    report.push(entry);
  }

  if (debug) {
    const blocked = report.find(r => !r.rooted && r.exists);
    if (blocked) {
      ns.print(`[BACKDOOR] Root blocker: ${blocked.server} - ${blocked.reason}`);
    }
  }

  return report;
}

function openPorts(ns, server) {
  let opened = 0;

  if (tryProgram(ns, "BruteSSH.exe", () => ns.brutessh(server))) opened++;
  if (tryProgram(ns, "FTPCrack.exe", () => ns.ftpcrack(server))) opened++;
  if (tryProgram(ns, "relaySMTP.exe", () => ns.relaysmtp(server))) opened++;
  if (tryProgram(ns, "HTTPWorm.exe", () => ns.httpworm(server))) opened++;
  if (tryProgram(ns, "SQLInject.exe", () => ns.sqlinject(server))) opened++;

  return opened;
}

function tryProgram(ns, file, fn) {
  if (!ns.fileExists(file, "home")) return false;

  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function connectHome(ns) {
  try {
    ns.singularity.connect("home");
  } catch {
    // ignore
  }
}

function serverExists(ns, server) {
  try {
    return ns.serverExists(server);
  } catch {
    return false;
  }
}

function writeJson(ns, file, data) {
  ns.write(file, JSON.stringify(data, null, 2), "w");
}