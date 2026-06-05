export default function Row({ label, value, tone = "" }) {
    return (
        <div className="data-row">
            <div className="data-label">{label}</div>
            <div className={`data-value ${tone}`}>{value}</div>
        </div>
    );
}