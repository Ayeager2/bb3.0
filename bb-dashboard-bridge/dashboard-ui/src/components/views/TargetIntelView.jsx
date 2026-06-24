import ProgressBar from "../shared/ProgressBar.jsx";
import {
    formatMoney,
    formatNumber,
    formatPercent,
    formatSeconds,
} from "../../utils/formatters.js";
import "./TargetIntelView.css";

export default function TargetIntelView({ state }) {
    const target = state?.target ?? {};
    const analysis = getTargetAnalysis(state);
    const stability = analysis.targetStability ?? {};
    const best = analysis.bestCandidate ?? null;
    const current = analysis.currentCandidate ?? null;
    const holdRatio = getHoldRatio(stability);

    return (
        <div className="target-intel">
            <section className="target-hero">
                <div>
                    <div className="target-kicker">Active Target</div>
                    <div className="target-name">{target.name ?? "none"}</div>
                    <div className="target-reason">
                        {analysis.reason ?? "Waiting for target decision telemetry."}
                    </div>
                </div>

                <div className="target-math-chip">
                    {best?.scoreSource ?? current?.scoreSource ?? "unknown"}
                </div>
            </section>

            <section className="target-metrics-grid">
                <MetricBlock
                    label="Money"
                    value={formatPercent(target.moneyPercent)}
                    detail={`${formatMoney(target.money)} / ${formatMoney(target.maxMoney)}`}
                    tone="green"
                />
                <MetricBlock
                    label="Security"
                    value={`+${formatNumber(target.securityDiff)}`}
                    detail={`${formatNumber(target.security)} / min ${formatNumber(target.minSecurity)}`}
                    tone="yellow"
                />
                <MetricBlock
                    label="Weaken"
                    value={formatSeconds(target.weakenTime)}
                    detail="Current timing"
                    tone="cyan"
                />
                <MetricBlock
                    label="Prep Need"
                    value={formatPercent(target.prepNeed)}
                    detail="Money + security gap"
                    tone="purple"
                />
            </section>

            <div className="target-progress-stack">
                <LabeledProgress
                    label="Money Fill"
                    value={target.moneyPercent}
                    display={formatPercent(target.moneyPercent)}
                    detail="How much money is currently on the target."
                    tone="good"
                />
                <LabeledProgress
                    label="Prep Debt"
                    value={normalizePrepNeed(target.prepNeed)}
                    display={formatPercent(target.prepNeed)}
                    detail="Money missing plus security above minimum. Lower is better."
                    tone="bad"
                />
            </div>

            <section className="target-stability-panel">
                <div className="target-section-title">Target Stability</div>
                <div className="target-stability-grid">
                    <StabilityBadge
                        label="Current"
                        value={stability.currentTarget ?? analysis.target ?? target.name ?? "unknown"}
                        tone="yellow"
                    />
                    <StabilityBadge
                        label="Proposed"
                        value={stability.proposedTarget ?? analysis.target ?? target.name ?? "unknown"}
                        tone="cyan"
                    />
                    <StabilityBadge
                        label="Hold"
                        value={stability.holdSatisfied ? "SATISFIED" : "WAITING"}
                        tone={stability.holdSatisfied ? "green" : "yellow"}
                    />
                    <StabilityBadge
                        label="Swap"
                        value={analysis.blockedSwap || stability.blockedSwap ? "BLOCKED" : "CLEAR"}
                        tone={analysis.blockedSwap || stability.blockedSwap ? "red" : "green"}
                    />
                </div>
                <LabeledProgress
                    label="Hold Timer"
                    value={holdRatio}
                    display={formatPercent(holdRatio)}
                    detail="How long this target has been held before rotation is allowed."
                    tone="neutral"
                />
                <div className="target-stability-note">
                    {formatStabilityNote(stability, analysis)}
                </div>
            </section>

            <section className="target-analysis-grid">
                <CandidatePanel title="Best Candidate" candidate={best} accent="green" />
                <CandidatePanel title="Current Candidate" candidate={current} accent="yellow" />
            </section>

            {analysis.candidates?.length > 0 && (
                <section className="target-candidate-strip">
                    <div className="target-section-title">Top Candidates</div>
                    <div className="target-candidate-list">
                        {analysis.candidates.map(candidate => (
                            <div key={candidate.server} className="target-candidate-pill">
                                <span>{candidate.server}</span>
                                <b>{formatCompactScore(candidate.score)}</b>
                            </div>
                        ))}
                    </div>
                </section>
            )}

        </div>
    );
}

