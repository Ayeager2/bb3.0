// /tools/reset-executor-service.js

import {
    buildResetPlan,
    writeResetPlan,
} from "/lib/daemon/reset-planner.js";

const STARTUP_SCRIPT = "/startup.js";
const NEXT_SCRIPT = "/bootstrap-daemon.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["execute", false],
        ["force", false],
        ["next", NEXT_SCRIPT],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const execute = flags.execute === true;
    const force = flags.force === true;
    const nextScript = String(flags.next || NEXT_SCRIPT);

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

        ensureStartupScript(ns, nextScript);

        ns.tprint(`[RESET] Installing augmentations. Startup will launch ${nextScript}.`);
        ns.toast(`Installing augmentations -> ${nextScript}`, "warning", 10000);

        await ns.sleep(1000);

        ns.singularity.installAugmentations(STARTUP_SCRIPT);

        await ns.sleep(refreshMs);
    }
}

function ensureStartupScript(ns, nextScript) {
    const script = `/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const nextScript = "${nextScript}";

    await ns.sleep(1000);

    if (!ns.fileExists(nextScript, "home")) {
        ns.tprint("[STARTUP] Missing startup target: " + nextScript);
        return;
    }

    if (!ns.scriptRunning(nextScript, "home")) {
        const pid = ns.run(nextScript, 1);

        if (pid === 0) {
            ns.tprint("[STARTUP] Failed to launch " + nextScript + ". Not enough RAM?");
        } else {
            ns.tprint("[STARTUP] Launched " + nextScript + " PID=" + pid);
        }
    }
}
`;

    ns.write(STARTUP_SCRIPT, script, "w");
}