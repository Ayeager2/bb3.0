import { FiActivity, FiX } from "react-icons/fi";

export default function EventFeedDrawer({ open, events = [], onClose, onToggle }) {
    const visible = [...events].slice(-50).reverse();

    return (
        <>
            <button className="event-drawer-tab" onClick={onToggle} title="Event Feed">
                <FiActivity />
            </button>

            <aside className={`event-drawer ${open ? "event-drawer-open" : ""}`}>
                <div className="event-drawer-header">
                    <div>
                        <div className="event-drawer-title">Event Feed</div>
                        <div className="event-drawer-subtitle">Live daemon activity</div>
                    </div>

                    <button className="event-drawer-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="event-feed">
                    {visible.length === 0 && (
                        <div className="muted">No events yet.</div>
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
            </aside>
        </>
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