import Chip from "../shared/Chip.jsx";

export default function CapabilitiesView({ state }) {
    const c = state?.capabilities ?? {};

    return (
        <div className="chip-list">
            {Object.entries(c).map(([key, value]) => (
                <Chip key={key} label={key} active={Boolean(value)} />
            ))}
        </div>
    );
}