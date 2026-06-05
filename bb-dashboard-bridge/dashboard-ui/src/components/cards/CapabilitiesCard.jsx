import Card from "../shared/Card.jsx";
import Chip from "../shared/Chip.jsx";

export default function CapabilitiesCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const capabilities = state?.capabilities ?? {};

    return (

        <Card
            id={id}
            title="Capabilities"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="chip-wrap">
                {Object.entries(capabilities).map(([key, value]) => (
                    <Chip key={key} label={key} active={value} />
                ))}
            </div>
        </Card>
    );
}