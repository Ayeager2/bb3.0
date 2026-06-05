import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const target = "w0r1d_d43m0n";
    const nextBitNode = Number(ns.args[0] ?? 4);
    const nextScript = String(ns.args[1] ?? "daemon.js");

    if (!ns.serverExists(target)) {
        ns.tprint("[DESTROY] w0r1d_d43m0n not discovered.");
        return;
    }

    const hasRedPill = safeHasRedPill(ns);
    if (!hasRedPill) {
        ns.tprint("[DESTROY] Missing The Red Pill.");
        return;
    }

    if (!ns.hasRootAccess(target)) {
        ns.tprint("[DESTROY] Missing root access on w0r1d_d43m0n.");
        return;
    }

    const required = ns.getServerRequiredHackingLevel(target);
    const hacking = ns.getHackingLevel();

    if (hacking < required) {
        ns.tprint(`[DESTROY] Need hacking ${required}; current ${hacking}.`);
        return;
    }

    ns.tprint("[DESTROY] Refreshing daemon state before BitNode destruction...");
    refreshDaemonState(ns);

    ns.tprint(`[DESTROY] Destroying BitNode. Next BN=${nextBitNode}, script=${nextScript}`);

    await ns.singularity.destroyW0r1dD43m0n(
        nextBitNode,
        nextScript
    );
}

function safeHasRedPill(ns) {
    try {
        return ns.singularity
            .getOwnedAugmentations(true)
            .includes("The Red Pill");
    } catch {
        return false;
    }
}