import Card from "../shared/Card.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./GangCard.css";

export default function GangCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
}) {
    const gang = state?.gang ?? null;
    const members = Array.isArray(gang?.members) ? gang.members : [];
    const assignments = Array.isArray(gang?.assignments) ? gang.assignments : [];
    const assignmentMix = countAssignments(assignments);
    const penalty = Number(gang?.wantedPenalty ?? 1);
    const penaltyPercent = Math.max(0, Math.min(100, penalty * 100));
    const combatSummary = getCombatSummary(members);
    const ascensionSummary = getAscensionSummary(members);

    return (
        <Card
            id={id}
            title="Gang Command"
            size={layoutSize ?? "half"}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="gang-card">
                <section className="gang-hero">
                    <div>
                        <div className="gang-kicker">BN2 Crew State</div>
                        <div className="gang-name">{gang?.gang ?? "No gang"}</div>
                        <div className="gang-message">{gang?.message ?? "Waiting for gang telemetry."}</div>
                    </div>
                    <div className={`gang-status ${gang?.inGang ? "online" : "offline"}`}>
                        {gang?.status ?? "offline"}
                    </div>
                </section>

                <section className="gang-metrics">
                    <Metric label="Members" value={`${gang?.memberCount ?? members.length}/12`} tone="cyan" />
                    <Metric label="Respect" value={formatNumber(gang?.respect ?? 0, 1)} tone="purple" />
                    <Metric label="Money/sec" value={formatMoney(gang?.moneyGainRate ?? 0)} tone="green" />
                    <Metric label="Wanted" value={formatNumber(gang?.wantedLevel ?? 0, 2)} tone={penalty < 0.995 ? "red" : "yellow"} />
                </section>

                <section className="gang-metrics gang-metrics-secondary">
                    <Metric label="Respect/sec" value={formatNumber(gang?.respectGainRate ?? 0, 2)} tone="purple" />
                    <Metric label="Wanted/sec" value={formatNumber(gang?.wantedLevelGainRate ?? 0, 3)} tone={Number(gang?.wantedLevelGainRate) > 0 ? "yellow" : "green"} />
                    <Metric label="Territory" value={`${formatNumber((gang?.territory ?? 0) * 100, 2)}%`} tone="cyan" />
                    <Metric label="Power" value={formatNumber(gang?.power ?? 0, 1)} tone="yellow" />
                </section>

                <section className="gang-metrics gang-metrics-secondary">
                    <Metric label="Avg Combat" value={formatNumber(combatSummary.average, 0)} tone="green" />
                    <Metric label="Weakest" value={combatSummary.weakestName ?? "--"} tone="yellow" />
                    <Metric label="Asc Ready" value={`${ascensionSummary.ready}/${members.length || 0}`} tone={ascensionSummary.ready > 0 ? "green" : "purple"} />
                    <Metric label="Next Asc" value={ascensionSummary.nextName ?? "--"} tone={ascensionSummary.nextProgress >= 0.75 ? "green" : "cyan"} />
                </section>

                <section className="gang-panel gang-penalty-panel">
                    <div className="gang-panel-head">
                        <span>Wanted Penalty</span>
                        <b>{penaltyPercent.toFixed(2)}%</b>
                    </div>
                    <div className="gang-bar">
                        <span style={{ width: `${penaltyPercent}%` }} />
                    </div>
                </section>

                <section className="gang-panel">
                    <div className="gang-panel-head">
                        <span>Equipment Buyer</span>
                        <b>{gang?.equipmentBuyer?.status ?? "unknown"}</b>
                    </div>
                    <p>{gang?.equipmentBuyer?.message ?? "No equipment buyer telemetry yet."}</p>
                </section>

                <section className="gang-panel gang-legend">
                    <div className="gang-panel-head">
                        <span>Combat Readiness</span>
                        <b>STR/DEF/DEX/AGI</b>
                    </div>
                    <p>Combat is the average of strength, defense, dexterity, and agility. Ascension readiness compares projected ascension gain against the current auto-ascend threshold.</p>
                </section>

                <section className="gang-task-grid">
                    {assignmentMix.length === 0 ? (
                        <div className="gang-empty">No assignments published.</div>
                    ) : assignmentMix.map(item => (
                        <div className="gang-task-chip" key={item.task}>
                            <span>{item.task}</span>
                            <b>{item.count}</b>
                        </div>
                    ))}
                </section>

                <section className="gang-member-grid">
                    {members.length === 0 ? (
                        <div className="gang-empty">No gang members yet.</div>
                    ) : members.slice(0, 12).map(member => (
                        <MemberCard key={member.name} member={member} />
                    ))}
                </section>

                <footer className="gang-footer">
                    <span>Bought {gang?.boughtEquipment ?? 0} this cycle</span>
                    <b>{formatFreshness(gang?.updatedAt)}</b>
                </footer>
            </div>
        </Card>
    );
}

