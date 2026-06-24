import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./BN9EconomyView.css";

export default function BN9EconomyView({ state }) {
    const stock = state?.economy?.stockTrader ?? {};
    const hacknet = state?.economy?.hacknet ?? {};
    const spender = state?.economy?.hashSpender ?? {};
    const stockActions = Array.isArray(stock.recentActions) ? stock.recentActions : [];
    const hacknetActions = Array.isArray(hacknet.recentActions) ? hacknet.recentActions : [];
    const hashActions = Array.isArray(spender.recentActions) ? spender.recentActions : [];
    const rows = Array.isArray(stock.rows) ? stock.rows : [];
    const hotStocks = rows
        .filter(row => Number(row.forecast) >= 0.58 || Number(row.shares) > 0)
        .slice(0, 8);

    return (
        <div className="bn9-view">
            <div className="bn9-metrics">
                <Metric label="Hash Prod" value={`${formatNumber(hacknet.totalProduction ?? 0, 3)} h/s`} tone="green" />
                <Metric label="Hashes" value={`${formatNumber(hacknet.hashes?.hashes ?? 0, 0)} / ${formatNumber(hacknet.hashes?.capacity ?? 0, 0)}`} tone="cyan" />
                <Metric label="Stock P/L" value={formatMoney(stock.totalProfit ?? 0)} tone={Number(stock.totalProfit) >= 0 ? "green" : "red"} />
                <Metric label="Portfolio" value={formatMoney(stock.portfolioValue ?? 0)} tone="purple" />
            </div>

            <section className="bn9-panel">
                <div className="bn9-panel-title">Hacknet Buyer</div>
                <div className="bn9-status-line">
                    <span>{hacknet.status ?? "unknown"}</span>
                    <b>{hacknet.message ?? "No Hacknet buyer telemetry."}</b>
                </div>
                <DecisionGrid hacknet={hacknet} />
                <HistoryList items={hacknetActions} empty="No Hacknet upgrade history yet." />
            </section>

            <section className="bn9-panel">
                <div className="bn9-panel-title">Hash Spender</div>
                <div className="bn9-status-line">
                    <span>{spender.status ?? "unknown"}</span>
                    <b>{spender.message ?? "No hash spender telemetry."}</b>
                </div>
                <div className="bn9-reason">{spender.hashPolicy?.reason ?? "No hash policy reason published."}</div>
                <HistoryList items={hashActions} empty="No hash spend history yet." />
            </section>

            <section className="bn9-panel">
                <div className="bn9-panel-title">Stock Sales / Trades</div>
                <div className="bn9-status-line">
                    <span>{stock.mode ?? "offline"}</span>
                    <b>{stock.marketAccess?.blockedReason ?? stock.lastAction ?? "No stock action yet."}</b>
                </div>
                <HistoryList items={stockActions} empty="No stock trade history yet." />
            </section>

            <section className="bn9-panel">
                <div className="bn9-panel-title">Stock Watch</div>
                <div className="bn9-stock-list">
                    {hotStocks.length === 0 ? (
                        <div className="bn9-empty">No hot stock rows yet.</div>
                    ) : hotStocks.map(row => (
                        <div key={row.sym} className="bn9-stock-row">
                            <b>{row.sym}</b>
                            <span>{formatNumber(row.shares, 0)} sh</span>
                            <span>{formatMoney(row.price)}</span>
                            <em>{row.forecast == null ? "--" : `${(Number(row.forecast) * 100).toFixed(0)}%`}</em>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function DecisionGrid({ hacknet }) {
    const action = hacknet.nextAction ?? hacknet.roi?.bestCandidate ?? {};
    const payback = Number(action.paybackSeconds);

    return (
        <div className="bn9-decision-grid">
            <Metric label="Next" value={action.label ?? "none"} tone="cyan" />
            <Metric label="Cost" value={formatMoney(action.cost ?? 0)} tone="yellow" />
            <Metric label="Payback" value={Number.isFinite(payback) ? formatDuration(payback) : "capacity"} tone="purple" />
            <Metric label="Gain" value={`${formatNumber(action.productionGain ?? 0, 3)} h/s`} tone="green" />
        </div>
    );
}

function HistoryList({ items, empty }) {
    return (
        <div className="bn9-history">
            {items.length === 0 ? (
                <div className="bn9-empty">{empty}</div>
            ) : items.slice(0, 12).map((item, index) => (
                <div className="bn9-history-row" key={`${item}-${index}`}>
                    {item}
                </div>
            ))}
        </div>
    );
}

function Metric({ label, value, tone = "cyan" }) {
    return (
        <div className={`bn9-metric bn9-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function formatDuration(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n)) return "unknown";
    if (n >= 3600) return `${(n / 3600).toFixed(1)}h`;
    if (n >= 60) return `${(n / 60).toFixed(1)}m`;
    return `${n.toFixed(0)}s`;
}
