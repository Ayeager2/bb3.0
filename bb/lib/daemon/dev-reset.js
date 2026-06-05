export const DEV_REFRESH_FILES = [
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

/** @param {NS} ns */
export function refreshDaemonState(ns, options = {}) {
    const {
        verbose = true,
    } = options;

    let removed = 0;

    for (const file of DEV_REFRESH_FILES) {
        if (!ns.fileExists(file, "home")) continue;

        const success = ns.rm(file, "home");

        if (success) {
            removed++;

            if (verbose) {
                ns.tprint(`[DEV REFRESH] Removed ${file}`);
            }
        } else if (verbose) {
            ns.tprint(`[DEV REFRESH] FAILED ${file}`);
        }
    }

    if (verbose) {
        ns.tprint(`[DEV REFRESH] Complete. Removed ${removed} files.`);
    }

    return removed;
}