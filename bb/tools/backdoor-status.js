import { buildBackdoorState } from "/lib/daemon/backdoor.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const state = buildBackdoorState(ns);

  ns.tprint("=== Backdoor Progression Status ===");

  for (const item of state.progressionServers) {
    ns.tprint(
      `${item.server} / ${item.faction} | ` +
      `root=${yes(item.rooted)} | ` +
      `hack=${yes(item.hackingEligible)} ${item.playerHack}/${item.requiredHack} | ` +
      `backdoor=${yes(item.backdoored)} | ` +
      `ready=${yes(item.recommended)}`
    );

    if (item.path?.length) {
      ns.tprint(`  path: ${item.path.join(" -> ")}`);
    }
  }

  if (state.nextTarget) {
    ns.tprint("");
    ns.tprint(
      `NEXT: ${state.nextTarget.server} for ${state.nextTarget.faction}`
    );
    ns.tprint(`PATH: ${state.nextTarget.path.join(" -> ")}`);
  } else {
    ns.tprint("");
    ns.tprint("NEXT: no backdoor target currently ready");
  }
}

function yes(value) {
  return value ? "YES" : "NO";
}