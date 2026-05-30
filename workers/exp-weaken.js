/** @param {NS} ns **/
export async function main(ns) {
    const target = String(ns.args[0] ?? "joesguns");

    while (true) {
        if (!target || target === "home" || !ns.serverExists(target)) {
            await ns.sleep(1000);
            continue;
        }

        await ns.weaken(target);
    }
}