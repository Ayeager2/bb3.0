// /tools/int-farm.js
// Early-game Intelligence farmer.
// Requires Singularity API. Intelligence itself requires BN5/SF5.

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.ui.openTail();

    const flags = ns.flags([
        ["min-chance", 0.35],
        ["focus", false],
        ["mode", "int"], // int | balanced | money
        ["refresh", 1000],
    ]);

    const minChance = Number(flags["min-chance"]) || 0.35;
    const focus = flags.focus === true;
    const mode = String(flags.mode ?? "int");
    const refreshMs = Number(flags.refresh) || 1000;

    if (!ns.singularity?.commitCrime) {
        ns.tprint("[INT FARM] Missing Singularity API. Run this in BN4 or after getting Source-File 4.");
        return;
    }

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

    while (true) {
        const choices = crimes
            .map(crime => buildCrimeChoice(ns, crime, mode))
            .filter(x => x.chance >= minChance)
            .sort((a, b) => b.score - a.score);

        const best = choices[0] ?? buildCrimeChoice(ns, "Shoplift", mode);

        ns.clearLog();
        ns.print("=== INT FARM ===");
        ns.print(`Mode: ${mode}`);
        ns.print(`Crime: ${best.crime}`);
        ns.print(`Chance: ${formatPercent(best.chance)}`);
        ns.print(`INT/s expected: ${best.expectedIntPerSecond.toFixed(6)}`);
        ns.print(`Money/s expected: ${ns.format.number(best.expectedMoneyPerSecond, 2)}`);
        ns.print(`Time: ${(best.time / 1000).toFixed(1)}s`);

        const duration = ns.singularity.commitCrime(best.crime, focus);
        await ns.sleep(Math.max(duration + 50, refreshMs));
    }
}

function buildCrimeChoice(ns, crime, mode) {
    const stats = ns.singularity.getCrimeStats(crime);
    const chance = ns.singularity.getCrimeChance(crime);

    const time = Math.max(1, stats.time);
    const seconds = time / 1000;

    const expectedIntPerSecond =
        ((stats.intelligence_exp ?? 0) * chance) / seconds;

    const expectedMoneyPerSecond =
        ((stats.money ?? 0) * chance) / seconds;

    const expectedPhysicalExpPerSecond =
        (
            (stats.strength_exp ?? 0) +
            (stats.defense_exp ?? 0) +
            (stats.dexterity_exp ?? 0) +
            (stats.agility_exp ?? 0)
        ) * chance / seconds;

    let score;

    if (mode === "money") {
        score = expectedMoneyPerSecond;
    } else if (mode === "balanced") {
        score =
            expectedIntPerSecond * 100_000 +
            expectedPhysicalExpPerSecond * 10 +
            expectedMoneyPerSecond / 100_000;
    } else {
        score = expectedIntPerSecond;
    }

    return {
        crime,
        chance,
        time,
        expectedIntPerSecond,
        expectedMoneyPerSecond,
        expectedPhysicalExpPerSecond,
        score,
    };
}

function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}