import CoreStateView from "../views/CoreStateView.jsx";
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
            <CoreStateView state={CSSStyleProperties}>
        </Card>
    );
}