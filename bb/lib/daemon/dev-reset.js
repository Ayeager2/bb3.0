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

export const AUGMENTATION_FILES = [
    "/data/augmentation-state.txt",
    "/data/augmentation-cache.txt",
    "/data/augmentation-data-builder-complete.txt",
    "/data/augmentation-plan.txt",
    "/data/augmentation-buyer-state.txt",
    "/data/augmentation-events.txt",
    "/data/faction-work-plan.txt",
    "/data/faction-donation-plan.txt",
    "/data/faction-donation-state.txt",
];

export const DEV_REFRESH_FILES = [
    ...VOLATILE_FILES,
    ...COMPLETION_FILES,
    ...SESSION_FILES,
    ...AUGMENTATION_FILES,
];

const PRESERVED_DATA_TEXT_FILES = new Set([
    "/data/purchase-ledger.txt",
]);

/** @param {NS} ns */
export function refreshDaemonState(ns, options = {}) {
    const {
        volatile = true,
        completions = true,
        sessions = true,
        allDataText = true,
        verbose = true,
    } = options;

    const files = [];

    if (allDataText) files.push(...findDataTextFiles(ns));
    if (volatile) files.push(...VOLATILE_FILES);
    if (completions) files.push(...COMPLETION_FILES);
    if (sessions) files.push(...SESSION_FILES);
    files.push(...AUGMENTATION_FILES);

    return removeFiles(ns, unique(files), verbose);
}

/** @param {NS} ns */
export function refreshAllDaemonState(ns, options = {}) {
    const { verbose = true } = options;
    return removeFiles(ns, unique([...findDataTextFiles(ns), ...DEV_REFRESH_FILES]), verbose);
}

/** @param {NS} ns */
function findDataTextFiles(ns) {
    try {
        return ns
            .ls("home", "/data/")
            .map(normalizeDataPath)
            .filter(file =>
                file.startsWith("/data/") &&
                file.endsWith(".txt") &&
                !PRESERVED_DATA_TEXT_FILES.has(file)
            );
    } catch {
        return [];
    }
}

function normalizeDataPath(file) {
    const path = String(file ?? "");
    if (path.startsWith("/")) return path;
    return `/${path}`;
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
