// /tools/character-action-override-service.js

const OVERRIDE_FILE = "/data/character-action-override.txt";
const STATE_FILE = "/data/character-action-override-state.txt";
const FACTIONS = [
    "CyberSec",
    "Tian Di Hui",
    "Netburners",
    "Shadows of Anarchy",
    "Sector-12",
    "Chongqing",
    "New Tokyo",
    "Ishima",
    "Aevum",
    "Volhaven",
    "NiteSec",
    "The Black Hand",
    "BitRunners",
    "ECorp",
    "MegaCorp",
    "KuaiGong International",
    "Four Sigma",
    "NWO",
    "Blade Industries",
    "OmniTek Incorporated",
    "Bachman & Associates",
    "Clarke Incorporated",
    "Fulcrum Secret Technologies",
    "Slum Snakes",
    "Tetrads",
    "Silhouette",
    "Speakers for the Dead",
    "The Dark Army",
    "The Syndicate",
    "The Covenant",
    "Illuminati",
    "Daedalus",
    "Bladeburners",
    "Church of the Machine God",
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 3000],
        ["debug", false],
    ]);

    const refreshMs = Math.max(1000, Number(flags.refresh) || 3000);
    const debug = flags.debug === true || flags.debug === "true";

    writeState(ns, {
        status: "starting",
        enabled: false,
        reason: "Character action override service started.",
        currentWork: summarizeWork(getCurrentWork(ns)),
    });

    while (true) {
        const override = readJson(ns, OVERRIDE_FILE, null);
        const currentWork = getCurrentWork(ns);

        if (override?.enabled !== true) {
            writeState(ns, {
                status: "daemon",
                enabled: false,
                mode: "daemon",
                reason: "No character override is active.",
                override,
                currentWork: summarizeWork(currentWork),
                factionWorkTypes: getFactionWorkTypesByFaction(ns),
            });
            await ns.sleep(refreshMs);
            continue;
        }

        const result = applyOverride(ns, override, currentWork);

        if (debug) {
            ns.print(`${result.status}: ${result.reason}`);
        }

        writeState(ns, {
            ...result,
            enabled: true,
            mode: "manual",
            override,
            currentWork: summarizeWork(getCurrentWork(ns)),
            factionWorkTypes: getFactionWorkTypesByFaction(ns),
        });

        await ns.sleep(refreshMs);
    }
}

function applyOverride(ns, override, currentWork) {
    if (!hasSingularity(ns)) {
        return {
            status: "blocked",
            reason: "Singularity API is unavailable.",
        };
    }

    if (isAlreadyDoingOverride(currentWork, override)) {
        return {
            status: "active",
            reason: `Already running manual action: ${override.label ?? override.action}.`,
        };
    }

    stopCurrentWork(ns);

    if (override.action === "study") {
        return startStudy(ns, override);
    }

    if (override.action === "crime") {
        return startCrime(ns, override);
    }

    if (override.action === "faction") {
        return startFactionWork(ns, override);
    }

    if (override.action === "gym") {
        return startGym(ns, override);
    }

    return {
        status: "blocked",
        reason: `Unsupported character action: ${override.action ?? "unknown"}.`,
    };
}

function startStudy(ns, override) {
    travelToCity(ns, override.city ?? "Sector-12");

    try {
        const started = ns.singularity.universityCourse(
            override.university ?? "Rothman University",
            override.course ?? "Algorithms",
            override.focus === true,
        );

        return {
            status: started ? "started" : "blocked",
            reason: started
                ? `Studying ${override.course ?? "Algorithms"} at ${override.university ?? "Rothman University"}.`
                : "Unable to start university course.",
        };
    } catch (error) {
        return blocked(error, "Unable to start university course.");
    }
}

function startCrime(ns, override) {
    travelToCity(ns, override.city ?? "Sector-12");
    goToLocation(ns, override.location ?? "The Slums");

    try {
        const duration = ns.singularity.commitCrime(
            override.crime ?? "Mug",
            override.focus === true,
        );

        return {
            status: duration > 0 ? "started" : "blocked",
            reason: duration > 0
                ? `Committing ${override.crime ?? "Mug"}.`
                : "Unable to start crime.",
            duration,
        };
    } catch (error) {
        return blocked(error, "Unable to start crime.");
    }
}

function startFactionWork(ns, override) {
    try {
        const started = startFactionWorkWithFallbacks(ns, override);

        return {
            status: started ? "started" : "blocked",
            reason: started
                ? `Working ${override.workType} for ${override.faction}.`
                : `Unable to start ${override.workType} work for ${override.faction}.`,
        };
    } catch (error) {
        return blocked(error, `Unable to start faction work for ${override.faction}.`);
    }
}

function startFactionWorkWithFallbacks(ns, override) {
    const workTypes = getWorkTypeCandidates(override.workType);

    for (const workType of workTypes) {
        try {
            if (ns.singularity.workForFaction(override.faction, workType, override.focus === true)) {
                return true;
            }
        } catch {
            // Try the next accepted spelling.
        }
    }

    return false;
}

