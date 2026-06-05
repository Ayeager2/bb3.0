import Card from "../shared/Card.jsx";
import Chip from "../shared/Chip.jsx";

export default function WidgetResolverCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const visible = state?.widgets?.visible ?? [];
    const emphasized = new Set(state?.widgets?.emphasized ?? []);

    return (
        <Card
            id={id}
            title="Widget Resolver"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="chip-wrap">
                {visible.map(widget => (
                    <Chip
                        key={widget}
                        label={widget}
                        active
                        hot={emphasized.has(widget)}
                    />
                ))}
            </div>
        </Card>
    );
}