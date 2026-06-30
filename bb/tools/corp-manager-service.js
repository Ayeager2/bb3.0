// /tools/corp-manager-service.js

import { CORP_CONFIG, CORP_STATE_FILE } from "/lib/corp/config.js";
import { runCorporationCycle } from "/lib/corp/actions.js";
import { writeJson } from "/lib/corp/safe.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 5000],
        ["name", CORP_CONFIG.name],
        ["self-fund", false],
        ["tail", false],
        ["once", false],
    ]);

    if (flags.tail) ns.ui.openTail();

    const refreshMs = Number(flags.refresh) || 5000;
    const options = {
        name: String(flags.name || CORP_CONFIG.name),
        selfFund: flags["self-fund"] === true,
    };

    while (true) {
        const state = runCorporationCycle(ns, options);
        writeJson(ns, CORP_STATE_FILE, state);

        ns.clearLog();
        ns.print("Corporation Manager");
        ns.print("===================");
        ns.print(`Status: ${state.status}`);
        ns.print(`Stage: ${state.stage ?? "none"}`);
        ns.print(`Message: ${state.message}`);
        for (const action of state.actions ?? []) ns.print(`- ${action}`);

        if (flags.once) {
            ns.tprint(`[CORP] ${state.message}`);
            return;
        }

        await ns.sleep(refreshMs);
    }
}
