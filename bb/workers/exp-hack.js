/** @param {NS} ns **/
export async function main(ns) {
    const target = String(ns.args[0] ?? "joesguns");

    while (true) {
        if (!target || target === "home" || !ns.serverExists(target)) {
            await ns.sleep(1000);
            continue;
        }

        try {
            await ns.hack(target);
        } catch {
            await ns.sleep(250);
        }
    }
}