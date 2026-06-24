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
    ["target", ""],
    ["once", false],
    ["toast", false],
    ["terminal", false],
  ]);

  const refreshMs = Number(flags.refresh) || 15000;
  const execute = flags.execute === true || flags.execute === "true";
  const debug = flags.debug === true || flags.debug === "true";
  const targetOverride = normalizeTarget(flags.target);
  const once = flags.once === true || flags.once === "true";
  const toast = flags.toast === true || flags.toast === "true";
  const terminal =
    flags.terminal === true ||
    flags.terminal === "true" ||
    once;

  while (true) {
    const rootReport = tryRootProgressionServers(ns, debug, terminal);
    const state = buildBackdoorState(ns);
    const target =
      targetOverride
        ? getTargetState(state, targetOverride)
        : state.nextTarget;

    writeJson(ns, STATE_FILE, {
      updatedAt: Date.now(),
      updatedAtText: new Date().toLocaleTimeString(),
      execute,
      targetOverride,
      rootReport,
      backdoorState: state,
      nextTarget: target,
    });

    if (!target) {
      if (debug) {
        const blocker = getBestBlocker(state);
        ns.print(`[BACKDOOR] No ready target. ${blocker}`);
        if (terminal) ns.tprint(`[BACKDOOR] No ready target. ${blocker}`);
      }

      if (once) return;
      await ns.sleep(refreshMs);
      continue;
    }


    if (targetOverride && !target.recommended) {
      const message =
        `[BACKDOOR] ${target.server} not ready: ${target.reason}. ` +
        `root=${target.rooted} backdoor=${target.backdoored} ` +
        `hack=${target.playerHack}/${target.requiredHack}`;

      ns.print(message);
      if (terminal) ns.tprint(message);

      if (once) return;
      await ns.sleep(refreshMs);
      continue;
    }

    notify(ns, `[BACKDOOR] Ready: ${target.server} / ${target.faction}`, {
      terminal,
      toast,
      toastMessage: `Backdoor ready: ${target.server}`,
      toastType: "info",
      toastMs: 8000,
    });

    if (execute && hasSingularity(ns)) {
      const success = await installBackdoor(ns, target.path, target.server, terminal);

      if (success) {
        notify(ns, `[BACKDOOR] SUCCESS: ${target.server}`, {
          terminal,
          toast,
          toastMessage: `Backdoored ${target.server}`,
          toastType: "success",
          toastMs: 10000,
        });
      } else {
        notify(ns, `[BACKDOOR] FAILED: ${target.server}`, {
          terminal,
          toast,
          toastMessage: `Backdoor failed: ${target.server}`,
          toastType: "warning",
          toastMs: 10000,
        });
      }

      connectHome(ns);
    } else if (!hasSingularity(ns)) {
      notify(ns, "[BACKDOOR] Singularity unavailable; cannot auto-connect/install.", {
        terminal,
        toast: false,
      });
    }

    if (once) return;
    await ns.sleep(refreshMs);
  }
}

function getTargetState(state, target) {
  const servers = Array.isArray(state?.progressionServers)
    ? state.progressionServers
    : [];

  return servers.find(item => item.server === target) ?? null;
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

async function installBackdoor(ns, path, target, terminal = false) {
  try {
    if (!Array.isArray(path) || path.length === 0) return false;

    connectHome(ns);

    for (const host of path) {
      const ok = ns.singularity.connect(host);
      if (!ok) {
        notify(ns, `[BACKDOOR] Failed connect step: ${host}`, {
          terminal,
          toast: false,
        });
        return false;
      }
    }

    await ns.singularity.installBackdoor();

    return ns.getServer(target).backdoorInstalled === true;
  } catch (error) {
    notify(ns, `[BACKDOOR] Error: ${String(error)}`, {
      terminal,
      toast: false,
    });
    return false;
  }
}

function tryRootProgressionServers(ns, debug = false, terminal = false) {
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
      notify(ns, `[BACKDOOR] Rooted ${server}`, {
        terminal,
        toast: false,
      });
    } catch (error) {
      entry.reason = `nuke failed: ${String(error)}`;
      notify(ns, `[BACKDOOR] Failed to root ${server}: ${String(error)}`, {
        terminal,
        toast: false,
      });
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

function notify(ns, message, options = {}) {
  ns.print(message);

  if (options.terminal === true) {
    ns.tprint(message);
  }

  if (options.toast === true) {
    ns.toast(
      options.toastMessage ?? message,
      options.toastType ?? "info",
      options.toastMs ?? 5000
    );
  }
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

function normalizeTarget(value) {
  const raw = String(value ?? "").trim();
  const lower = raw.toLowerCase();

  if (!raw) return "";
  if (
    lower === "run4thehills" ||
    lower === "run4thehi11z" ||
    lower === "run4theh111z"
  ) {
    return "run4theh111z";
  }

  return raw;
}

function writeJson(ns, file, data) {
  ns.write(file, JSON.stringify(data, null, 2), "w");
}
