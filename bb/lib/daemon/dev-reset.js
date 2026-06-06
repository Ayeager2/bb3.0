export const VOLATILE_FILES = [
    "/data/daemon-state.txt",
    "/data/target-state.txt",
    "/data/service-state.txt",
    "/data/service-completions.txt",
];

export const COMPLETION_FILES = [
    "/data/darkweb-buyer-complete.txt",
];

export const SESSION_FILES = [
    "/data/backdoor-ai-state.txt",
    "/data/backdoor-state.txt",
    "/data/darkweb-purchase-state.txt",
    "/data/faction-state.txt",
    "/data/faction-join-state.txt",
];

export const DEV_REFRESH_FILES = [
    ...VOLATILE_FILES,
    ...COMPLETION_FILES,
    ...SESSION_FILES,
];

/** @param {NS} ns */
export function refreshDaemonState(ns, options = {}) {
    const {
        volatile = true,
        completions = true,
        sessions = true,
        verbose = true,
    } = options;

    const files = [];

    if (volatile) files.push(...VOLATILE_FILES);
    if (completions) files.push(...COMPLETION_FILES);
    if (sessions) files.push(...SESSION_FILES);

    return removeFiles(ns, unique(files), verbose);
}

/** @param {NS} ns */
export function refreshAllDaemonState(ns, options = {}) {
    const { verbose = true } = options;
    return removeFiles(ns, unique(DEV_REFRESH_FILES), verbose);
}

/** @param {NS} ns */
function removeFiles(ns, files, verbose) {
    let removed = 0;

    for (const file of files) {
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

function unique(values) {
    return [...new Set(values)];
}