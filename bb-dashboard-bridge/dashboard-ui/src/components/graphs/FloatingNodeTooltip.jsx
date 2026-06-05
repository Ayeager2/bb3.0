import "./FloatingNodeTooltip.css";

export default function FloatingNodeTooltip({ node, position }) {
    if (!node || !position) return null;

    const moneyPercent = percent(node.moneyAvailable, node.moneyMax);
    const securityDiff = diff(node.security, node.minSecurity);

    return (
        <div
            className="floating-node-tooltip"
            style={{
                left: position.x + 14,
                top: position.y + 14,
            }}
        >
            <div className="floating-node-title">{node.label ?? node.id}</div>

            <div className="floating-node-grid">
                <span>Type</span><b>{node.type ?? "unknown"}</b>
                <span>Root</span><b>{node.rooted ? "YES" : "NO"}</b>
                <span>BD</span><b>{node.backdoored ? "YES" : "NO"}</b>
                <span>Hack</span><b>{formatNumber(node.requiredHack)}</b>
                <span>RAM</span><b>{formatNumber(node.maxRam)}GB</b>
                <span>Money</span><b>{moneyPercent}</b>
                <span>Sec+</span><b>{securityDiff}</b>
                <span>Prep</span><b>{node.prepWarning ? "WARN" : "OK"}</b>
                <span>Money%</span><b>{formatPercent(node.moneyPercent)}</b>
            </div>
        </div>
    );
}

function percent(value, max) {
    const n = Number(value);
    const m = Number(max);

    if (!Number.isFinite(n) || !Number.isFinite(m) || m <= 0) return "n/a";

    return `${((n / m) * 100).toFixed(0)}%`;
}

function diff(value, min) {
    const n = Number(value);
    const m = Number(min);

    if (!Number.isFinite(n) || !Number.isFinite(m)) return "n/a";

    return (n - m).toFixed(1);
}

function formatNumber(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "n/a";

    return n.toLocaleString();
}

function formatPercent(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "n/a";

    return `${(n * 100).toFixed(1)}%`;
}