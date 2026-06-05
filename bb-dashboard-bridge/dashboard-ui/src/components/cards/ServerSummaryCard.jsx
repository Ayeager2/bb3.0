import Card from "../shared/Card.jsx";
import Row from "../shared/Row.jsx";

export default function ServerSummaryCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const s = state?.servers ?? {};

    return (
        <Card
            id={id}
            title="Servers"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <Row label="Rooted" value={s.rootedCount ?? 0} tone="green" />
            <Row label="Purchased" value={s.purchasedCount ?? 0} tone="cyan" />
            <Row label="Cloud" value={s.cloudCount ?? 0} tone="purple" />
        </Card>
    );
}