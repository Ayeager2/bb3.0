import Card from "../shared/Card.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./HacknetMoneyCard.css";

export default function HacknetMoneyCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
}) {
    const hacknet = state?.economy?.hacknet ?? null;
    const spender = state?.economy?.hashSpender ?? null;
    const nodes = Array.isArray(hacknet?.nodes) ? hacknet.nodes : [];
    const hashPercent = getPercent(hacknet?.hashes?.hashes, hacknet?.hashes?.capacity);

    return (
        <Card
            id={id}
            title="Hacknet Hash Forge"
            size={layoutSize ?? "half"}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="hacknet-card">
                <div className="hacknet-hero">
                    <div>
                        <div className="hacknet-kicker">Hash Money Maker</div>
                        <div className="hacknet-status">{hacknet?.status ?? "offline"}</div>
                        <div className="hacknet-message">{hacknet?.message ?? "Waiting for Hacknet telemetry."}</div>
                    </div>
                    <div className="hacknet-node-count">
                        <b>{hacknet?.nodeCount ?? nodes.length}/{hacknet?.maxNodes ?? 0}</b>
                        <span>nodes</span>
                    </div>
                </div>

                <div className="hacknet-metrics">
                    <Metric label="Production" value={`${formatNumber(hacknet?.totalProduction ?? 0, 3)} h/s`} tone="green" />
                    <Metric label="Hash Value" value={formatMoney(hacknet?.roi?.sellForMoneyValue ?? 0)} tone="yellow" />
                    <Metric label="Hashes" value={`${formatNumber(hacknet?.hashes?.hashes ?? 0, 0)} / ${formatNumber(hacknet?.hashes?.capacity ?? 0, 0)}`} tone="cyan" />
                    <Metric label="Spendable" value={formatMoney(hacknet?.spendable ?? 0)} tone="purple" />
                </div>

                <div className="hacknet-hash-bar">
                    <span style={{ width: `${hashPercent}%` }} />
                </div>

                <div className="hacknet-spender">
                    <span>{spender?.status ?? "spender offline"}</span>
                    <b>{spender?.message ?? "No hash spender telemetry."}</b>
                    <em>{spender?.hashPolicy?.upgradeName ?? spender?.upgradeName ?? "auto"}</em>
                </div>

                <div className="hacknet-table-wrap">
                    <table className="hacknet-table">
                        <thead>
                            <tr>
                                <th>Node</th>
                                <th>Level</th>
                                <th>RAM</th>
                                <th>Cores</th>
                                <th>Cache</th>
                                <th>Prod</th>
                                <th>Cap</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="hacknet-empty">No Hacknet nodes yet.</td>
                                </tr>
                            ) : nodes.slice(0, 16).map(node => (
                                <tr key={node.index}>
                                    <td>{node.name ?? `node-${node.index}`}</td>
                                    <td>{formatNumber(node.level, 0)}</td>
                                    <td>{formatRam(node.ram)}</td>
                                    <td>{formatNumber(node.cores, 0)}</td>
                                    <td>{node.cache ?? "--"}</td>
                                    <td>{formatNumber(node.production, 3)}</td>
                                    <td>{formatNumber(getNodeHashCap(node), 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="hacknet-footer">
                    <span>{hacknet?.nextAction?.label ?? hacknet?.roi?.bestCandidate?.label ?? "No next action"}</span>
                    <b>{formatFreshness(hacknet?.updatedAt)}</b>
                </div>
            </div>
        </Card>
    );
}

function Metric({ label, value, tone }) {
    return (
        <div className={`hacknet-metric hacknet-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function getPercent(value, max) {
    const n = Number(value);
    const m = Number(max);
    if (!Number.isFinite(n) || !Number.isFinite(m) || m <= 0) return 0;
    return Math.max(0, Math.min(100, (n / m) * 100));
}

function getNodeHashCap(node) {
    const cache = Number(node?.cache);
    if (!Number.isFinite(cache) || cache <= 0) return 0;
    return 32 * Math.pow(2, cache);
}

function formatRam(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "0GB";
    if (n >= 1024) return `${(n / 1024).toFixed(1)}TB`;
    return `${n.toFixed(0)}GB`;
}

function formatFreshness(updatedAt) {
    const time = Number(updatedAt);
    if (!Number.isFinite(time) || time <= 0) return "no telemetry";
    const ageSeconds = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
    return `${Math.round(ageSeconds / 3600)}h ago`;
}
