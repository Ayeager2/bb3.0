// /tools/fresh-start-life-service.js
const STATE_FILE = "/data/fresh-start-life-state.txt";
const COMPLETE_FILE = "/data/fresh-start-life-complete.txt";
const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const FACTION_WORK_PLAN_FILE = "/data/faction-work-plan.txt";
const DEFAULT_REFRESH_MS = 15000;
const DEFAULT_STUDY_UNTIL_HACKING = 20;
const DEFAULT_CRIME = "Shoplift";
const DEFAULT_MIN_CRIME_CHANCE = 0;
const DEFAULT_STOP_MONEY = 10_000_000;
const DEFAULT_STOP_HOME_RAM = 128;
const BN9_STUDY_MONEY_FLOOR = 25_000_000;
const BN9_STUDY_HASH_RATE_FLOOR = 1;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 15000],
        ["study-until-hacking", 20],
        ["crime", "Shoplift"],
        ["crime-min-chance", 0],
        ["stop-money", 10_000_000],
        ["stop-home-ram", 128],
        ["focus", false],
        ["bitnodes", "1,4,9"],
    ]);

    const refreshMs = positiveNumber(flags.refresh, DEFAULT_REFRESH_MS);
    const studyUntilHacking = positiveNumber(flags["study-until-hacking"], DEFAULT_STUDY_UNTIL_HACKING);
    const fallbackCrime = String(flags.crime || DEFAULT_CRIME);
    const minCrimeChance = nonNegativeNumber(flags["crime-min-chance"], DEFAULT_MIN_CRIME_CHANCE);
    const stopMoney = positiveNumber(flags["stop-money"], DEFAULT_STOP_MONEY);
    const stopHomeRam = positiveNumber(flags["stop-home-ram"], DEFAULT_STOP_HOME_RAM);
    const focus = asBool(flags.focus);
    const allowedBitNodes = parseBitNodes(flags.bitnodes);
    const bitNode = getCurrentBitNode(ns);
    const singularity = getSingularityDiagnostics(ns);
    let openedSlumsThisRun = false;

    writeState(ns, {
        status: "starting",
        stage: "startup",
        bitNode,
        allowedBitNodes: [...allowedBitNodes],
        singularity,
        studyUntilHacking,
        fallbackCrime,
        minCrimeChance,
        stopMoney,
        stopHomeRam,
        reason: "Fresh-start life service started.",
    });

    if (!hasSingularity(ns)) {
        writeState(ns, {
            status: "unavailable",
            stage: "singularity-gate",
            bitNode,
            allowedBitNodes: [...allowedBitNodes],
            singularity,
            reason: "Singularity API unavailable.",
        });
        ns.tprint("[FRESH START] Singularity API unavailable.");
        return;
    }

    if (!allowedBitNodes.has(bitNode)) {
        complete(ns, {
            status: "skipped",
            stage: "bitnode-gate",
            bitNode,
            allowedBitNodes: [...allowedBitNodes],
            reason: `Fresh-start life service is only enabled for BN${[...allowedBitNodes].join("/BN")}.`,
        });
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
        const bn9Study =
            getBn9StudyState(daemonState, hacking, bitNode);
        const bn9EconomyReady =
            getBn9StudyEconomyState(ns, money);

        if (bitNode === 9 && (handoff.ready || factionPlan?.active === true || currentWork?.type === "FACTION")) {
            writeState(ns, {
                status: "watching",
                stage: "bn9-handoff",
                hacking,
                money,
                homeRam,
                bitNode,
                currentWork: summarizeWork(currentWork),
                handoff,
                factionPlan,
                bn9Study,
                bn9EconomyReady,
                reason:
                    currentWork?.type === "FACTION"
                        ? "BN9 faction work is active; fresh-start life is standing down."
                        : factionPlan?.active === true
                            ? "BN9 faction work plan is active; fresh-start life is standing down so faction work can start."
                            : "BN9 handoff is ready; fresh-start life is standing down.",
            });

            await ns.sleep(refreshMs);
            continue;
        }

        if (bn9Study.active && !bn9EconomyReady.ready) {
            const crime =
                chooseCrime(ns, "Mug", minCrimeChance);

            writeState(ns, {
                status: "crime",
                stage: "bn9-cash-ignition",
                hacking,
                targetHacking: bn9Study.targetLevel,
                money,
                homeRam,
                bitNode,
                crime,
                currentWork: summarizeWork(currentWork),
                handoff,
                bn9Study,
                bn9EconomyReady,
                reason: `BN9 starts with money ignition before studying; mugging until ${bn9EconomyReady.reason}`,
            });

            openedSlumsThisRun = goToSlumsOnce(ns, openedSlumsThisRun);
            const duration = commitCrime(ns, crime.name, false);

            await ns.sleep(duration > 0 ? duration + 100 : refreshMs);
            continue;
        }

        if (bn9Study.active) {
            const started = startStudy(ns, focus);
            const studyWork =
                getCurrentWork(ns);

            if (!started || !isStudyingWork(studyWork)) {
                const crime =
                    chooseCrime(ns, "Mug", minCrimeChance);

                writeState(ns, {
                    status: "crime",
                    stage: "bn9-study-cash",
                    hacking,
                    targetHacking: bn9Study.targetLevel,
                    money,
                    economyGate: bn9EconomyReady,
                    homeRam,
                    bitNode,
                    crime,
                    currentWork: summarizeWork(studyWork),
                    handoff,
                    bn9Study,
                    studyAttempt: {
                        started,
                        city: safeCity(ns),
                        work: summarizeWork(studyWork),
                    },
                    reason:
                        "BN9 study gate is active and economy gate is ready, but Rothman study could not start; mugging as fallback while retrying.",
                });

                openedSlumsThisRun = goToSlumsOnce(ns, openedSlumsThisRun);
                const duration = commitCrime(ns, crime.name, false);

                await ns.sleep(duration > 0 ? duration + 100 : refreshMs);
                continue;
            }

            writeState(ns, {
                status: "studying",
                stage: "bn9-study",
                hacking,
                targetHacking: bn9Study.targetLevel,
                money,
                homeRam,
                bitNode,
                currentWork: summarizeWork(studyWork),
                handoff,
                bn9Study,
                reason: `BN9 hacking blocker needs ${bn9Study.targetLevel}; studying computer science with hash boost support.`,
            });

            await ns.sleep(refreshMs);
            continue;
        }

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
                bitNode,
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

        const crime = chooseCrime(
            ns,
            bitNode === 9 ? "Mug" : fallbackCrime,
            minCrimeChance
        );

        writeState(ns, {
            status: "crime",
            stage: "slums",
            bitNode,
            hacking,
            studyUntilHacking,
            money,
            homeRam,
            crime,
            currentWork: summarizeWork(currentWork),
            handoff,
            reason:
                bitNode === 9
                    ? `BN9 broke phase: mugging until Hacknet/hash cash can carry the economy.`
                    : `Doing ${crime.name} until faction handoff is ready.`,
        });

        openedSlumsThisRun = goToSlumsOnce(ns, openedSlumsThisRun);
        const duration = commitCrime(ns, crime.name, bitNode === 9 ? false : focus);

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
    const fallback = getCrimeChoice(ns, fallbackCrime);
    if (fallback.chance >= minChance) return fallback;

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

    return choices[0] ?? fallback;
}

