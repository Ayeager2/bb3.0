export default function ProgressBar({ value = 0 }) {
    const pct = Math.max(0, Math.min(100, Number(value || 0) * 100));

    return (
        <div className="progress-bar">
            <div style={{ width: `${pct}%` }} />
        </div>
    );
}