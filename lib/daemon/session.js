const SESSION = {
    startedAt: Date.now(),
    startingMoney: 0,
    startingHacking: 0,

    lastMode: null,
    lastModeChangeAt: Date.now(),

    lastTarget: null,
    lastTargetChangeAt: Date.now(),
};

export function initializeSession(ns, state) {
    if (SESSION.startingMoney === 0) {
        SESSION.startingMoney = ns.getPlayer().money;
    }

    if (SESSION.startingHacking === 0) {
        SESSION.startingHacking = ns.getHackingLevel();
    }

    if (!SESSION.lastMode) {
        SESSION.lastMode = state.mode;
    }

    if (!SESSION.lastTarget) {
        SESSION.lastTarget = state.target;
    }
}

export function updateSessionTracking(state) {
    if (SESSION.lastMode !== state.mode) {
        SESSION.lastMode = state.mode;
        SESSION.lastModeChangeAt = Date.now();
    }

    if (SESSION.lastTarget !== state.target) {
        SESSION.lastTarget = state.target;
        SESSION.lastTargetChangeAt = Date.now();
    }
}

export function buildSessionStats(ns) {
    return {
        uptimeMs: Date.now() - SESSION.startedAt,

        moneyGain:
            ns.getPlayer().money - SESSION.startingMoney,

        hackingGain:
            ns.getHackingLevel() - SESSION.startingHacking,

        lastModeChangeMs:
            Date.now() - SESSION.lastModeChangeAt,

        lastTargetChangeMs:
            Date.now() - SESSION.lastTargetChangeAt,
    };
}

export function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0"),
    ].join(":");
}