import Card from "../shared/Card.jsx";
import { sendDashboardCommand } from "../../api/dashboardApi.js";
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
    const isStale = getAgeSeconds(stock?.updatedAt) > 30;
    const statusMessage =
        isStale
            ? "Stock telemetry is stale; trader may not be running."
            : stock?.statusMessage ?? stock?.marketAccess?.blockedReason ?? stock?.lastAction ?? "Waiting for stock trader.";

    const startTrading = () => {
        sendDashboardCommand("startStockTrading").catch(error => {
            console.error(error);
        });
    };

    const stopTrading = () => {
        sendDashboardCommand("stopStockTrading").catch(error => {
            console.error(error);
        });
    };

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
                <div className={`stock-status ${stock?.daemonAllowed === false || isStale ? "stock-status-warn" : "stock-status-live"}`}>
                    <span>{stock?.status ?? (stock ? "online" : "offline")}</span>
                    <b>{statusMessage}</b>
                    <div className="stock-command-buttons">
                        <button type="button" onClick={startTrading} title="Enable stock buying service">
                            Start Buying
                        </button>
                        <button type="button" onClick={stopTrading} title="Sell all stock positions and stop stock buying">
                            Stop Buying
                        </button>
                    </div>
                </div>

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

                <div className="stock-compact-list">
                    {displayRows.length === 0 ? (
                        <div className="stock-empty-panel">No stock telemetry yet.</div>
                    ) : displayRows.map(row => (
                        <CompactStockRow key={row.sym} row={row} />
                    ))}
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
                    <span>{stock?.lastAction ?? statusMessage}</span>
                    <b>{formatFreshness(stock?.updatedAt)}</b>
                </div>
            </div>
        </Card>
    );
}

function CompactStockRow({ row }) {
    const profit = Number(row.profit);
    const forecast = row.forecast === null || row.forecast === undefined ? "--" : formatPercent(row.forecast);

    return (
        <div className={`stock-compact-row ${profit >= 0 ? "stock-compact-win" : "stock-compact-loss"}`}>
            <div className="stock-compact-main">
                <b>{row.sym}</b>
                <span>{formatNumber(row.shares, 0)} sh</span>
            </div>

            <div className="stock-compact-price">
                <span>Price</span>
                <b>{formatMoney(row.price)}</b>
            </div>

            <div className="stock-compact-mini">
                <span>Trend</span>
                <b>{formatSignedPercent(row.trend)}</b>
            </div>

            <div className="stock-compact-mini">
                <span>Fcst</span>
                <b>{forecast}</b>
            </div>

            <div className="stock-compact-profit">
                <span>P/L</span>
                <b>{formatMoney(row.profit)}</b>
            </div>
        </div>
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
    const ageSeconds = getAgeSeconds(updatedAt);
    if (!Number.isFinite(ageSeconds)) return "no telemetry";
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
    return `${Math.round(ageSeconds / 3600)}h ago`;
}

function getAgeSeconds(updatedAt) {
    const time = Number(updatedAt);
    if (!Number.isFinite(time) || time <= 0) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.round((Date.now() - time) / 1000));
}
