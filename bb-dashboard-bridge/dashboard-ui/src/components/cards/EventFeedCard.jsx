import Card from "../shared/Card.jsx";

export default function EventFeedCard({
    events = [],
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const visible = [...events].slice(-30).reverse();

    return (
        <Card
            id={id}
            title="Event Feed"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="event-feed">
                {visible.length === 0 && (
                    <div className="muted">No events yet.</div>
                )}

                {visible.map((event, index) => (
                    <div key={`${event.ts}-${index}`} className={`event-line event-${event.level ?? "info"}`}>
                        <span className="event-time">{formatEventTime(event.ts)}</span>
                        <span className="event-type">{event.type ?? "system"}</span>
                        <span className="event-message">{event.message ?? ""}</span>
                    </div>
                ))}
            </div>
        </Card>
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