function getBn9StudyState(daemonState, hacking, bitNode) {
    if (bitNode !== 9) {
        return {
            active: false,
            reason: "Not BN9.",
        };
    }

    const factionProgression =
        daemonState?.factionProgression ?? {};
    const expPolicy =
        factionProgression.expPolicy ?? {};
    const targetLevel =
        Number(expPolicy.targetLevel ?? factionProgression.requiredHack ?? 0);
    const shouldLevel =
        expPolicy.shouldLevelNow === true ||
        factionProgression.currentBlocker === "hacking-level";
    const active =
        shouldLevel &&
        Number.isFinite(targetLevel) &&
        targetLevel > hacking;

    return {
        active,
        targetLevel: Number.isFinite(targetLevel) ? targetLevel : null,
        currentHacking: hacking,
        blocker: factionProgression.currentBlocker ?? null,
        targetFaction: factionProgression.targetFaction ?? null,
        targetServer: factionProgression.targetServer ?? null,
        reason:
            active
                ? `BN9 faction progression is blocked by hacking level ${hacking}/${targetLevel}.`
                : "No BN9 hacking-level study gate is active.",
    };
}

function getBn9StudyEconomyState(ns, money) {
    const hashRate =
        getHashProduction(ns);
    const cashReady =
        money >= BN9_STUDY_MONEY_FLOOR;
    const hashReady =
        hashRate >= BN9_STUDY_HASH_RATE_FLOOR;
    const ready =
        cashReady || hashReady;

    return {
        ready,
        money,
        moneyFloor: BN9_STUDY_MONEY_FLOOR,
        hashRate,
        hashRateFloor: BN9_STUDY_HASH_RATE_FLOOR,
        cashReady,
        hashReady,
        reason:
            ready
                ? `cash/hash economy is online: ${formatMoney(ns, money)} and ${formatNumber(ns, hashRate)} hashes/s.`
                : `${formatMoney(ns, BN9_STUDY_MONEY_FLOOR)} cash or ${formatNumber(ns, BN9_STUDY_HASH_RATE_FLOOR)} hashes/s is reached.`,
    };
}

