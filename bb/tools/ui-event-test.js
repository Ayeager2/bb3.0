// /tools/ui-event-test.js

import { writeUiEvent } from "/lib/ui/event-log.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    writeUiEvent(ns, "system", "Dashboard event bridge test.", {
        level: "success",
    });

    ns.tprint("Wrote test UI event.");
}