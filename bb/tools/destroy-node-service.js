//bb\tools\destroy-node-service.js
import { refreshDaemonState } from "/lib/daemon/dev-reset.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["next", 4],
        ["script", "daemon.js"],
        ["clean", true],
        ["volatile", true],
        ["completions", true],
        ["sessions", true],
    ]);

    const target = "w0r1d_d43m0n";
    const nextBitNode = Number(flags.next ?? ns.args[0] ?? 4);
    const nextScript = String(flags.script ?? ns.args[1] ?? "daemon.js");

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

    if (flags.clean === true || flags.clean === "true") {
        ns.tprint("[DESTROY] Refreshing daemon state before BitNode destruction...");

        refreshDaemonState(ns, {
            volatile: flags.volatile === true || flags.volatile === "true",
            completions: flags.completions === true || flags.completions === "true",
            sessions: flags.sessions === true || flags.sessions === "true",
            verbose: true,
        });
    }

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