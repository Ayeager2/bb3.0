import { useState } from "react";
import "./DaemonReasoningView.css";

const LEVELS = ["danger", "error", "warning", "success", "info"];

export default function DaemonReasoningView({
    reasoning,
    history = [],
}) {
    const [mode, setMode] = useState("current");
    const current = normalizeReasoning(reasoning);
    const entries = normalizeHistory(history);

    return (
        <div className="reasoning-view">
            <ReasoningHero reasoning={current} history={entries} />

            <div className="reasoning-mode-tabs">
                <button
                    className={mode === "current" ? "active" : ""}
                    onClick={() => setMode("current")}
                >
                    Current
                </button>
                <button
                    className={mode === "history" ? "active" : ""}
                    onClick={() => setMode("history")}
                >
                    History
                </button>
            </div>

            {mode === "current" && (
                <CurrentReasoning reasoning={current} />
            )}

            {mode === "history" && (
                <ReasoningHistory history={entries} />
            )}
        </div>
    );
}

function ReasoningHero({ reasoning, history }) {
    const counts = countLevels(reasoning.items);
    const topLevel = getTopLevel(counts);

    return (
        <section className={`reasoning-hero reasoning-hero-${topLevel}`}>
            <div>
                <div className="reasoning-kicker">Daemon Explain</div>
                <div className="reasoning-hero-summary">
                    {reasoning.summary ?? "No daemon reasoning available yet."}
                </div>
                <div className="reasoning-hero-meta">
                    Updated {formatAge(reasoning.updatedAt)}
                    {history.length > 0 ? ` · ${history.length} history snapshots` : ""}
                </div>
            </div>

            <LevelCounts counts={counts} />
        </section>
    );
}

function CurrentReasoning({ reasoning }) {
    if (!reasoning.items.length) {
        return <div className="reasoning-empty">No daemon reasoning available yet.</div>;
    }

    return (
        <div className="reasoning-current">
            <div className="reasoning-summary">
                <div className="reasoning-summary-label">Summary</div>
                <div className="reasoning-summary-text">
                    {reasoning.summary ?? "No summary."}
                </div>
            </div>

            {reasoning.items.map(item => (
                <ReasoningItem key={item.id ?? item.title} item={item} />
            ))}
        </div>
    );
}

function ReasoningHistory({ history }) {
    if (!history.length) {
        return <div className="reasoning-empty">No reasoning history available yet.</div>;
    }

    return (
        <div className="reasoning-history">
            {history.map((entry, index) => (
                <section key={`${entry.ts}-${entry.fingerprint ?? index}`} className="reasoning-history-entry">
                    <div className="reasoning-history-top">
                        <div>
                            <div className="reasoning-history-time">
                                {formatTime(entry.ts)}
                            </div>
                            <div className="reasoning-history-summary">
                                {entry.summary}
                            </div>
                        </div>

                        <LevelCounts counts={entry.levels} compact />
                    </div>

                    <div className="reasoning-history-items">
                        {(entry.items ?? []).slice(0, 5).map(item => (
                            <div key={item.id ?? item.title} className={`reasoning-history-item reasoning-${item.level}`}>
                                <b>{item.title}</b>
                                <span>{item.detail}</span>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function ReasoningItem({ item }) {
    return (
        <section className={`reasoning-item reasoning-${item.level ?? "info"}`}>
            <div className="reasoning-item-header">
                <div>
                    <div className="reasoning-title">{item.title}</div>
                    <div className="reasoning-summary-line">{item.summary}</div>
                </div>

                <span className="reasoning-level">
                    {item.level ?? "info"}
                </span>
            </div>

            <div className="reasoning-detail">
                {item.detail}
            </div>
        </section>
    );
}

function LevelCounts({ counts = {}, compact = false }) {
    return (
        <div className={`reasoning-level-counts ${compact ? "reasoning-level-counts-compact" : ""}`}>
            {LEVELS.map(level => {
                const count = Number(counts[level] ?? 0);
                if (count <= 0) return null;

                return (
                    <span key={level} className={level} title={level}>
                        {level.slice(0, 1).toUpperCase()}{count}
                    </span>
                );
            })}
        </div>
    );
}

function normalizeReasoning(reasoning) {
    const items = Array.isArray(reasoning?.items)
        ? reasoning.items.map(normalizeItem)
        : [];

    return {
        schemaVersion: reasoning?.schemaVersion ?? 1,
        updatedAt: reasoning?.updatedAt ?? reasoning?.bridgeUpdatedAt ?? null,
        bridgeUpdatedAt: reasoning?.bridgeUpdatedAt ?? null,
        source: reasoning?.source ?? "unknown",
        summary: reasoning?.summary ?? null,
        fingerprint: reasoning?.fingerprint ?? null,
        items,
    };
}

function normalizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history
        .filter(Boolean)
        .map(entry => ({
            ts: entry.ts ?? entry.updatedAt ?? null,
            summary: entry.summary ?? "No summary.",
            fingerprint: entry.fingerprint ?? null,
            levels: entry.levels ?? countLevels(entry.items ?? []),
            items: Array.isArray(entry.items) ? entry.items.map(normalizeItem) : [],
        }));
}

function normalizeItem(item = {}) {
    return {
        id: item.id ?? item.title ?? "reason",
        title: item.title ?? item.id ?? "Reason",
        summary: item.summary ?? "",
        detail: item.detail ?? "",
        level: normalizeLevel(item.level),
        data: item.data ?? {},
        ts: item.ts ?? null,
    };
}

function countLevels(items = []) {
    return LEVELS.reduce((acc, level) => {
        acc[level] = items.filter(item => normalizeLevel(item.level) === level).length;
        return acc;
    }, {});
}

function getTopLevel(counts = {}) {
    return LEVELS.find(level => Number(counts[level] ?? 0) > 0) ?? "info";
}

function normalizeLevel(level) {
    const value = String(level ?? "info").toLowerCase();
    if (LEVELS.includes(value)) return value;
    return "info";
}

function formatAge(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "unknown";

    const delta = Math.max(0, Date.now() - n);
    if (delta < 10_000) return "just now";
    if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
    if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;

    return formatTime(n);
}

function formatTime(value) {
    if (!value) return "--:--:--";

    try {
        return new Date(value).toLocaleTimeString();
    } catch {
        return "--:--:--";
    }
}