function MemberCard({ member }) {
    const combatAverage =
        Number(member.combatAverage) || getCombatAverage(member);
    const combatMinimum =
        Number(member.combatMinimum) || Math.min(
            Number(member.str) || 0,
            Number(member.def) || 0,
            Number(member.dex) || 0,
            Number(member.agi) || 0,
        );
    const ascension =
        member.ascension ?? {};
    const progress =
        Math.max(0, Math.min(100, Number(ascension.progress ?? 0) * 100));
    const ready =
        ascension.ready === true;
    const progressTone =
        ready ? "ready" : progress >= 75 ? "hot" : progress >= 45 ? "warm" : "cold";

    return (
        <article className={`gang-member-card gang-asc-${progressTone}`}>
            <header>
                <div>
                    <b>{member.name}</b>
                    <span>{member.task ?? "--"}</span>
                </div>
                <em>{ready ? "ASCEND" : `${Math.round(progress)}%`}</em>
            </header>

            <div className="gang-member-stats">
                <MiniStat label="Combat" value={formatNumber(combatAverage, 0)} />
                <MiniStat label="Lowest" value={formatNumber(combatMinimum, 0)} />
                <MiniStat label="Asc" value={`${formatNumber(getAscAverage(member), 2)}x`} />
                <MiniStat label="Respect" value={formatNumber(member.earnedRespect ?? 0, 1)} />
            </div>

            <div className="gang-asc-row">
                <div className="gang-asc-label">
                    <span>Ascension readiness</span>
                    <b>{formatNumber(ascension.projected ?? 1, 2)} / {formatNumber(ascension.threshold ?? 0, 2)}</b>
                </div>
                <div className="gang-asc-bar">
                    <span style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className="gang-member-gains">
                <span>$/s {formatMoney(member.moneyGain ?? 0)}</span>
                <span>rep/s {formatNumber(member.respectGain ?? 0, 2)}</span>
                <span>wanted/s {formatNumber(member.wantedLevelGain ?? 0, 3)}</span>
            </div>
        </article>
    );
}

function MiniStat({ label, value }) {
    return (
        <div>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function Metric({ label, value, tone }) {
    return (
        <div className={`gang-metric gang-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function countAssignments(assignments) {
    const counts = new Map();

    for (const item of assignments) {
        const task = item?.task ?? "Unknown";
        counts.set(task, (counts.get(task) ?? 0) + 1);
    }

    return [...counts.entries()]
        .map(([task, count]) => ({ task, count }))
        .sort((a, b) => b.count - a.count);
}

function getCombatAverage(member) {
    const values = [member?.str, member?.def, member?.dex, member?.agi]
        .map(value => Number(value) || 0);
    return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function getAscAverage(member) {
    const values = [member?.strAsc, member?.defAsc, member?.dexAsc, member?.agiAsc]
        .map(value => Number(value) || 1);
    return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function getCombatSummary(members) {
    if (!members.length) {
        return { average: 0, weakestName: null };
    }

    const scored = members.map(member => ({
        name: member?.name ?? "Unknown",
        combat: Number(member?.combatAverage) || getCombatAverage(member),
    }));
    const total = scored.reduce((sum, member) => sum + member.combat, 0);
    const weakest = scored.reduce((low, member) => member.combat < low.combat ? member : low, scored[0]);

    return {
        average: total / Math.max(1, scored.length),
        weakestName: weakest?.name ?? null,
    };
}

function getAscensionSummary(members) {
    if (!members.length) {
        return { ready: 0, nextName: null, nextProgress: 0 };
    }

    const scored = members.map(member => {
        const progress = Math.max(0, Math.min(1, Number(member?.ascension?.progress ?? 0)));
        return {
            name: member?.name ?? "Unknown",
            ready: member?.ascension?.ready === true,
            progress,
        };
    });
    const next = scored.reduce((best, member) => member.progress > best.progress ? member : best, scored[0]);

    return {
        ready: scored.filter(member => member.ready).length,
        nextName: next?.name ?? null,
        nextProgress: next?.progress ?? 0,
    };
}

function formatFreshness(updatedAt) {
    const time = Number(updatedAt);
    if (!Number.isFinite(time) || time <= 0) return "no telemetry";
    const ageSeconds = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
    return `${Math.round(ageSeconds / 3600)}h ago`;
}
