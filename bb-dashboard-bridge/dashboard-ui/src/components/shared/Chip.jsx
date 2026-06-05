export default function Chip({ label, active = false, hot = false }) {
    return (
        <span className={`chip ${active ? "chip-on" : ""} ${hot ? "chip-hot" : ""}`}>
            {label}{active ? " ✓" : " ·"}
        </span>
    );
}