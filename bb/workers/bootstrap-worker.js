/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    let lastLog = 0;

    while (true) {
        const target = getBestBootstrapTarget(ns);

        if (!target) {
            await ns.sleep(1000);
            continue;
        }

        const money = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);
        const sec = ns.getServerSecurityLevel(target);
        const minSec = ns.getServerMinSecurityLevel(target);

        let action = "hack";

        if (sec > minSec + 5) {
            action = "weaken";
            await ns.weaken(target);
        } else if (money < maxMoney * 0.75) {
            action = "grow";
            await ns.grow(target);
        } else {
            action = "hack";
            await ns.hack(target);
        }

        if (Date.now() - lastLog > 10000) {
            const line =
                `[${new Date().toLocaleTimeString()}] ` +
                `target=${target} ` +
                `action=${action} ` +
                `money=${ns.formatNumber(money)} ` +
                `sec=${sec.toFixed(2)}\n`;

            ns.write("/data/bootstrap-log.txt", line, "a");

            lastLog = Date.now();
        }
    }
}