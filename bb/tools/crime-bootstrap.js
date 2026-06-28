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
            const selectedCrime =
                crime.toLowerCase() === "auto"
                    ? chooseBestCrime(ns)
                    : crime;
            const wait = ns.singularity.commitCrime(selectedCrime, focus);
            await ns.sleep(wait + 100);
        } catch {
            ns.tprint("[CRIME BOOTSTRAP] Singularity crime API unavailable.");
            return;
        }
    }
}

function chooseBestCrime(ns) {
    const crimes = [
        "Shoplift",
        "Rob Store",
        "Mug",
        "Larceny",
        "Deal Drugs",
        "Bond Forgery",
        "Traffick Arms",
        "Homicide",
        "Grand Theft Auto",
        "Kidnap",
        "Assassination",
        "Heist",
    ];

    const choices = crimes
        .map(crime => getCrimeChoice(ns, crime))
        .filter(choice => choice.chance >= 0.35)
        .sort((a, b) => b.score - a.score);

    return choices[0]?.name ?? "Mug";
}

function getCrimeChoice(ns, crime) {
    try {
        const stats = ns.singularity.getCrimeStats(crime);
        const chance = ns.singularity.getCrimeChance(crime);
        const seconds = Math.max(1, stats.time ?? 1) / 1000;
        const expectedMoneyPerSecond = ((stats.money ?? 0) * chance) / seconds;
        const combatExpPerSecond =
            (
                (stats.strength_exp ?? 0) +
                (stats.defense_exp ?? 0) +
                (stats.dexterity_exp ?? 0) +
                (stats.agility_exp ?? 0)
            ) * chance / seconds;

        return {
            name: crime,
            chance,
            score: expectedMoneyPerSecond + combatExpPerSecond * 1000,
        };
    } catch {
        return {
            name: crime,
            chance: 0,
            score: 0,
        };
    }
}
