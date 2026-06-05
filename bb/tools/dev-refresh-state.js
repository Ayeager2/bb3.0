import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  refreshDaemonState(ns);

  ns.tprint("[DEV REFRESH] Restart daemon.js now.");
}