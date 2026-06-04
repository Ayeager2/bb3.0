export const PHASES = {
    BOOTSTRAP: "bootstrap",
    EXPANSION: "expansion",
    SCALING: "scaling",
    FACTION: "faction",
    RESET_PREP: "reset-prep",
};

export function getProgressionPhase(ns) {
    const money = ns.getServerMoneyAvailable("home");
    const hacking = ns.getHackingLevel();
    const sharePower = ns.getSharePower();

    if (money < 1_000_000_000) {
        return buildPhase(PHASES.BOOTSTRAP, 0.95, 0.00, 0.05);
    }

    if (money < 10_000_000_000_000) {
        return buildPhase(PHASES.EXPANSION, 0.85, 0.05, 0.10);
    }

    if (money < 100_000_000_000_000 || hacking < 2500) {
        return buildPhase(PHASES.SCALING, 0.70, 0.10, 0.20);
    }

    if (money >= 100_000_000_000_000 && sharePower < 1.5) {
        return buildPhase(PHASES.FACTION, 0.35, 0.55, 0.10);
    }

    return buildPhase(PHASES.RESET_PREP, 0.20, 0.70, 0.10);
}

function buildPhase(name, moneyRamRatio, shareRamRatio, expRamRatio) {
    return {
        name,
        moneyRamRatio,
        shareRamRatio,
        expRamRatio,
    };
}