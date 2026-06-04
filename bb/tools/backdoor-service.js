// /tools/backdoor-service.js
import { buildBackdoorState } from "/lib/daemon/backdoor.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["refresh", 15000],
    ["execute", true],
  ]);
  while (true) {
    tryRootProgressionServers(ns);
    const state = buildBackdoorState(ns);
    const target = state.nextTarget;

    if (!target) {
      await ns.sleep(flags.refresh);
      continue;
    }

    ns.toast(`Backdoor ready: ${target.server}`, "info", 8000);
    ns.tprint(`[BACKDOOR] Ready: ${target.server} / ${target.faction}`);

    if (flags.execute && hasSingularity(ns)) {
      const success = await installBackdoor(ns, target.path, target.server);

      if (success) {
        ns.toast(`Backdoored ${target.server}`, "success", 10000);
        ns.tprint(`[BACKDOOR] SUCCESS: ${target.server}`);
      } else {
        ns.toast(`Backdoor failed: ${target.server}`, "warning", 10000);
        ns.tprint(`[BACKDOOR] FAILED: ${target.server}`);
      }

      try {
        ns.singularity.connect("home");
      } catch (error) {
    console.error(error);
}
    }

    await ns.sleep(flags.refresh);
  }
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

    for (const host of path) {
      const ok = ns.singularity.connect(host);
      if (!ok) return false;
    }

    await ns.singularity.installBackdoor();

    return ns.getServer(target).backdoorInstalled === true;
  } catch (error) {
    ns.tprint(`[BACKDOOR] Error: ${String(error)}`);
    return false;
  }
}

function tryRootProgressionServers(ns) {
  const targets = [
    "CSEC",
    "avmnite-02h",
    "I.I.I.I",
    "run4theh111z",
    "w0r1d_d43m0n",
  ];

  for (const server of targets) {
    if (!serverExists(ns, server)) continue;
    if (ns.hasRootAccess(server)) continue;

    const requiredHack = ns.getServerRequiredHackingLevel(server);
    if (ns.getHackingLevel() < requiredHack) continue;

    const requiredPorts = ns.getServerNumPortsRequired(server);
    const opened = openPorts(ns, server);

    if (opened < requiredPorts) continue;

    try {
      ns.nuke(server);
      ns.tprint(`[BACKDOOR] Rooted ${server}`);
    } catch (error) {
      ns.tprint(`[BACKDOOR] Failed to root ${server}: ${String(error)}`);
    }
  }
}

function openPorts(ns, server) {
  let opened = 0;

  if (ns.fileExists("BruteSSH.exe", "home")) {
    try { ns.brutessh(server); opened++; } catch { /* empty */ }
  }

  if (ns.fileExists("FTPCrack.exe", "home")) {
    try { ns.ftpcrack(server); opened++; } catch { /* empty */ }
  }

  if (ns.fileExists("relaySMTP.exe", "home")) {
    try { ns.relaysmtp(server); opened++; } catch { /* empty */ }
  }

  if (ns.fileExists("HTTPWorm.exe", "home")) {
    try { ns.httpworm(server); opened++; } catch { /* empty */ }
  }

  if (ns.fileExists("SQLInject.exe", "home")) {
    try { ns.sqlinject(server); opened++; } catch { /* empty */ }
  }

  return opened;
}

function serverExists(ns, server) {
  try {
    return ns.serverExists(server);
  } catch {
    return false;
  }
}