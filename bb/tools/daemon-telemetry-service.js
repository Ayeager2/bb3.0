import { STATE_FILE } from "/lib/daemon/config.js";
import {
    logModeChange,
    logTargetChange,
    logPriorityChange,
    logSpendingPolicy,
    logDecision,
    logError,
    getDecisionReasonSafe,
} from "/lib/daemon/telemetry.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", 10000],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;

    let previousState = null;

    while (true) {
        try {
            const state = readJson(ns, STATE_FILE);

            if (!state || !state.mode) {
                await ns.sleep(refreshMs);
                continue;
            }

            if (previousState) {
                const reason = getDecisionReasonSafe(previousState, state);

                logModeChange(
                    ns,
                    previousState.mode,
                    state.mode,
                    reason
                );

                logTargetChange(
                    ns,
                    previousState.target,
                    state.target,
                    reason
                );

                logPriorityChange(
                    ns,
                    previousState.spendingPolicy?.priority,
                    state.spendingPolicy?.priority,
                    reason
                );

                logSpendingPolicy(
                    ns,
                    previousState.spendingPolicy,
                    state.spendingPolicy,
                    reason
                );
            }

            logDecision(ns, state, "Telemetry service observed daemon state.");

            previousState = structuredClone(state);
        } catch (error) {
            logError(ns, "daemon telemetry service", error);
        }

        await ns.sleep(refreshMs);
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