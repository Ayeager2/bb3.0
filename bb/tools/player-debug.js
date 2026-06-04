/** @param {NS} ns **/
export async function main(ns) {
    ns.tprint("Player Debug");
    ns.tprint("=".repeat(60));

    const player = ns.getPlayer();

    ns.tprint(JSON.stringify(player, null, 2));

    ns.tprint("-".repeat(60));

    try {
        ns.tprint("checkFactionInvitations:");
        ns.tprint(JSON.stringify(ns.singularity.checkFactionInvitations(), null, 2));
    } catch (e) {
        ns.tprint(`checkFactionInvitations failed: ${String(e)}`);
    }

    try {
        ns.tprint("getCurrentWork:");
        ns.tprint(JSON.stringify(ns.singularity.getCurrentWork(), null, 2));
    } catch (e) {
        ns.tprint(`getCurrentWork failed: ${String(e)}`);
    }
}