function LabeledProgress({ label, value, display, detail, tone = "neutral" }) {
    return (
        <div className={`target-meter target-meter-${tone}`} title={`${label}: ${display}. ${detail}`}>
            <div className="target-meter-head">
                <span>{label}</span>
                <b>{display}</b>
            </div>
            <ProgressBar value={value} />
            <small>{detail}</small>
        </div>
    );
}

function MetricBlock({ label, value, detail, tone }) {
    return (
        <div className={`target-metric target-metric-${tone}`}>
            <div className="target-metric-label">{label}</div>
            <div className="target-metric-value">{value}</div>
            <div className="target-metric-detail">{detail}</div>
        </div>
    );
}

function StabilityBadge({ label, value, tone }) {
    return (
        <div className={`target-stability-badge target-stability-${tone}`}>
            <div>{label}</div>
            <strong>{value}</strong>
        </div>
    );
}

function CandidatePanel({ title, candidate, accent }) {
    if (!candidate) {
        return (
            <section className={`target-candidate target-candidate-${accent}`}>
                <div className="target-section-title">{title}</div>
                <div className="target-candidate-name">pending</div>
                <div className="target-candidate-reason">Waiting for target analysis data.</div>
            </section>
        );
    }

    return (
        <section className={`target-candidate target-candidate-${accent}`}>
            <div className="target-section-title">{title}</div>
            <div className="target-candidate-name">{candidate.server ?? "unknown"}</div>
            <div className="target-candidate-stats">
                <span>score {formatCompactScore(candidate.score)}</span>
                <span>est/s {formatMoney(candidate.estimatedMoneyPerSecond)}</span>
                <span>chance {formatPercent(candidate.chance)}</span>
                <span>hack/thread {formatPercent(candidate.hackPercent)}</span>
            </div>
            <div className="target-candidate-reason">
                {candidate.reason ?? "No candidate reason published."}
            </div>
        </section>
    );
}

function getTargetAnalysis(state) {
    const existing = state?.targetAnalysis ?? {};
    const plan = state?.strategicTargetPlan ?? {};

    return {
        target: existing.target ?? state?.target?.name ?? state?.daemon?.target ?? plan?.target ?? null,
        reason:
            existing.reason ??
            state?.targetReason ??
            state?.strategicTargetReason ??
            plan?.reason ??
            null,
        changed: Boolean(existing.changed ?? plan.changed),
        blockedSwap: Boolean(existing.blockedSwap ?? plan.blockedSwap),
        blockedTarget: existing.blockedTarget ?? plan.blockedTarget ?? null,
        targetStability:
            existing.targetStability ??
            state?.targetStability ??
            plan?.targetStability ??
            {},
        bestCandidate: normalizeCandidate(existing.bestCandidate ?? plan.bestCandidate),
        currentCandidate: normalizeCandidate(existing.currentCandidate ?? plan.currentCandidate),
        candidates: Array.isArray(existing.candidates) && existing.candidates.length > 0
            ? existing.candidates.map(normalizeCandidate)
            : Array.isArray(plan.candidates)
                ? plan.candidates.slice(0, 5).map(normalizeCandidate)
                : [],
    };
}

function normalizeCandidate(candidate) {
    if (!candidate) return null;

    return {
        server: candidate.server ?? "unknown",
        score: candidate.score ?? 0,
        scoreSource: candidate.scoreSource ?? null,
        reason: candidate.reason ?? null,
        estimatedMoneyPerSecond: candidate.estimatedMoneyPerSecond ?? 0,
        chance: candidate.chance ?? 0,
        hackPercent: candidate.hackPercent ?? 0,
    };
}

function getHoldRatio(stability = {}) {
    const ageMs = Number(stability.targetAgeMs ?? 0);
    const minHoldMs = Number(stability.minHoldMs ?? 0);

    if (!Number.isFinite(ageMs) || !Number.isFinite(minHoldMs) || minHoldMs <= 0) {
        return 1;
    }

    return Math.min(1, Math.max(0, ageMs / minHoldMs));
}

function normalizePrepNeed(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
}

function formatStabilityNote(stability = {}, analysis = {}) {
    if (analysis.blockedSwap || stability.blockedSwap) {
        return analysis.blockedTarget
            ? `Swap blocked for ${analysis.blockedTarget}.`
            : "Target swap is currently blocked.";
    }

    if (stability.holdSatisfied) return "Target can rotate if a stronger candidate appears.";

    const remainingMs = Number(stability.remainingHoldMs ?? 0);
    if (Number.isFinite(remainingMs) && remainingMs > 0) {
        return `Holding current target for ${formatSeconds(remainingMs)} more.`;
    }

    return "Current target remains strategically acceptable.";
}

function formatCompactScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "unknown";
    if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}t`;
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}b`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}m`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}k`;
    return n.toFixed(2);
}
