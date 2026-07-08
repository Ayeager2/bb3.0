import { describeCharacterActionOverride, readCharacterActionOverride } from "/lib/daemon/character-action-override.js";

const DAEMON_STATE_FILE = "/data/daemon-state.txt";
const STATE_FILE = "/data/bn9-level-study-state.txt";
const DEFAULT_REFRESH_MS = 5000;
const UNIVERSITY = "Rothman University";
const COURSE = "Algorithms";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", DEFAULT_REFRESH_MS],
        ["focus", false],
    ]);

    const refreshMs =
        positiveNumber(flags.refresh, DEFAULT_REFRESH_MS);
    const focus =
        flags.focus === true || flags.focus === "true";

    while (true) {
        const bitNode =
            getCurrentBitNode(ns);
        const daemonState =
            readJson(ns, DAEMON_STATE_FILE);
        const progression =
            daemonState?.factionProgression ?? {};
        const currentWork =
            getCurrentWork(ns);
        const characterOverride =
            readCharacterActionOverride(ns);
        const shouldStudy =
            bitNode === 9 &&
            progression.currentBlocker === "hacking-level" &&
            progression.expPolicy?.shouldLevelNow === true;

        if (characterOverride?.enabled === true) {
            writeState(ns, {
                status: "paused-character-override",
                bitNode,
                currentWork: summarizeWork(currentWork),
                blocker: progression.currentBlocker ?? "none",
                characterOverride,
                reason: describeCharacterActionOverride(characterOverride),
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (!shouldStudy) {
            writeState(ns, {
                status: "idle",
                bitNode,
                currentWork: summarizeWork(currentWork),
                blocker: progression.currentBlocker ?? "none",
                reason: "BN9 is not currently blocked by hacking level.",
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (isStudying(currentWork)) {
            writeState(ns, {
                status: "studying",
                bitNode,
                currentWork: summarizeWork(currentWork),
                university: UNIVERSITY,
                course: COURSE,
                targetLevel: progression.expPolicy?.targetLevel ?? progression.requiredHack ?? null,
                reason: `Already studying ${COURSE} at ${UNIVERSITY} for hacking-level blocker.`,
            });
            await ns.sleep(refreshMs);
            continue;
        }

        if (currentWork?.type === "FACTION") {
            stopCurrentWork(ns);
        }

        const started =
            startComputerScience(ns, focus);

        writeState(ns, {
            status: started ? "started" : "blocked",
            bitNode,
            currentWork: summarizeWork(getCurrentWork(ns)),
            university: UNIVERSITY,
            course: COURSE,
            targetLevel: progression.expPolicy?.targetLevel ?? progression.requiredHack ?? null,
            targetFaction: progression.targetFaction ?? null,
            targetServer: progression.targetServer ?? null,
            reason: started
                ? `Started ${COURSE} at ${UNIVERSITY} for BN9 hacking-level blocker.`
                : `Unable to start ${COURSE} at ${UNIVERSITY}.`,
        });

        await ns.sleep(refreshMs);
    }
}

function startComputerScience(ns, focus) {
    try {
        travelToSector12(ns);
        return ns.singularity.universityCourse(UNIVERSITY, COURSE, focus);
    } catch {
        return false;
    }
}

function travelToSector12(ns) {
    try {
        if (ns.getPlayer().city !== "Sector-12") {
            ns.singularity.travelToCity("Sector-12");
        }
    } catch {
        // Studying will report failure if location/course cannot be reached.
    }
}

function stopCurrentWork(ns) {
    try {
        return ns.singularity.stopAction();
    } catch {
        // Try the newer/alternate API name below.
    }

    try {
        return ns.singularity.stopWork();
    } catch {
        return false;
    }
}

function isStudying(work) {
    const type =
        String(work?.type ?? "").toUpperCase();
    const classType =
        String(work?.classType ?? work?.className ?? "").toLowerCase();

    return (
        type === "CLASS" ||
        type === "STUDY" ||
        type === "UNIVERSITY" ||
        classType.includes("computer science")
    );
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
    };
}

function getCurrentBitNode(ns) {
    try {
        return ns.getResetInfo()?.currentNode ?? ns.getPlayer()?.bitNodeN ?? 1;
    } catch {
        return 1;
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
    ns.write(STATE_FILE, JSON.stringify({
        updatedAt: Date.now(),
        updatedAtText: new Date().toLocaleTimeString(),
        source: "bn9-level-study-service",
        ...state,
    }, null, 2), "w");
}

function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}
