/** @param {NS} ns **/
export async function main(ns) {
    const power = ns.getSharePower();

    ns.tprint("========== SHARE STATUS ==========");
    ns.tprint(`Share Power Multiplier: ${power.toFixed(4)}x`);

    if (power <= 1) {
        ns.tprint("Share is technically running but not contributing much yet.");
    } else {
        ns.tprint("Share bonus is active.");
    }
}