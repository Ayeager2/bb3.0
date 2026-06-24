import { useMemo, useState } from "react";

import Card from "../shared/Card.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./AugmentationTreeCard.css";

const NEUROFLUX = "NeuroFlux Governor";

export default function AugmentationTreeCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
}) {
    const augmentationState = state?.augmentationIntel?.state ?? null;
    const plan = state?.augmentationIntel?.plan ?? null;
    const buyer = state?.augmentationIntel?.buyer ?? null;
    const factionWork = state?.augmentationIntel?.factionWork ?? null;
    const isBn9 = Number(state?.bitnode?.number) === 9;
    const factions = useMemo(() => buildFactionNodes(augmentationState, plan), [augmentationState, plan]);
    const [selectedFaction, setSelectedFaction] = useState(null);
    const selected = factions.find(faction => faction.name === selectedFaction) ?? factions[0] ?? null;

    return (
        <Card
            id={id}
            title="Augmentation Status"
            size={layoutSize ?? (isBn9 ? "third" : "three-quarters")}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="aug-tree-card">
                <div className="aug-tree-header">
                    <div>
                        <span>Next Augmentation</span>
                        <b>{plan?.nextGoal?.name ?? "No goal"}</b>
                    </div>
                    <div>
                        <span>Faction</span>
                        <b>{plan?.nextGoal?.faction ?? factionWork?.targetFaction ?? "none"}</b>
                    </div>
                    <div>
                        <span>Buyer</span>
                        <b className={buyer?.allowBuying ? "aug-good" : "aug-warn"}>{buyer?.status ?? "unknown"}</b>
                    </div>
                    <div>
                        <span>Unbought</span>
                        <b>{formatNumber(factions.reduce((sum, faction) => sum + faction.remaining, 0), 0)}</b>
                    </div>
                </div>

                {isBn9 ? (
                    <FactionAccordion
                        factions={factions}
                        selectedFaction={selectedFaction}
                        onSelect={setSelectedFaction}
                        plan={plan}
                        factionWork={factionWork}
                    />
                ) : (
                    <div className="aug-tree-layout">
                        <div className="aug-tree-map" aria-label="Faction augmentation tree">
                            <div className="aug-root-node">
                                <span>BN{plan?.bitNode ?? state?.bitnode?.number ?? "?"}</span>
                                <b>Aug Path</b>
                            </div>

                            <div className="aug-faction-branches">
                                {factions.length === 0 ? (
                                    <div className="aug-empty">No augmentation telemetry yet.</div>
                                ) : factions.map((faction, index) => (
                                    <button
                                        key={faction.name}
                                        className={[
                                            "aug-faction-node",
                                            selected?.name === faction.name ? "selected" : "",
                                            faction.joined ? "joined" : "locked",
                                            faction.remaining > 0 ? "has-work" : "complete",
                                        ].filter(Boolean).join(" ")}
                                        style={{ "--branch-index": index }}
                                        onClick={() => setSelectedFaction(faction.name)}
                                    >
                                        <span className="aug-branch-line" />
                                        <span className="aug-node-name">{faction.name}</span>
                                        <span className="aug-node-meta">{faction.joined ? "joined" : "not joined"}</span>
                                        <span className="aug-node-badge">
                                            {faction.remaining}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <FactionInspector faction={selected} plan={plan} factionWork={factionWork} />
                    </div>
                )}
            </div>
        </Card>
    );
}

function FactionAccordion({
    factions,
    selectedFaction,
    onSelect,
    plan,
    factionWork,
}) {
    if (factions.length === 0) {
        return (
            <div className="aug-accordion">
                <div className="aug-empty">No augmentation telemetry yet.</div>
            </div>
        );
    }

    return (
        <div className="aug-accordion" aria-label="Faction augmentation accordion">
            {factions.map(faction => {
                const expanded = faction.name === selectedFaction;
                const activeGoal = plan?.nextGoal?.faction === faction.name;
                const activeWork = factionWork?.targetFaction === faction.name;
                const active = activeGoal || activeWork;

                return (
                    <section
                        key={faction.name}
                        className={[
                            "aug-accordion-item",
                            expanded ? "expanded" : "",
                            active ? "active-work" : "",
                            faction.joined ? "joined" : "locked",
                            faction.remaining > 0 ? "has-work" : "complete",
                        ].filter(Boolean).join(" ")}
                    >
                        <button
                            className="aug-accordion-trigger"
                            onClick={() => onSelect(expanded ? null : faction.name)}
                            aria-expanded={expanded}
                        >
                            <span>
                                <b>{faction.name}</b>
                                <em>
                                    {active
                                        ? activeWork ? "active faction work" : "active buyer goal"
                                        : faction.joined ? "joined" : "not joined"}
                                </em>
                            </span>
                            {active && <span className="aug-active-chip">ACTIVE</span>}
                            <span className={faction.remaining > 0 ? "aug-count-danger" : "aug-count-good"}>
                                {faction.remaining} left
                            </span>
                        </button>

                        {expanded && (
                            <FactionInspector faction={faction} plan={plan} factionWork={factionWork} />
                        )}
                    </section>
                );
            })}
        </div>
    );
}

function FactionInspector({ faction, plan, factionWork }) {
    if (!faction) {
        return (
            <aside className="aug-inspector">
                <div className="aug-inspector-empty">Select a faction to inspect augmentations.</div>
            </aside>
        );
    }

    const activeGoal = plan?.nextGoal?.faction === faction.name ? plan.nextGoal : null;
    const activeWork = factionWork?.targetFaction === faction.name ? factionWork : null;
    const displayAugs = faction.augmentations.slice(0, 18);

    return (
        <aside className="aug-inspector">
            <div className="aug-inspector-top">
                <div>
                    <span>Faction</span>
                    <b>{faction.name}</b>
                </div>
                <div className={faction.remaining > 0 ? "aug-count-danger" : "aug-count-good"}>
                    {faction.remaining} left
                </div>
            </div>

            <div className="aug-inspector-metrics">
                <Metric label="Rep" value={formatNumber(faction.rep, 0)} tone="cyan" />
                <Metric label="Favor" value={formatNumber(faction.favor, 0)} tone="purple" />
                <Metric label="Owned" value={`${faction.owned}/${faction.nonRepeatableCount}`} tone="green" />
                <Metric label="Ready" value={formatNumber(faction.readyCount, 0)} tone="yellow" />
            </div>

            {(activeGoal || activeWork) && (
                <div className="aug-active-goal">
                    <span>{activeGoal ? "Buyer Goal" : "Faction Work"}</span>
                    <b>{activeGoal?.name ?? activeWork?.targetAugmentation}</b>
                    <em>{activeGoal?.hasRep || activeWork?.missingRep <= 0 ? "rep ready" : `missing ${formatNumber(activeGoal ? activeGoal.rep - activeGoal.factionRep : activeWork?.missingRep, 0)} rep`}</em>
                </div>
            )}

            <div className="aug-list">
                {displayAugs.map(aug => (
                    <div
                        key={`${faction.name}-${aug.name}`}
                        className={[
                            "aug-row",
                            aug.owned ? "owned" : "",
                            aug.ready ? "ready" : "",
                            aug.repeatable ? "repeatable" : "",
                        ].filter(Boolean).join(" ")}
                    >
                        <div>
                            <b>{aug.name}</b>
                            <span>{aug.tags.join(" / ") || "misc"}</span>
                        </div>
                        <div className="aug-row-status">
                            <span>{aug.owned ? "owned" : aug.ready ? "ready" : "locked"}</span>
                            <em>{formatMoney(aug.price)} | {formatNumber(aug.rep, 0)} rep</em>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}

function Metric({ label, value, tone }) {
    return (
        <div className={`aug-metric aug-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function buildFactionNodes(augmentationState, plan) {
    const factions = Array.isArray(augmentationState?.factions) ? augmentationState.factions : [];
    const planFactions = new Set([
        plan?.nextGoal?.faction,
        ...(Array.isArray(plan?.candidates) ? plan.candidates.map(candidate => candidate.faction) : []),
    ].filter(Boolean));

    return factions
        .map(faction => {
            const augmentations = (faction.augmentations ?? []).map(aug => {
                const repeatable = aug.name === NEUROFLUX;
                const owned = aug.owned === true || aug.installed === true || aug.queued === true;
                const hasRep = Number(faction.rep ?? aug.factionRep ?? 0) >= Number(aug.rep ?? 0);
                const ready = !owned && hasRep && aug.affordableAtBuild === true;

                return {
                    name: aug.name,
                    price: aug.price,
                    rep: aug.rep,
                    tags: aug.tags ?? [],
                    owned,
                    ready,
                    repeatable,
                };
            });

            const nonRepeatable = augmentations.filter(aug => !aug.repeatable);
            const remaining = nonRepeatable.filter(aug => !aug.owned).length;
            const readyCount = nonRepeatable.filter(aug => aug.ready).length;

            return {
                name: faction.faction,
                theme: faction.theme,
                joined: faction.joined === true,
                rep: faction.rep ?? 0,
                favor: faction.favor ?? faction.requirements?.favor ?? 0,
                remaining,
                readyCount,
                owned: nonRepeatable.length - remaining,
                nonRepeatableCount: nonRepeatable.length,
                isPlanFaction: planFactions.has(faction.faction),
                augmentations: augmentations.sort(compareAugmentations),
            };
        })
        .filter(faction => faction.joined || faction.isPlanFaction || faction.remaining > 0)
        .sort((a, b) => {
            if (a.isPlanFaction !== b.isPlanFaction) return a.isPlanFaction ? -1 : 1;
            if (a.joined !== b.joined) return a.joined ? -1 : 1;
            return b.remaining - a.remaining || a.name.localeCompare(b.name);
        })
        .slice(0, 12);
}

function compareAugmentations(a, b) {
    if (a.repeatable !== b.repeatable) return a.repeatable ? 1 : -1;
    if (a.owned !== b.owned) return a.owned ? 1 : -1;
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return Number(a.rep ?? 0) - Number(b.rep ?? 0);
}
