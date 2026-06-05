import Card from "../shared/Card.jsx";
import EventFeedView from "../events/EventFeedView.jsx";

export default function EventFeedCard({
    events = [],
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
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
            <EventFeedView events={events} limit={30} />
        </Card>
    );
}