function getHashProduction(ns) {
    try {
        const count =
            ns.hacknet.numNodes();
        let total = 0;

        for (let i = 0; i < count; i++) {
            total += Number(ns.hacknet.getNodeStats(i)?.production) || 0;
        }

        return total;
    } catch {
        return 0;
    }
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
    const diagnostics = getSingularityDiagnostics(ns);
    return !!(
        diagnostics.universityCourse &&
        diagnostics.commitCrime &&
        diagnostics.getCurrentWork
    );
}

function getSingularityDiagnostics(ns) {
    return !!(
        ns.singularity
    )
        ? {
            hasSingularityObject: true,
            universityCourse: typeof ns.singularity.universityCourse === "function",
            commitCrime: typeof ns.singularity.commitCrime === "function",
            getCrimeStats: typeof ns.singularity.getCrimeStats === "function",
            getCrimeChance: typeof ns.singularity.getCrimeChance === "function",
            getCurrentWork: typeof ns.singularity.getCurrentWork === "function",
            travelToCity: typeof ns.singularity.travelToCity === "function",
            goToLocation: typeof ns.singularity.goToLocation === "function",
        }
        : {
            hasSingularityObject: false,
            universityCourse: false,
            commitCrime: false,
            getCrimeStats: false,
            getCrimeChance: false,
            getCurrentWork: false,
            travelToCity: false,
            goToLocation: false,
        };
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

function isStudyingWork(work) {
    const type =
        String(work?.type ?? "").toUpperCase();

    return (
        type === "CLASS" ||
        type === "STUDY" ||
        type === "UNIVERSITY" ||
        !!work?.classType ||
        !!work?.universityName
    );
}

function safeCity(ns) {
    try {
        return ns.getPlayer().city ?? null;
    } catch {
        return null;
    }
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

function goToSlums(ns) {
    try {
        travelToSector12(ns);
        if (typeof ns.singularity.goToLocation === "function") {
            ns.singularity.goToLocation("The Slums");
        }
    } catch {
        // Crime APIs work without explicit location focus.
    }
}

function goToSlumsOnce(ns, alreadyOpened) {
    if (alreadyOpened) return true;

    goToSlums(ns);
    return true;
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
    } catch {
        return 1;
    }
}

function parseBitNodes(value) {
    return new Set(
        String(value ?? "1,4,9")
            .split(",")
            .map(x => Number(String(x).trim()))
            .filter(x => Number.isFinite(x) && x > 0)
    );
}

function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function formatMoney(ns, value) {
    try {
        return `$${ns.format.number(value)}`;
    } catch {
        return `$${Number(value).toFixed(0)}`;
    }
}

function formatNumber(ns, value) {
    try {
        return ns.format.number(value);
    } catch {
        return String(Number(value).toFixed(2));
    }
}
