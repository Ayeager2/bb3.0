//bb\tools\dev-refresh-state.js
import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["volatile", true],
    ["completions", true],
    ["sessions", true],
    ["all-data-text", true],
    ["quiet", false],
  ]);

  const daemonWasRunning =
    ns.ps("home").some(process =>
      process.filename === "daemon.js" ||
      process.filename === "/daemon.js"
    );

  refreshDaemonState(ns, {
    volatile: flags.volatile === true || flags.volatile === "true",
    completions: flags.completions === true || flags.completions === "true",
    sessions: flags.sessions === true || flags.sessions === "true",
    allDataText: flags["all-data-text"] === true || flags["all-data-text"] === "true",
    verbose: !(flags.quiet === true || flags.quiet === "true"),
  });

  if (daemonWasRunning) {
    ns.tprint("[DEV REFRESH] daemon.js was running while state was removed.");
  }

  ns.tprint("[DEV REFRESH] Restart daemon.js now.");
}
