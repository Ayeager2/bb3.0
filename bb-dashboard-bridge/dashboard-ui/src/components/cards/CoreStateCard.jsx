import Card from "../shared/Card.jsx";
import Row from "../shared/Row.jsx";

export default function CoreStateCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const bitnode = state?.bitnode ?? {};
    const progression = state?.progression ?? {};

    return (
        <Card
            id={id}
            title="Core State"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <Row label="BitNode" value={`BN${bitnode.number ?? "?"} ${bitnode.name ?? ""}`} tone="purple" />
            <Row label="Strategy" value={bitnode.strategy ?? "unknown"} tone="cyan" />
            <Row label="Phase" value={progression.phase ?? "unknown"} tone="purple" />
            <Row label="Mode" value={progression.mode ?? "unknown"} tone="green" />
            <Row label="Priority" value={progression.priority ?? "unknown"} tone="cyan" />
            <Row label="Posture" value={progression.posture ?? "unknown"} tone="yellow" />
            <Row label="Next" value={progression.nextAction ?? "none"} tone="muted" />
        </Card>
    );
}