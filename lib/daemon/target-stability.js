//lib/daemon/target-stability.js
const DEFAULT_MIN_HOLD_MS = 5 * 60 * 1000;
import { logEvent } from "/lib/daemon/telemetry.js";

export function applyTargetStability(ns, previousDecision, nextDecision, options = {}) {
    const minHoldMs = options.minimumHoldMs ?? DEFAULT_MIN_HOLD_MS;

    if (!previousDecision) {
        return {
            decision: {
                ...nextDecision,
                targetSince: Date.now(),
                targetStability: {
                    blocked: false,
                    attemptedTarget: nextDecision.target,
                    heldForMs: 0,
                    minimumHoldMs: minHoldMs,
                    reason: "Initial target accepted.",
                },
            },
            changed: false,
            blocked: false,
            reason: "Initial target accepted.",
        };
    }

    const previousTarget = previousDecision.target;
    const nextTarget = nextDecision.target;

    if (!previousTarget || !nextTarget || previousTarget === nextTarget) {
        const targetSince = previousDecision.targetSince ?? Date.now();
        const heldForMs = Date.now() - targetSince;

        return {
            decision: {
                ...nextDecision,
                targetSince,
                targetStability: {
                    blocked: false,
                    attemptedTarget: nextTarget,
                    heldForMs,
                    minimumHoldMs: minHoldMs,
                    reason: "Target unchanged.",
                },
            },
            changed: false,
            blocked: false,
            reason: "Target unchanged.",
        };
    }

    const previousMode = previousDecision.mode;
    const nextMode = nextDecision.mode;

    if (previousMode !== nextMode) {
        return {
            decision: {
                ...nextDecision,
                targetSince: Date.now(),
            },
            changed: true,
            blocked: false,
            reason: `Mode changed from ${previousMode} to ${nextMode}; allowing target switch.`,
        };
    }

    const targetSince = previousDecision.targetSince ?? Date.now();
    const heldForMs = Date.now() - targetSince;

    if (heldForMs < minHoldMs) {
        logEvent(ns, "TARGET_SWITCH_BLOCKED", `Blocked ${previousTarget} -> ${nextTarget}`, {
            previousTarget,
            attemptedTarget: nextTarget,
            heldForMs,
            minimumHoldMs: minHoldMs,
        });

        return {
            decision: {
                ...nextDecision,
                target: previousTarget,
                targetSince,
                targetStability: {
                    blocked: true,
                    attemptedTarget: nextTarget,
                    heldForMs,
                    minimumHoldMs: minHoldMs,
                    reason: `Blocked target switch ${previousTarget} -> ${nextTarget}; held only ${formatDuration(heldForMs)}.`,
                },
            },
            changed: false,
            blocked: true,
            reason: `Target stability blocked switch from ${previousTarget} to ${nextTarget}.`,
        };
    }

    return {
        decision: {
            ...nextDecision,
            targetSince: Date.now(),
            targetStability: {
                blocked: false,
                attemptedTarget: nextTarget,
                heldForMs,
                minimumHoldMs: minHoldMs,
                reason: `Allowed target switch after ${formatDuration(heldForMs)}.`,
            },
        },
        changed: true,
        blocked: false,
        reason: `Allowed target switch from ${previousTarget} to ${nextTarget}.`,
    };
}

export function formatDuration(ms) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
const s = total % 60;

    return `${m}m ${s}s`;
}