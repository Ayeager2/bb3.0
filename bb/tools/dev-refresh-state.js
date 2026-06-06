//bb\tools\dev-refresh-state.js
import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["volatile", true],
    ["completions", true],
    ["sessions", true],
    ["quiet", false],
  ]);

  refreshDaemonState(ns, {
    volatile: flags.volatile === true || flags.volatile === "true",
    completions: flags.completions === true || flags.completions === "true",
    sessions: flags.sessions === true || flags.sessions === "true",
    verbose: !(flags.quiet === true || flags.quiet === "true"),
  });

  ns.tprint("[DEV REFRESH] Restart daemon.js now.");
}