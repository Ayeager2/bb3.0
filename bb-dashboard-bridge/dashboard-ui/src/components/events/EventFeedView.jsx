import "./EventFeedView.css";

export default function EventFeedView({
    events = [],
    limit = 50,
    emptyText = "No events yet.",
}) {
    const visible = [...events].slice(-limit).reverse();

    return (
        <div className="event-feed">
            {visible.length === 0 && (
                <div className="muted">{emptyText}</div>
            )}

            {visible.map((event, index) => (
                <div
                    key={`${event.ts}-${index}`}
                    className={`event-line event-${event.level ?? "info"}`}
                >
                    <span className="event-time">{formatEventTime(event.ts)}</span>
                    <span className="event-type">{event.type ?? "system"}</span>
                    <span className="event-message">{event.message ?? ""}</span>
                </div>
            ))}
        </div>
    );
}

function formatEventTime(ts) {
    if (!ts) return "--:--:--";

    try {
        return new Date(ts).toLocaleTimeString();
    } catch {
        return "--:--:--";
    }
}