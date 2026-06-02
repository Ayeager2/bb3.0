// /tools/backdoor-route.js
import { buildBackdoorState } from "/lib/daemon/backdoor.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["execute", false],
    ["target", ""],
  ]);

  const state = buildBackdoorState(ns);

  const target =
    flags.target ||
    state.nextTarget?.server ||
    null;

  if (!target) {
    ns.tprint("No backdoor target is currently ready.");
    return;
  }

  const item =
    state.progressionServers.find((x) => x.server === target) ??
    null;

  if (!item) {
    ns.tprint(`Target not found in backdoor progression list: ${target}`);
    return;
  }

  if (!item.exists) {
    ns.tprint(`${target} does not exist or has not been discovered yet.`);
    return;
  }

  if (!item.rooted) {
    ns.tprint(`${target} is not rooted yet.`);
    return;
  }

  if (!item.hackingEligible) {
    ns.tprint(
      `${target} requires hacking ${item.requiredHack}; current hacking is ${item.playerHack}.`
    );
    return;
  }

  if (item.backdoored) {
    ns.tprint(`${target} is already backdoored.`);
    return;
  }

  if (!item.path?.length) {
    ns.tprint(`No route found to ${target}.`);
    return;
  }

  ns.tprint(`=== Backdoor Route: ${target} / ${item.faction} ===`);
  ns.tprint("");
  ns.tprint("Manual terminal commands:");

  for (const host of item.path.slice(1)) {
    ns.tprint(`connect ${host}`);
  }

  ns.tprint("backdoor");
  ns.tprint("home");

  if (!flags.execute) {
    ns.tprint("");
    ns.tprint("To attempt automatic Singularity execution:");
    ns.tprint(`run /tools/backdoor-route.js --target ${target} --execute`);
    return;
  }

  if (!hasSingularity(ns)) {
    ns.tprint("");
    ns.tprint("Cannot auto-execute: Singularity API is not available.");
    return;
  }

  ns.tprint("");
  ns.tprint("Attempting automatic Singularity backdoor...");

  const success = await installBackdoorWithSingularity(ns, item.path, target);

  if (success) {
    ns.tprint(`SUCCESS: installed backdoor on ${target}.`);
  } else {
    ns.tprint(`FAILED: could not install backdoor on ${target}.`);
  }

  try {
    ns.singularity.connect("home");
  } catch (error) {
    console.error(error);
}
}

function hasSingularity(ns) {
  try {
    return !!ns.singularity?.connect && !!ns.singularity?.installBackdoor;
  } catch {
    return false;
  }
}

async function installBackdoorWithSingularity(ns, path, target) {
  try {
    for (const host of path) {
      const connected = ns.singularity.connect(host);

      if (!connected) {
        ns.tprint(`Failed to connect to ${host}.`);
        return false;
      }
    }

    await ns.singularity.installBackdoor();

    const server = ns.getServer(target);
    return server.backdoorInstalled === true;
  } catch (error) {
    ns.tprint(`Backdoor error: ${String(error)}`);
    return false;
  }
}