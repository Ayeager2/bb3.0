//tools/reset-executor-service.js
import {
    buildResetPlan,
    writeResetPlan,
    RESET_PLAN_FILE,
} from "/lib/daemon/reset-planner.js";

const STARTUP_SCRIPT = "/startup.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["execute", false],
        ["force", false],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const execute = flags.execute === true;
    const force = flags.force === true;

    while (true) {
        const plan = buildResetPlan(ns);
        writeResetPlan(ns, plan);

        if (!execute) {
            ns.print(`DRY RUN: ${plan.reason}`);
            await ns.sleep(refreshMs);
            continue;
        }

        if (!force && !plan.ready) {
            ns.print(`NOT READY: ${plan.reason}`);
            await ns.sleep(refreshMs);
            continue;
        }

        ensureStartupScript(ns);

        ns.tprint("[RESET] Installing augmentations. Startup will relaunch daemon.");
        ns.toast("Installing augmentations", "warning", 10000);

        await ns.sleep(1000);

        ns.singularity.installAugmentations(STARTUP_SCRIPT);

        await ns.sleep(refreshMs);
    }
}

function ensureStartupScript(ns) {
    const script = `/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    await ns.sleep(1000);

    if (!ns.scriptRunning("daemon.js", "home")) {
        ns.run("daemon.js", 1);
    }
}
`;

    ns.write(STARTUP_SCRIPT, script, "w");
}