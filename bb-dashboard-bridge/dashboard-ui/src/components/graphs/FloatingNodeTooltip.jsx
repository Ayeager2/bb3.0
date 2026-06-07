import "./FloatingNodeTooltip.css";

export default function FloatingNodeTooltip({ node, position }) {
    if (!node || !position) return null;

    const moneyPercent = percent(node.moneyAvailable, node.moneyMax);
    const securityDiff = diff(node.security, node.minSecurity);
    const pathHops = Array.isArray(node.pathFromHome)
        ? Math.max(0, node.pathFromHome.length - 1)
        : "n/a";
    const nextHop = Array.isArray(node.pathFromHome) && node.pathFromHome.length > 1
        ? node.pathFromHome[1]
        : "home";
    const tacticalRole = getTacticalRole(node);

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
                <span>Role</span><b className={`floating-tone-${tacticalRole.tone}`}>{tacticalRole.label}</b>
                <span>Root</span><b>{node.rooted ? "YES" : "NO"}</b>
                <span>BD</span><b>{node.backdoored ? "YES" : "NO"}</b>
                <span>Faction</span><b>{node.factionServer ? "YES" : "NO"}</b>
                <span>Need BD</span><b>{node.needsBackdoor ? "YES" : "NO"}</b>
                <span>Hack</span><b>{formatNumber(node.requiredHack)}</b>
                <span>RAM</span><b>{formatNumber(node.maxRam)}GB</b>
                <span>Money</span><b>{moneyPercent}</b>
                <span>Sec+</span><b>{securityDiff}</b>
                <span>Prep</span><b>{node.prepWarning ? "WARN" : "OK"}</b>
                <span>Money%</span><b>{formatPercent(node.moneyPercent)}</b>
                <span>Hops</span><b>{pathHops}</b>
                <span>Next</span><b>{nextHop}</b>
            </div>
        </div>
    );
}

function getTacticalRole(node) {
    if (node.type === "world") return { label: "WORLD", tone: "red" };
    if (node.factionServer && node.needsBackdoor) return { label: "FACTION BD", tone: "yellow" };
    if (node.factionServer) return { label: "FACTION", tone: "purple" };
    if (node.needsBackdoor) return { label: "BACKDOOR", tone: "yellow" };
    if (node.purchased) return { label: "OWNED", tone: "purple" };
    if (node.moneyMax > 0) return { label: "MONEY", tone: "green" };
    return { label: "SERVER", tone: "cyan" };
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
