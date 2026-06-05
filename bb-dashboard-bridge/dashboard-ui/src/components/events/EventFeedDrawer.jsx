import { FiActivity, FiX } from "react-icons/fi";
import EventFeedView from "./EventFeedView.jsx";
import "./EventFeedDrawer.css";

export default function EventFeedDrawer({
    open,
    events = [],
    onClose,
    onToggle,
}) {
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

                <div className="event-drawer-body">
                    <EventFeedView events={events} limit={50} />
                </div>
            </aside>
        </>
    );
}