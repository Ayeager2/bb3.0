/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["stop-money", 10_000_000],
        ["stop-home-ram", 64],
        ["crime", "Mug"],
        ["focus", false],
    ]);

    const stopMoney = Number(flags["stop-money"]) || 10_000_000;
    const stopHomeRam = Number(flags["stop-home-ram"]) || 64;
    const crime = String(flags.crime || "Mug");
    const focus = flags.focus === true;

    while (true) {
        const money = ns.getPlayer().money;
        const homeRam = ns.getServerMaxRam("home");

        if (money >= stopMoney || homeRam >= stopHomeRam) {
            ns.tprint(`[CRIME BOOTSTRAP] Done. money=$${ns.format.number(money)} home=${ns.format.ram(homeRam)}`);
            return;
        }

        try {
            const wait = ns.singularity.commitCrime(crime, focus);
            await ns.sleep(wait + 100);
        } catch {
            ns.tprint("[CRIME BOOTSTRAP] Singularity crime API unavailable.");
            return;
        }
    }
}
