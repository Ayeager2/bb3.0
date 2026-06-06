import { useState } from "react";
import "./DaemonReasoningView.css";

export default function DaemonReasoningView({
    reasoning,
    history = [],
}) {
    const [mode, setMode] = useState("current");
    const items = Array.isArray(reasoning?.items) ? reasoning.items : [];

    return (
        <div className="reasoning-view">
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
                <CurrentReasoning reasoning={reasoning} items={items} />
            )}

            {mode === "history" && (
                <ReasoningHistory history={history} />
            )}
        </div>
    );
}

function CurrentReasoning({ reasoning, items }) {
    if (!items.length) {
        return <div className="reasoning-empty">No daemon reasoning available yet.</div>;
    }

    return (
        <>
            <div className="reasoning-summary">
                <div className="reasoning-summary-label">Summary</div>
                <div className="reasoning-summary-text">
                    {reasoning.summary ?? "No summary."}
                </div>
            </div>

            {items.map(item => (
                <ReasoningItem key={item.id} item={item} />
            ))}
        </>
    );
}

function ReasoningHistory({ history }) {
    if (!history.length) {
        return <div className="reasoning-empty">No reasoning history available yet.</div>;
    }

    return (
        <div className="reasoning-history">
            {history.map((entry, index) => (
                <section key={`${entry.ts}-${index}`} className="reasoning-history-entry">
                    <div className="reasoning-history-top">
                        <div>
                            <div className="reasoning-history-time">
                                {formatTime(entry.ts)}
                            </div>
                            <div className="reasoning-history-summary">
                                {entry.summary}
                            </div>
                        </div>

                        <div className="reasoning-level-counts">
                            {entry.levels?.danger > 0 && <span className="danger">D{entry.levels.danger}</span>}
                            {entry.levels?.warning > 0 && <span className="warning">W{entry.levels.warning}</span>}
                            {entry.levels?.success > 0 && <span className="success">S{entry.levels.success}</span>}
                            {entry.levels?.info > 0 && <span>I{entry.levels.info}</span>}
                        </div>
                    </div>

                    <div className="reasoning-history-items">
                        {(entry.items ?? []).map(item => (
                            <div key={item.id} className={`reasoning-history-item reasoning-${item.level}`}>
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

function formatTime(value) {
    if (!value) return "--:--:--";

    try {
        return new Date(value).toLocaleTimeString();
    } catch {
        return "--:--:--";
    }
}