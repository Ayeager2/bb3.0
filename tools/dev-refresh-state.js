// /tools/dev-refresh-state.js

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

 const files = [
  "/data/backdoor-ai-state.txt",
  "/data/backdoor-state.txt",

  "/data/darkweb-purchase-state.txt",
  "/data/darkweb-buyer-complete.txt",

  "/data/daemon-state.txt",
  "/data/target-state.txt",
  "/data/faction-state.txt",
  "/data/faction-join-state.txt",
  "/data/service-state.txt",
  "/data/service-completions.txt",
];

  let removed = 0;

  for (const file of files) {
    if (ns.fileExists(file, "home")) {
      const success = ns.rm(file, "home");

      if (success) {
        removed++;
        ns.tprint(`[DEV REFRESH] Removed ${file}`);
      } else {
        ns.tprint(`[DEV REFRESH] FAILED to remove ${file}`);
      }
    }
  }

  ns.tprint(`[DEV REFRESH] Complete. Removed ${removed} files.`);
  ns.tprint("[DEV REFRESH] Restart daemon.js now.");
}