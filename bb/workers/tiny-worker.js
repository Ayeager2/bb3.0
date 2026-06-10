//bb/workers/tiny-worker.js
const TARGET_FILE = "/data/bootstrap-target.txt";
const PLAN_FILE = "/data/bootstrap-plan.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const role = normalizeRole(ns.args[0]);

    while (true) {
        const target = readTarget(ns) || "n00dles";

        if (!isValidTarget(ns, target)) {
            await ns.sleep(1000);
            continue;
        }

        const money = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);
        const sec = ns.getServerSecurityLevel(target);
        const minSec = ns.getServerMinSecurityLevel(target);
        const plan = readPlan(ns, target);

        if (role === "weaken") {
            await ns.weaken(target);
        } else if (role === "grow") {
            await ns.grow(target);
        } else if (role === "hack") {
            await ns.hack(target);
        } else if (sec > minSec + Number(plan?.weakenAtSecurityGap ?? 5)) {
            await ns.weaken(target);
        } else if (money < maxMoney * Number(plan?.growAtMoneyRatio ?? 0.75)) {
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

function normalizeRole(value) {
    const role = String(value ?? "auto").toLowerCase();
    return ["hack", "grow", "weaken"].includes(role) ? role : "auto";
}

function readPlan(ns, target) {
    try {
        const plan = JSON.parse(ns.read(PLAN_FILE));
        return plan?.target === target ? plan : null;
    } catch {
        return null;
    }
}
