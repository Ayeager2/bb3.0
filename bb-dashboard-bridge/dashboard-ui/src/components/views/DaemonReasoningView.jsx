import "./DaemonReasoningView.css";

export default function DaemonReasoningView({ reasoning }) {
    const items = Array.isArray(reasoning?.items) ? reasoning.items : [];

    if (!items.length) {
        return (
            <div className="reasoning-empty">
                No daemon reasoning available yet.
            </div>
        );
    }

    return (
        <div className="reasoning-view">
            <div className="reasoning-summary">
                <div className="reasoning-summary-label">Summary</div>
                <div className="reasoning-summary-text">
                    {reasoning.summary ?? "No summary."}
                </div>
            </div>

            {items.map(item => (
                <section
                    key={item.id}
                    className={`reasoning-item reasoning-${item.level ?? "info"}`}
                >
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
            ))}
        </div>
    );
}