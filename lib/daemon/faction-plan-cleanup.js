export function clearStaleFactionPlans(ns) {
    safeRm(ns, "/data/faction-work-plan.txt");
    safeRm(ns, "/data/faction-donation-plan.txt");
    safeRm(ns, "/data/faction-progress-last.txt");
}

function safeRm(ns, file) {
    try {
        ns.rm(file, "home");
    } catch { }
}