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
      } catch { }
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