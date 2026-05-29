const HISTORY_DIR = "/data/history";

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