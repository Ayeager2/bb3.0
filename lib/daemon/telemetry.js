//lib/daemon/telemetry.js
const HISTORY_DIR = "/data/history";
const DEDUPE_CACHE = {};
const DEFAULT_DEDUPE_MS = 60 * 1000;

export function logEvent(ns, type, message, data = {}) {
    const entry = buildEntry(type, message, data);

    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logModeChange(ns, previousMode, nextMode, reason = "", data = {}) {
    if (previousMode === nextMode) return;

    const entry = buildEntry("MODE_CHANGE", `${previousMode} -> ${nextMode}`, {
        reason,
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/mode-switches.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logTargetChange(ns, previousTarget, nextTarget, reason = "", data = {}) {
    if (previousTarget === nextTarget) return;

    const entry = buildEntry("TARGET_CHANGE", `${previousTarget} -> ${nextTarget}`, {
        reason,
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/target-switches.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logTargetDecision(
    ns,
    {
        previousTarget = null,
        proposedTarget = null,
        finalTarget = null,
        blockedSwap = false,
        changed = false,
        reason = "",
        targetAgeMs = null,
        minHoldMs = null,
        score = null,
        data = {},
    } = {},
) {
    const type = blockedSwap
        ? "TARGET_SWAP_BLOCKED"
        : changed
            ? "TARGET_CHANGE"
            : "TARGET_DECISION";

    const dedupeKey = [
        type,
        previousTarget,
        proposedTarget,
        finalTarget,
        blockedSwap,
        changed,
        reason,
    ].join("|");

    // Always log real changes. Throttle unchanged decisions.
    if (!changed && !blockedSwap && !shouldLogDeduped(dedupeKey, 5 * 60 * 1000)) {
        return;
    }

    const entry = buildEntry(type, reason || "Target decision updated", {
        previousTarget,
        proposedTarget,
        finalTarget,
        blockedSwap,
        changed,
        targetAgeMs,
        minHoldMs,
        score,
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/target-decisions.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logPriorityChange(ns, previousPriority, nextPriority, reason = "", data = {}) {
    if (previousPriority === nextPriority) return;

    const entry = buildEntry("PRIORITY_CHANGE", `${previousPriority} -> ${nextPriority}`, {
        reason,
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/priority-switches.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logSpendingPolicy(ns, previousPolicy, nextPolicy, reason = "") {
    const prev = normalizePolicy(previousPolicy);
    const next = normalizePolicy(nextPolicy);

    if (JSON.stringify(prev) === JSON.stringify(next)) return;

    const entry = buildEntry("SPENDING_POLICY", "Spending policy changed", {
        reason,
        previous: prev,
        next,
    });

    appendLine(ns, `${HISTORY_DIR}/spending-policy.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logError(ns, source, error, data = {}) {
    const entry = buildEntry("ERROR", source, {
        error: String(error),
        stack: error?.stack ?? "",
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/errors.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logDecision(ns, decision, reason = "") {
    const entry = buildEntry("DECISION", reason || "Decision updated", {
        mode: decision?.mode ?? null,
        target: decision?.target ?? null,
        targetOverride: decision?.targetOverride ?? null,
        priority: decision?.spendingPolicy?.priority ?? null,
        bitNode: decision?.bitNodePlan?.bitNode ?? null,
        roadmap: decision?.bitNodePlan?.roadmap ?? null,
    });

    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logServiceFailure(ns, serviceName, reason = "", data = {}) {
    const dedupeKey = [
        "SERVICE_FAILURE",
        serviceName,
        reason,
        data?.host ?? "",
        data?.phase ?? "",
    ].join("|");

    if (!shouldLogDeduped(dedupeKey, 60 * 1000)) {
        return;
    }

    const entry = buildEntry("SERVICE_FAILURE", serviceName, {
        reason,
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/service-failures.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

export function logServiceBlocked(ns, serviceName, reason = "", data = {}) {
    const dedupeKey = [
        "SERVICE_BLOCKED",
        serviceName,
        reason,
        data?.phase ?? "",
        data?.policyFlag ?? "",
    ].join("|");

    if (!shouldLogDeduped(dedupeKey, 5 * 60 * 1000)) {
        return;
    }

    const entry = buildEntry("SERVICE_BLOCKED", serviceName, {
        reason,
        ...data,
    });

    appendLine(ns, `${HISTORY_DIR}/service-blocked.txt`, entry);
    appendLine(ns, `${HISTORY_DIR}/events.txt`, entry);
}

function buildEntry(type, message, data = {}) {
    return JSON.stringify({
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString(),
        type,
        message,
        data,
    });
}

function appendLine(ns, file, line) {
    try {
        ns.write(file, `${line}\n`, "a");
    } catch {
        // Telemetry should never crash daemon.
    }
}

function normalizePolicy(policy) {
    if (!policy) return null;

    return {
        priority: policy.priority,
        reserveMoney: policy.reserveMoney,
        allowServerPurchases: policy.allowServerPurchases,
        allowStockTrading: policy.allowStockTrading,
        allowHacknet: policy.allowHacknet,
        allowHomeRam: policy.allowHomeRam,
        allowExePurchases: policy.allowExePurchases,
        allowAugmentPurchases: policy.allowAugmentPurchases,
        allowReset: policy.allowReset,
        allowIntTravel: policy.allowIntTravel,
    };
}

export function getDecisionReasonSafe(previousDecision, currentDecision) {
    if (!previousDecision) return "Initial decision.";

    if (previousDecision.mode !== currentDecision.mode) {
        return `Mode changed from ${previousDecision.mode} to ${currentDecision.mode}.`;
    }

    if (previousDecision.target !== currentDecision.target) {
        return `Target changed from ${previousDecision.target} to ${currentDecision.target}.`;
    }

    if (previousDecision.spendingPolicy?.priority !== currentDecision.spendingPolicy?.priority) {
        return `Priority changed from ${previousDecision.spendingPolicy?.priority} to ${currentDecision.spendingPolicy?.priority}.`;
    }

    return "Decision refreshed.";
}

export function getTelemetryCounts(ns) {
    return {
        events: countLines(ns, `${HISTORY_DIR}/events.txt`),
        errors: countLines(ns, `${HISTORY_DIR}/errors.txt`),
        modeSwitches: countLines(ns, `${HISTORY_DIR}/mode-switches.txt`),
        targetSwitches: countLines(ns, `${HISTORY_DIR}/target-switches.txt`),
        prioritySwitches: countLines(ns, `${HISTORY_DIR}/priority-switches.txt`),
    };
}

function countLines(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return 0;

        const raw = ns.read(file);
        if (!raw.trim()) return 0;

        return raw.trim().split("\n").length;
    } catch {
        return 0;
    }
}

function shouldLogDeduped(key, ttlMs = DEFAULT_DEDUPE_MS) {
    const now = Date.now();
    const previous = DEDUPE_CACHE[key];

    if(previous && now - previous < ttlMs) {
        return false;
    }

    DEDUPE_CACHE[key] = now;
    return true;    
}