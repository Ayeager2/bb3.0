import Card from "../shared/Card.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./StockPortfolioCard.css";

export default function StockPortfolioCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
}) {
    const stock = state?.economy?.stockTrader ?? null;
    const rows = Array.isArray(stock?.rows) ? stock.rows : [];
    const heldRows = rows.filter(row => Number(row.shares) > 0);
    const displayRows = (heldRows.length > 0 ? heldRows : rows).slice(0, 10);
    const access = stock?.marketAccess?.access ?? {};

    return (
        <Card
            id={id}
            title="Stock Checker"
            size={layoutSize ?? "half"}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="stock-card">
                <div className="stock-card-top">
                    <Metric label="Mode" value={stock?.mode ?? "offline"} tone={stock?.daemonAllowed === false ? "warn" : "cyan"} />
                    <Metric label="Portfolio" value={formatMoney(stock?.portfolioValue ?? 0)} tone="green" />
                    <Metric label="P/L" value={formatMoney(stock?.totalProfit ?? 0)} tone={Number(stock?.totalProfit) >= 0 ? "green" : "red"} />
                    <Metric label="Budget" value={formatMoney(stock?.buyBudget ?? 0)} tone="yellow" />
                </div>

                <div className="stock-access-row">
                    <Badge label="WSE" active={access.hasWse} />
                    <Badge label="TIX" active={access.hasTix} />
                    <Badge label="4S UI" active={access.has4SData} />
                    <Badge label="4S API" active={access.has4S} />
                </div>

                <div className="stock-table-wrap">
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th>Sym</th>
                                <th>Shares</th>
                                <th>Price</th>
                                <th>Trend</th>
                                <th>Forecast</th>
                                <th>P/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="stock-empty">No stock telemetry yet.</td>
                                </tr>
                            ) : displayRows.map(row => (
                                <tr key={row.sym} className={Number(row.profit) >= 0 ? "stock-win" : "stock-loss"}>
                                    <td>{row.sym}</td>
                                    <td>{formatNumber(row.shares, 0)}</td>
                                    <td>{formatMoney(row.price)}</td>
                                    <td>{formatSignedPercent(row.trend)}</td>
                                    <td>{row.forecast === null || row.forecast === undefined ? "--" : formatPercent(row.forecast)}</td>
                                    <td>{formatMoney(row.profit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="stock-footer">
                    <span>{stock?.lastAction ?? "Waiting for stock trader."}</span>
                    <b>{formatFreshness(stock?.updatedAt)}</b>
                </div>
            </div>
        </Card>
    );
}

function Metric({ label, value, tone = "cyan" }) {
    return (
        <div className={`stock-metric stock-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function Badge({ label, active }) {
    return (
        <span className={`stock-access ${active ? "stock-access-on" : "stock-access-off"}`}>
            {label}
        </span>
    );
}

function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return `${(n * 100).toFixed(0)}%`;
}

function formatSignedPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    const sign = n > 0 ? "+" : "";
    return `${sign}${(n * 100).toFixed(1)}%`;
}

function formatFreshness(updatedAt) {
    const time = Number(updatedAt);
    if (!Number.isFinite(time) || time <= 0) return "no telemetry";
    const ageSeconds = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
    return `${Math.round(ageSeconds / 3600)}h ago`;
}
