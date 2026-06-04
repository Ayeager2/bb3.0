/** @param {NS} ns **/
export async function main(ns) {
    ns.write("/data/reset-armed.txt", "true", "w");

    ns.tprint("[RESET] Armed reset system.");
    ns.toast("Reset system armed.", "success", 5000);
}