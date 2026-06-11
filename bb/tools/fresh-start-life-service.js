// /tools/fresh-start-life-service.js
const STATE_FILE = "/data/fresh-start-life-state.txt";
const COMPLETE_FILE = "/data/fresh-start-life-complete.txt";
const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["study-until-hacking", 100],
        ["crime", "Mug"],
        ["crime-min-chance", 0.45],
        ["stop-money", 10_000_000],
        ["stop-home-ram", 128],
        ["focus", false],
    ]);

    const refreshMs = Number(flags.refresh) || 15000;
    const studyUntilHacking = Number(flags["study-until-hacking"]) || 100;
    const fallbackCrime = String(flags.crime || "Mug");
    const minCrimeChance = Number(flags["crime-min-chance"]) || 0.45;
    const stopMoney = Number(flags["stop-money"]) || 10_000_000;
    const stopHomeRam = Number(flags["stop-home-ram"]) || 128;
    const focus = asBool(flags.focus);

    if (!hasSingularity(ns)) {
        writeState(ns, {
            status: "unavailable",
            reason: "Singularity API unavailable.",
        });
        ns.tprint("[FRESH START] Singularity API unavailable.");
        return;
    }

    while (true) {
        const player = ns.getPlayer();
        const hacking = ns.getHackingLevel();
        const money = player.money;
        const homeRam = ns.getServerMaxRam("home");
        const daemonState = readJson(ns, DAEMON_STATE_FILE);
        const factionPlan = readJson(ns, FACTION_WORK_PLAN_FILE);
        const currentWork = getCurrentWork(ns);
        const handoff = getHandoffState(ns, daemonState, factionPlan, {
            money,
            homeRam,
            stopMoney,
            stopHomeRam,
        });

        if (handoff.ready || currentWork?.type === "FACTION") {
            complete(ns, {
                status: "complete",
                stage: "handoff",
                hacking,
                money,
                homeRam,
                reason:
                    currentWork?.type === "FACTION"
                        ? "Faction work is already active."
                        : handoff.reason,
            });
            return;
        }

        if (hacking < studyUntilHacking) {
            const started = startStudy(ns, focus);

            writeState(ns, {
                status: started ? "studying" : "blocked",
                stage: "study",
                hacking,
                studyUntilHacking,
                money,
                homeRam,
                currentWork: summarizeWork(getCurrentWork(ns)),
                handoff,
                reason:
                    started
                        ? `Studying at Rothman University until hacking ${studyUntilHacking}.`
                        : "Unable to start Rothman University computer science course.",
            });

            await ns.sleep(refreshMs);
            continue;
        }

        const crime = chooseCrime(ns, fallbackCrime, minCrimeChance);

        writeState(ns, {
            status: "crime",
            stage: "slums",
            hacking,
            studyUntilHacking,
            money,
            homeRam,
            crime,
            currentWork: summarizeWork(currentWork),
            handoff,
            reason: `Doing ${crime.name} until faction handoff is ready.`,
        });

        const duration = commitCrime(ns, crime.name, focus);

        if (duration <= 0) {
            await ns.sleep(refreshMs);
        } else {
            await ns.sleep(duration + 100);
        }
    }
}

function getHandoffState(ns, daemonState, factionPlan, goals) {
    if (daemonState?.spendingPolicy?.allowFactionWork === true) {
        return {
            ready: true,
            reason: "Daemon policy now allows faction work.",
        };
    }

    if (factionPlan?.active === true) {
        return {
            ready: true,
            reason: "Faction work plan is active.",
        };
    }

    const moneyReady = goals.money >= goals.stopMoney;
    const homeReady = goals.homeRam >= goals.stopHomeRam;

    if (moneyReady || homeReady) {
        return {
            ready: false,
            bootstrapReady: true,
            reason:
                moneyReady
                    ? `Money bootstrap reached ${formatMoney(ns, goals.stopMoney)}. Waiting for faction plan.`
                    : `Home RAM reached ${ns.format.ram(goals.stopHomeRam)}. Waiting for faction plan.`,
        };
    }

    return {
        ready: false,
        bootstrapReady: false,
        reason: "Need more bootstrap money/RAM before faction handoff.",
    };
}

function startStudy(ns, focus) {
    try {
        travelToSector12(ns);
        return ns.singularity.universityCourse(
            "Rothman University",
            "Study Computer Science",
            focus
        );
    } catch {
        return false;
    }
}

function chooseCrime(ns, fallbackCrime, minChance) {
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
    ];

    const choices = crimes
        .map(crime => getCrimeChoice(ns, crime))
        .filter(choice => choice.chance >= minChance)
        .sort((a, b) => b.score - a.score);

    return choices[0] ?? getCrimeChoice(ns, fallbackCrime);
}

function getCrimeChoice(ns, crime) {
    try {
        const stats = ns.singularity.getCrimeStats(crime);
        const chance = ns.singularity.getCrimeChance(crime);
        const seconds = Math.max(1, stats.time ?? 1) / 1000;
        const moneyPerSecond = ((stats.money ?? 0) * chance) / seconds;
        const combatExp =
            (
                (stats.strength_exp ?? 0) +
                (stats.defense_exp ?? 0) +
                (stats.dexterity_exp ?? 0) +
                (stats.agility_exp ?? 0)
            ) * chance / seconds;

        return {
            name: crime,
            chance,
            time: stats.time ?? 0,
            moneyPerSecond,
            combatExp,
            score: moneyPerSecond + combatExp * 1000,
        };
    } catch {
        return {
            name: crime,
            chance: 0,
            time: 0,
            moneyPerSecond: 0,
            combatExp: 0,
            score: 0,
        };
    }
}

function commitCrime(ns, crime, focus) {
    try {
        return ns.singularity.commitCrime(crime, focus);
    } catch {
        return 0;
    }
}

function travelToSector12(ns) {
    try {
        const city = ns.getPlayer().city;
        if (city !== "Sector-12") {
            ns.singularity.travelToCity("Sector-12");
        }
    } catch {
        // Stay wherever we are if travel is not possible.
    }
}

function complete(ns, state) {
    const completed = {
        ...state,
        completedAt: Date.now(),
        completedAtText: new Date().toLocaleTimeString(),
    };

    writeState(ns, completed);
    writeJson(ns, COMPLETE_FILE, completed);
    ns.tprint(`[FRESH START] Complete. ${state.reason}`);
}

function hasSingularity(ns) {
    return !!(
        ns.singularity?.universityCourse &&
        ns.singularity?.commitCrime &&
        ns.singularity?.getCurrentWork
    );
}

function getCurrentWork(ns) {
    try {
        return ns.singularity.getCurrentWork();
    } catch {
        return null;
    }
}

function summarizeWork(work) {
    if (!work) return null;

    return {
        type: work.type ?? null,
        classType: work.classType ?? null,
        crimeType: work.crimeType ?? null,
        factionName: work.factionName ?? null,
        factionWorkType: work.factionWorkType ?? null,
    };
}

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};
        const raw = ns.read(file);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function writeState(ns, state) {
    writeJson(ns, STATE_FILE, {
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),
        ...state,
    });
}

function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}

function asBool(value) {
    return value === true || value === "true";
}

function formatMoney(ns, value) {
    try {
        return `$${ns.format.number(value)}`;
    } catch {
        return `$${Number(value).toFixed(0)}`;
    }
}
