import Card from "../shared/Card.jsx";
import { sendDashboardCommand } from "../../api/dashboardApi.js";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./GangCard.css";

const GANG_TASK_OPTIONS = [
    "Mug People",
    "Deal Drugs",
    "Strongarm Civilians",
    "Run a Con",
    "Armed Robbery",
    "Traffick Illegal Arms",
    "Threaten & Blackmail",
    "Human Trafficking",
    "Terrorism",
    "Vigilante Justice",
    "Train Combat",
    "Train Hacking",
    "Train Charisma",
    "Territory Warfare",
];

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
    const penaltyLossPercent = Number.isFinite(Number(gang?.wantedPenaltyLossPercent))
        ? Number(gang.wantedPenaltyLossPercent)
        : (1 - penalty) * 100;
    const wantedPolicy = gang?.wantedPolicy ?? null;
    const territoryPolicy = gang?.territoryPolicy ?? null;
    const gangMode = gang?.mode ?? "balanced";
    const combatSummary = getCombatSummary(members);
    const ascensionSummary = getAscensionSummary(members);
    const setGangMode = mode => {
        sendDashboardCommand("setGangMode", { mode }).catch(error => {
            console.error(error);
        });
    };
    const setMemberTask = (member, task) => {
        sendDashboardCommand("setGangMemberTask", { member, task }).catch(error => {
            console.error(error);
        });
    };
    const ascendMember = member => {
        sendDashboardCommand("ascendGangMember", { member }).catch(error => {
            console.error(error);
        });
    };

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
                    <Metric label="Money/sec" value={formatMoney(gang?.moneyGainPerSecond ?? ((gang?.moneyGainRate ?? 0) * 5))} tone="green" />
                    <Metric label="Wanted Penalty" value={`${penaltyLossPercent > 0 ? "-" : ""}${Math.abs(penaltyLossPercent).toFixed(2)}%`} tone={getWantedTone(penalty)} />
                    <Metric label="Power" value={formatNumber(gang?.power ?? 0, 1)} tone="yellow" />
                    <Metric label="Avg Combat" value={formatNumber(combatSummary.average, 0)} tone="green" />
                    <Metric label="Territory" value={`${formatNumber((gang?.territory ?? 0) * 100, 2)}%`} tone="cyan" />
                    <Metric label="Asc Ready" value={`${ascensionSummary.ready}/${members.length || 0}`} tone={ascensionSummary.ready > 0 ? "green" : "purple"} />
                </section>

                <section className="gang-panel gang-mode-panel">
                    <div className="gang-panel-head">
                        <span>Gang Doctrine</span>
                        <b>{gang?.modeLabel ?? formatGangMode(gangMode)}</b>
                    </div>
                    <div className="gang-mode-buttons" role="group" aria-label="Gang doctrine mode">
                        <button
                            type="button"
                            className={gangMode === "old-logic" ? "active" : ""}
                            onClick={() => setGangMode("old-logic")}
                        >
                            Old Logic
                        </button>
                        <button
                            type="button"
                            className={gangMode === "balanced" ? "active" : ""}
                            onClick={() => setGangMode("balanced")}
                        >
                            Balanced
                        </button>
                        <button
                            type="button"
                            className={gangMode === "money-only" ? "active" : ""}
                            onClick={() => setGangMode("money-only")}
                        >
                            Money Only
                        </button>
                        <button
                            type="button"
                            className={gangMode === "combat-train-only" ? "active" : ""}
                            onClick={() => setGangMode("combat-train-only")}
                        >
                            Combat Train
                        </button>
                        <button
                            type="button"
                            className={gangMode === "custom" ? "active" : ""}
                            onClick={() => setGangMode("custom")}
                        >
                            Custom
                        </button>
                    </div>
                    <p>{getGangModeDescription(gangMode)}</p>
                </section>

                <section className="gang-panel gang-penalty-panel">
                    <div className="gang-panel-head">
                        <span>Wanted Penalty</span>
                        <b>{penaltyLossPercent > 0 ? "-" : ""}{Math.abs(penaltyLossPercent).toFixed(2)}%</b>
                    </div>
                    <div className="gang-bar">
                        <span style={{ width: `${Math.max(0, Math.min(100, penalty * 100))}%` }} />
                    </div>
                </section>

                <section className={`gang-panel gang-policy-panel gang-policy-${wantedPolicy?.status ?? "unknown"}`}>
                    <div className="gang-panel-head">
                        <span>Wanted Policy</span>
                        <b>{formatPolicyStatus(wantedPolicy?.status)}</b>
                    </div>
                    <div className="gang-policy-grid">
                        <MiniStat label="Vigilantes" value={formatNumber(wantedPolicy?.vigilanteCount ?? 0, 0)} />
                        <MiniStat label="Penalty" value={`${formatWantedPenaltyLoss(wantedPolicy?.wantedPenalty ?? penalty)}`} />
                        <MiniStat label="Wanted/s" value={formatNumber(gang?.wantedLevelGainPerSecond ?? ((wantedPolicy?.wantedGain ?? 0) * 5), 3)} />
                        <MiniStat label="Train Floor" value={formatNumber(wantedPolicy?.thresholds?.trainCombatMin ?? 50000, 0)} />
                    </div>
                    <p>{wantedPolicy?.reason ?? "Waiting for wanted-control telemetry."}</p>
                </section>

                <section className={`gang-panel gang-territory-panel ${territoryPolicy?.territoryTaskAllowed ? "armed" : "paused"}`}>
                    <div className="gang-panel-head">
                        <span>Territory Policy</span>
                        <b>{formatPolicyStatus(territoryPolicy?.status)}</b>
                    </div>
                    <div className="gang-policy-grid">
                        <MiniStat label="Warriors" value={formatNumber(territoryPolicy?.warriorCount ?? 0, 0)} />
                        <MiniStat label="Clash" value={territoryPolicy?.clashEnabled ? "ON" : "OFF"} />
                        <MiniStat label="Kitted" value={`${formatNumber(territoryPolicy?.topEquipmentReadyCount ?? 0, 0)}/${formatNumber(territoryPolicy?.strikeTeamSize ?? 5, 0)}`} />
                        <MiniStat label="Power/min" value={formatNumber(gang?.territoryDelta?.powerPerMinute ?? 0, 2)} />
                    </div>
                    <p>{territoryPolicy?.reason ?? "Waiting for territory telemetry."}</p>
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
                        <div className={`gang-task-chip ${getTaskToneClass(item.task)}`} key={item.task}>
                            <span>{item.task}</span>
                            <b>{item.count}</b>
                        </div>
                    ))}
                </section>

                <section className="gang-member-grid">
                    {members.length === 0 ? (
                        <div className="gang-empty">No gang members yet.</div>
                    ) : members.slice(0, 12).map(member => (
                        <MemberCard
                            key={member.name}
                            member={member}
                            overrideTask={gang?.taskOverrides?.[member.name] ?? ""}
                            onTaskChange={setMemberTask}
                            onAscend={ascendMember}
                        />
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

function formatGangMode(mode) {
    if (mode === "old-logic") return "Old Logic";
    if (mode === "money-only") return "Money Only";
    if (mode === "combat-train-only") return "Combat Train Only";
    if (mode === "custom") return "Custom";
    return "Balanced";
}

function getGangModeDescription(mode) {
    if (mode === "old-logic") {
        return "Original gang script behavior: buy for everyone, split wanted control, Terrorism, arms trafficking, fallback crimes, and old strength-window ascension.";
    }

    if (mode === "money-only") {
        return "Cash doctrine: buy for everyone, keep wanted penalty sane, and otherwise push money tasks without the 100k stat training plan.";
    }

    if (mode === "combat-train-only") {
        return "Combat drill doctrine: every gang member trains combat until you switch modes or set manual task overrides.";
    }

    if (mode === "custom") {
        return "Custom doctrine: member dropdown overrides win over automation. Members set to Auto fall back to money/control behavior.";
    }

    return "Current doctrine: train weak members, manage wanted, build toward the 100k STR/DEF territory team, then earn money.";
}

function MemberCard({ member, overrideTask = "", onTaskChange, onAscend }) {
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
    const ascensionThreshold =
        Number.isFinite(Number(ascension.threshold)) && Number(ascension.threshold) > 0
            ? Number(ascension.threshold)
            : 1.5;
    const projectedAscension =
        Number(ascension.projected) || 1;
    const reportedProgress =
        Number(ascension.progress);
    const computedProgress =
        projectedAscension / ascensionThreshold;
    const progressValue =
        Number.isFinite(reportedProgress) && reportedProgress > 0
            ? reportedProgress
            : computedProgress;
    const progress =
        Math.max(0, Math.min(100, progressValue * 100));
    const ready =
        ascension.ready === true || projectedAscension >= ascensionThreshold;
    const readinessLabel =
        `${formatNumber(projectedAscension, 2)} / ${formatNumber(ascensionThreshold, 2)}`;
    const progressTone =
        ready ? "ready" : progress >= 75 ? "hot" : progress >= 45 ? "warm" : "cold";
    const sprite = getTaskSprite(member.task);
    const ascendTooltip =
        buildAscendTooltip(member, ascension);

    return (
        <article className={`gang-member-card gang-asc-${progressTone}`}>
            <div className="gang-member-portrait">
                <button
                    type="button"
                    className={`gang-manual-ascend ${ready ? "ready" : ""}`}
                    data-tooltip={ascendTooltip}
                    aria-label={`Ascend ${member.name}`}
                    onClick={() => onAscend?.(member.name)}
                >
                    ↑
                </button>
                <GangPixelActor kind={sprite.kind} label={sprite.label} />
                <small>{sprite.label}</small>
            </div>

            <div className="gang-member-content">
                <header className="gang-member-header">
                    <div className="gang-member-title">
                        <b>{member.name}</b>
                        <label>
                            <span>{overrideTask ? "override" : (member.task ?? "--")}</span>
                            <select
                                value={overrideTask}
                                onChange={event => onTaskChange?.(member.name, event.target.value)}
                                aria-label={`Set ${member.name} task override`}
                            >
                                <option value="">Auto</option>
                                {GANG_TASK_OPTIONS.map(task => (
                                    <option key={task} value={task}>{task}</option>
                                ))}
                            </select>
                        </label>
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
                        <b>{readinessLabel}</b>
                    </div>
                    <div className="gang-asc-bar">
                        <span style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <div className="gang-member-gains">
                    <span>$/s {formatMoney(member.moneyGainPerSecond ?? ((member.moneyGain ?? 0) * 5))}</span>
                    <span>rep/s {formatNumber(member.respectGainPerSecond ?? ((member.respectGain ?? 0) * 5), 2)}</span>
                    <span>wanted/s {formatNumber(member.wantedLevelGainPerSecond ?? ((member.wantedLevelGain ?? 0) * 5), 3)}</span>
                </div>
            </div>
        </article>
    );
}

function GangPixelActor({ kind, label }) {
    return (
        <div className={`gang-pixel-actor gang-pixel-${kind}`} title={label} aria-hidden="true">
            <span className="pixel-shadow" />
            <span className="pixel-pack" />
            <span className="pixel-leg pixel-leg-back" />
            <span className="pixel-leg pixel-leg-front" />
            <span className="pixel-boot pixel-boot-back" />
            <span className="pixel-boot pixel-boot-front" />
            <span className="pixel-arm pixel-arm-back" />
            <span className="pixel-body" />
            <span className="pixel-vest" />
            <span className="pixel-arm pixel-arm-front" />
            <span className="pixel-neck" />
            <span className="pixel-head" />
            <span className="pixel-hair" />
            <span className="pixel-eye pixel-eye-left" />
            <span className="pixel-eye pixel-eye-right" />
            <span className="pixel-prop pixel-prop-a" />
            <span className="pixel-prop pixel-prop-b" />
            <span className="pixel-prop pixel-prop-c" />
            <span className="pixel-spark pixel-spark-a" />
            <span className="pixel-spark pixel-spark-b" />
        </div>
    );
}

function buildAscendTooltip(member, ascension) {
    const result = ascension?.result ?? {};
    const rows = [
        ["Hacking", member.hackAsc, result.hack],
        ["Strength", member.strAsc, result.str],
        ["Defense", member.defAsc, result.def],
        ["Dexterity", member.dexAsc, result.dex],
        ["Agility", member.agiAsc, result.agi],
        ["Charisma", member.chaAsc, result.cha],
    ];

    return rows
        .map(([label, current, projected]) => {
            const currentValue = Number(current) || 1;
            const projectedValue = Number(projected) || 1;
            return `${label}: x${currentValue.toFixed(5)} => x${(currentValue * projectedValue).toFixed(5)}`;
        })
        .join("\n");
}

function getTaskSprite(task) {
    const normalized = String(task ?? "").toLowerCase();

    if (normalized.includes("mug")) {
        return { kind: "mug", label: "mug people" };
    }
    if (normalized.includes("deal drugs")) {
        return { kind: "deal", label: "street deal" };
    }
    if (normalized.includes("run a con")) {
        return { kind: "con", label: "run a con" };
    }
    if (normalized.includes("threaten") || normalized.includes("blackmail")) {
        return { kind: "blackmail", label: "blackmail" };
    }
    if (normalized.includes("human trafficking")) {
        return { kind: "traffic", label: "traffic jam" };
    }
    if (normalized.includes("traffic") || normalized.includes("arms")) {
        return { kind: "arms", label: "arms runner" };
    }
    if (normalized.includes("strongarm")) {
        return { kind: "strongarm", label: "strongarm" };
    }
    if (normalized.includes("armed robbery") || normalized.includes("robbery")) {
        return { kind: "robbery", label: "armed robbery" };
    }
    if (normalized.includes("vigilante")) {
        return { kind: "vigilante", label: "vigilante justice" };
    }
    if (normalized.includes("train hacking")) {
        return { kind: "train-hack", label: "hack training" };
    }
    if (normalized.includes("train charisma")) {
        return { kind: "train-charisma", label: "charisma drill" };
    }
    if (normalized.includes("train")) {
        return { kind: "train", label: "training" };
    }
    if (normalized.includes("cyber") || normalized.includes("hack") || normalized.includes("ransomware") || normalized.includes("identity")) {
        return { kind: "hack", label: "datapad op" };
    }
    if (normalized.includes("homicide") || normalized.includes("terrorism")) {
        return { kind: "terrorism", label: "chaos op" };
    }
    if (normalized.includes("territory")) {
        return { kind: "territory", label: "turf watch" };
    }
    return { kind: "money", label: "crew work" };
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

function getWantedTone(penalty) {
    if (penalty < 0.5) return "red";
    if (penalty < 0.75) return "red";
    if (penalty < 0.9) return "yellow";
    return "green";
}

function formatPolicyStatus(status) {
    return String(status ?? "unknown")
        .replaceAll("-", " ");
}

function formatWantedPenaltyLoss(penalty) {
    const loss =
        (1 - (Number(penalty) || 1)) * 100;
    return `${loss > 0 ? "-" : ""}${Math.abs(loss).toFixed(1)}%`;
}

function formatChance(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return `${formatNumber(n * 100, 1)}%`;
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

function getTaskToneClass(task) {
    const normalized = String(task ?? "").toLowerCase();
    if (normalized.includes("vigilante")) return "gang-task-control";
    if (normalized.includes("territory")) return "gang-task-territory";
    if (normalized.includes("train")) return "gang-task-training";
    if (normalized.includes("traffic") || normalized.includes("robbery") || normalized.includes("mug") || normalized.includes("strongarm")) {
        return "gang-task-money";
    }
    return "";
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
