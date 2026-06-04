//bb/workers/tiny-worker.js
const TARGET_FILE = "/data/bootstrap-target.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    while (true) {
        const target = readTarget(ns) || String(ns.args[0] ?? "n00dles");

        if (!isValidTarget(ns, target)) {
            await ns.sleep(1000);
            continue;
        }

        const money = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);
        const sec = ns.getServerSecurityLevel(target);
        const minSec = ns.getServerMinSecurityLevel(target);

        if (sec > minSec + 5) {
            await ns.weaken(target);
        } else if (money < maxMoney * 0.75) {
            await ns.grow(target);
        } else {
            await ns.hack(target);
        }
    }
}

function readTarget(ns) {
    try {
        const target = ns.read(TARGET_FILE).trim();
        return target || null;
    } catch {
        return null;
    }
}

function isValidTarget(ns, target) {
    try {
        return (
            target &&
            target !== "home" &&
            ns.serverExists(target) &&
            ns.hasRootAccess(target) &&
            ns.getServerRequiredHackingLevel(target) <= ns.getHackingLevel() &&
            ns.getServerMaxMoney(target) > 0
        );
    } catch {
        return false;
    }
}