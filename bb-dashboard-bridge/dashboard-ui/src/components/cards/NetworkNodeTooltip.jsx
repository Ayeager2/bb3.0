import Row from "../shared/Row.jsx";
import InfoPanel from "../shared/InfoPanel.jsx";

export default function NetworkNodeTooltip({ node }) {
    if (!node) {
        return (
            <InfoPanel muted>
                Hover a server node for telemetry.
            </InfoPanel>
        );
    }

    const moneyPercent = percent(node.moneyAvailable, node.moneyMax);
    const securityDiff = diff(node.security, node.minSecurity);
    const pathLength = Array.isArray(node.pathFromHome)
        ? Math.max(0, node.pathFromHome.length - 1)
        : 0;

    return (
        <InfoPanel title={node.label ?? node.id}>
            <div className="network-tooltip-grid">
                <Row label="Type" value={node.type ?? "unknown"} tone="cyan" />
                <Row label="Rooted" value={node.rooted ? "YES" : "NO"} tone={node.rooted ? "green" : "red"} />
                <Row label="Backdoor" value={node.backdoored ? "YES" : "NO"} tone={node.backdoored ? "cyan" : "muted"} />
                <Row label="Faction" value={node.factionServer ? "YES" : "NO"} tone={node.factionServer ? "purple" : "muted"} />
                <Row label="Needs Backdoor" value={node.needsBackdoor ? "YES" : "NO"} tone={node.needsBackdoor ? "yellow" : "green"} />
                <Row label="Hack Req" value={formatNumber(node.requiredHack)} tone="yellow" />
                <Row label="RAM" value={`${formatNumber(node.maxRam)} GB`} tone="purple" />
                <Row label="Money" value={moneyPercent} tone="green" />
                <Row label="Sec +" value={securityDiff} tone={Number(securityDiff) > 5 ? "red" : "yellow"} />
                <Row label="Path Hops" value={pathLength} tone="cyan" />

            </div>
        </InfoPanel>
    );
}

function percent(value, max) {
    const n = Number(value);
    const m = Number(max);

    if (!Number.isFinite(n) || !Number.isFinite(m) || m <= 0) {
        return "n/a";
    }

    return `${((n / m) * 100).toFixed(1)}%`;
}

function diff(value, min) {
    const n = Number(value);
    const m = Number(min);

    if (!Number.isFinite(n) || !Number.isFinite(m)) {
        return "n/a";
    }

    return (n - m).toFixed(2);
}

function formatNumber(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "n/a";
    }

    return n.toLocaleString();
}