function getWorkTypeCandidates(workType) {
    if (workType === "hacking") return ["hacking", "Hacking Contracts"];
    if (workType === "field") return ["field", "Field Work"];
    if (workType === "security") return ["security", "Security Work"];
    return [workType];
}

function startGym(ns, override) {
    travelToCity(ns, override.city ?? "Sector-12");
    goToLocation(ns, override.gym ?? "Powerhouse Gym");

    try {
        const started = ns.singularity.gymWorkout(
            override.gym ?? "Powerhouse Gym",
            override.stat ?? "strength",
            override.focus === true,
        );

        return {
            status: started ? "started" : "blocked",
            reason: started
                ? `Training ${override.stat ?? "strength"} at ${override.gym ?? "Powerhouse Gym"}.`
                : "Unable to start gym workout.",
        };
    } catch (error) {
        return blocked(error, "Unable to start gym workout.");
    }
}

function isAlreadyDoingOverride(work, override) {
    if (!work || !override) return false;

    const type = String(work.type ?? "").toUpperCase();

    if (override.action === "study") {
        const classType = String(work.classType ?? work.className ?? "").toLowerCase();
        const location = String(work.locationName ?? "").toLowerCase();
        const course = String(override.course ?? "").toLowerCase();
        const university = String(override.university ?? "").toLowerCase();

        return (
            type === "CLASS" &&
            (!course || classType.includes(course) || course.includes(classType)) &&
            (!university || location.includes(university.split(" ")[0]))
        );
    }

    if (override.action === "crime") {
        return (
            type === "CRIME" &&
            String(work.crimeType ?? "").toLowerCase() === String(override.crime ?? "").toLowerCase()
        );
    }

    if (override.action === "faction") {
        return (
            type === "FACTION" &&
            work.factionName === override.faction &&
            normalizeFactionWorkType(work.factionWorkType ?? work.workType ?? work.name) === override.workType
        );
    }

    if (override.action === "gym") {
        const stat = String(work.gymStatType ?? work.stat ?? "").toLowerCase();
        const location = String(work.locationName ?? "").toLowerCase();

        return (
            (type === "GYM" || type === "CLASS") &&
            (!stat || stat === String(override.stat ?? "").toLowerCase()) &&
            location.includes(String(override.gym ?? "").split(" ")[0].toLowerCase())
        );
    }

    return false;
}

function normalizeFactionWorkType(value) {
    const text = String(value ?? "").toLowerCase();
    if (text.includes("hack")) return "hacking";
    if (text.includes("field")) return "field";
    if (text.includes("security")) return "security";
    return text || "unknown";
}

function getFactionWorkTypesByFaction(ns) {
    if (!ns.singularity || typeof ns.singularity.getFactionWorkTypes !== "function") {
        return {};
    }

    const byFaction = {};

    for (const faction of FACTIONS) {
        try {
            const workTypes = ns.singularity
                .getFactionWorkTypes(faction)
                .map(normalizeFactionWorkType)
                .filter(workType => workType && workType !== "unknown");

            if (workTypes.length > 0) {
                byFaction[faction] = [...new Set(workTypes)];
            }
        } catch {
            // Some factions may not be valid or visible in a given game version.
        }
    }

    return byFaction;
}

function hasSingularity(ns) {
    return !!(
        ns.singularity &&
        typeof ns.singularity.getCurrentWork === "function" &&
        typeof ns.singularity.stopAction === "function"
    );
}

function travelToCity(ns, city) {
    try {
        if (city && ns.getPlayer().city !== city && typeof ns.singularity.travelToCity === "function") {
            ns.singularity.travelToCity(city);
        }
    } catch {
        // Starting the requested action will report failure if travel mattered.
    }
}

function goToLocation(ns, location) {
    try {
        if (location && typeof ns.singularity.goToLocation === "function") {
            ns.singularity.goToLocation(location);
        }
    } catch {
        // Many actions can start without explicit location focus.
    }
}

function stopCurrentWork(ns) {
    try {
        return ns.singularity.stopAction();
    } catch {
        // Try alternate API below.
    }

    try {
        return ns.singularity.stopWork();
    } catch {
        return false;
    }
}

function getCurrentWork(ns) {
    try {
        return ns.singularity.getCurrentWork() ?? null;
    } catch {
        return null;
    }
}

function summarizeWork(work) {
    if (!work) return null;

    return {
        type: work.type ?? null,
        classType: work.classType ?? work.className ?? null,
        locationName: work.locationName ?? null,
        factionName: work.factionName ?? null,
        factionWorkType: work.factionWorkType ?? null,
        crimeType: work.crimeType ?? null,
        gymStatType: work.gymStatType ?? null,
    };
}

function blocked(error, fallback) {
    return {
        status: "blocked",
        reason: String(error?.message ?? error ?? fallback),
    };
}

function readJson(ns, file, fallback = null) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;

        const raw = ns.read(file);
        if (!raw.trim()) return fallback;

        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeState(ns, state) {
    ns.write(
        STATE_FILE,
        JSON.stringify(
            {
                schemaVersion: 1,
                updatedAt: Date.now(),
                updatedAtText: new Date().toLocaleTimeString(),
                source: "character-action-override-service",
                ...state,
            },
            null,
            2,
        ),
        "w",
    );
}
