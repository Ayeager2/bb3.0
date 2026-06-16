// /tools/reset-executor-service.js

import {
    buildResetPlan,
    writeResetPlan,
} from "/lib/daemon/reset-planner.js";

const STARTUP_SCRIPT = "/startup.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["execute", false],
        ["force", false],
        ["next", STARTUP_SCRIPT],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const execute = flags.execute === true;
    const force = flags.force === true;
    const nextScript = String(flags.next || STARTUP_SCRIPT);

    while (true) {
        const plan = buildResetPlan(ns);
        writeResetPlan(ns, plan);

        if (!execute) {
            ns.print(`[RESET] DRY RUN: ${plan.reason}`);
            await ns.sleep(refreshMs);
            continue;
        }

        if (!force && !plan.ready) {
            ns.print(`[RESET] NOT READY: ${plan.reason}`);
            await ns.sleep(refreshMs);
            continue;
        }

        if (!ns.fileExists(nextScript, "home")) {
            ns.tprint(`[RESET] Cannot install augmentations. Missing startup target: ${nextScript}`);
            await ns.sleep(refreshMs);
            continue;
        }

        ns.tprint(`[RESET] Installing augmentations. Startup will run ${nextScript}.`);
        ns.toast(`Installing augmentations -> ${nextScript}`, "warning", 10000);

        await ns.sleep(1000);
        ns.singularity.installAugmentations(nextScript);

        await ns.sleep(refreshMs);
    }
}
