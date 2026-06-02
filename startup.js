/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    await ns.sleep(1000);

    if (!ns.scriptRunning("daemon.js", "home")) {
        ns.run("daemon.js", 1);
    }
}