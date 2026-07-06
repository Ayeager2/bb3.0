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
    const maxNodeProduction = Math.max(0, ...nodes.map(node => Number(node?.production) || 0));

    return (
        <Card
            id={id}
            title="Hacknet Hash Forge"
            size={layoutSize ?? "third"}
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

                {nodes.length === 0 ? (
                    <div className="hacknet-empty">No Hacknet nodes yet.</div>
                ) : (
                    <div className="hacknet-node-grid">
                        {nodes.slice(0, 16).map(node => (
                            <HacknetNodeCard
                                key={node.index}
                                node={node}
                                maxProduction={maxNodeProduction}
                            />
                        ))}
                    </div>
                )}

                <div className="hacknet-footer">
                    <span>{hacknet?.nextAction?.label ?? hacknet?.roi?.bestCandidate?.label ?? "No next action"}</span>
                    <b>{formatFreshness(hacknet?.updatedAt)}</b>
                </div>
            </div>
        </Card>
    );
}

function HacknetNodeCard({ node, maxProduction }) {
    const production = Number(node?.production) || 0;
    const progress = getPercent(production, maxProduction);
    const strength = getNodeStrength(node);
    const tone = getNodeTone(strength);
    const label = node?.name ?? `hacknet-server-${node?.index ?? "?"}`;

    return (
        <article className={`hacknet-node-card hacknet-node-${tone}`}>
            <div className="hacknet-node-art-panel">
                <img
                    className="hacknet-node-art"
                    src="/sprites/hacknet/concept/hacknet-node-reference-transparent.png"
                    alt=""
                    aria-hidden="true"
                />
            </div>
            <div className="hacknet-node-info">
                <div className="hacknet-node-title">
                    <b>{label}</b>
                    <span>HASH FORGE</span>
                </div>
                <div className="hacknet-node-specs">
                    <span>L {formatNumber(node?.level, 0)}</span>
                    <span>RAM {formatRam(node?.ram)}</span>
                    <span>C {formatNumber(node?.cores, 0)}</span>
                    <span>Cache {node?.cache ?? "--"}</span>
                </div>
                <div className="hacknet-node-production">
                    <b>{formatNumber(production, 3)} h/s</b>
                    <span>capacity {formatNumber(getNodeHashCap(node), 0)}</span>
                </div>
                <div className="hacknet-node-progress" aria-label={`Production progress ${Math.round(progress)} percent`}>
                    <span style={{ width: `${Math.max(3, progress)}%` }} />
                </div>
                <div className="hacknet-node-stage">{Math.round(progress)}% overclock</div>
            </div>
        </article>
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

function getNodeStrength(node) {
    const level = Number(node?.level) || 0;
    const ram = Number(node?.ram) || 0;
    const cores = Number(node?.cores) || 0;
    const cache = Number(node?.cache) || 0;
    return level + (Math.log2(Math.max(1, ram)) * 12) + (cores * 18) + (cache * 22);
}

function getNodeTone(strength) {
    if (strength >= 620) return "gold";
    if (strength >= 420) return "yellow";
    if (strength >= 260) return "green";
    return "cyan";
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
