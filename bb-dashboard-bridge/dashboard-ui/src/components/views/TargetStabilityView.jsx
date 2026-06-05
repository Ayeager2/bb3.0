import Row from "../shared/Row.jsx";
import ProgressBar from "../shared/ProgressBar.jsx";
import { formatNumber } from "../../utils/formatters.js";

export default function TargetStabilityView({ state }) {
    const stability = state?.targetStability ?? {};
    const plan = state?.strategicTargetPlan ?? {};
    const best = plan?.bestCandidate ?? {};
    const current = plan?.currentCandidate ?? {};

    const ageMs = Number(stability.targetAgeMs ?? 0);
    const minHoldMs = Number(stability.minHoldMs ?? 0);
    const holdRatio = minHoldMs > 0 ? ageMs / minHoldMs : 1;

    return (
        <>
            <Row label="Current" value={stability.currentTarget ?? plan.target ?? "unknown"} tone="yellow" />
            <Row label="Proposed" value={stability.proposedTarget ?? plan.target ?? "unknown"} tone="cyan" />
            <Row label="Hold" value={stability.holdSatisfied ? "SATISFIED" : "WAITING"} tone={stability.holdSatisfied ? "green" : "yellow"} />
            <ProgressBar value={holdRatio} />
            <Row label="Blocked" value={stability.blockedSwap ? "YES" : "NO"} tone={stability.blockedSwap ? "red" : "green"} />
            <Row label="Reason" value={plan.reason ?? "none"} tone="muted" />

            <div className="card-subtitle">Current Candidate</div>
            <Row label="Server" value={current.server ?? "unknown"} tone="yellow" />
            <Row label="Score" value={formatNumber(current.score)} tone="cyan" />
            <Row label="Chance" value={formatPercentLocal(current.chance)} tone="green" />

            <div className="card-subtitle">Best Candidate</div>
            <Row label="Server" value={best.server ?? "unknown"} tone="yellow" />
            <Row label="Score" value={formatNumber(best.score)} tone="cyan" />
            <Row label="Chance" value={formatPercentLocal(best.chance)} tone="green" />
        </>
    );
}

function formatPercentLocal(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "unknown";
    return `${(n * 100).toFixed(1)}%`;
}