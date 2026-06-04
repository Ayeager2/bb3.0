
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const target = "w0r1d_d43m0n";

    if (!ns.hasRootAccess(target)) {
        ns.tprint("[DESTROY] Missing root access.");
        return;
    }

    const required =
        ns.getServerRequiredHackingLevel(target);

    if (ns.getHackingLevel() < required) {
        ns.tprint(
            `[DESTROY] Need hacking ${required}.`
        );
        return;
    }

    ns.tprint("[DESTROY] Destroying BitNode...");

    await ns.singularity.destroyW0r1dD43m0n(
        4,
        "daemon.js"
    );
}

