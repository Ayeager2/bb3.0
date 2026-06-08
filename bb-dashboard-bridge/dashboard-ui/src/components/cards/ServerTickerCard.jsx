import Card from "../shared/Card.jsx";
import { formatMoney } from "../../utils/formatters.js";
import "./ServerTickerCard.css";

export default function ServerTickerCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const ticker = state?.servers?.serverTicker ?? null;
    const fleet = ticker?.fleet ?? {};
    const acted = ticker?.acted === true;
    const ram = ticker?.ram ?? fleet.maxRam ?? 0;

    return (
        <Card
            id={id}
            title="Server Ticker"
            size="third"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className={`server-ticker ${acted ? "server-ticker-live" : "server-ticker-idle"}`}>
                <div className="server-ticker-header">
                    <div>
                        <div className="server-ticker-label">{acted ? "Latest Cloud Action" : "Cloud Fleet"}</div>
                        <div className="server-ticker-name">{ticker?.server ?? "standing by"}</div>
                    </div>
                    <div className="server-ticker-status">{acted ? "LIVE" : "IDLE"}</div>
                </div>

                <div className="server-ticker-main">
                    <div className="server-ticker-ram">
                        <b>{formatRam(ram)}</b>
                        <span>{ticker?.type ?? "server"}</span>
                    </div>
                    <div className="server-ticker-cost">
                        <span>Cost</span>
                        <b>{formatMoney(ticker?.cost ?? 0)}</b>
                    </div>
                </div>

                <div className="server-ticker-fleet">
                    <div className="server-ticker-fleet-row">
                        <span>Fleet</span>
                        <b>{fleet.count ?? 0}/{fleet.limit ?? 0}</b>
                    </div>
                    <div className="server-ticker-fleet-row">
                        <span>RAM Band</span>
                        <b>{formatRam(fleet.minRam)} - {formatRam(fleet.maxRam)}</b>
                    </div>
                    <div className="server-ticker-bar">
                        <span style={{ width: `${getFleetRamPercent(fleet)}%` }} />
                    </div>
                </div>

                <div className="server-ticker-message">
                    {ticker?.message ?? "Waiting for server purchaser telemetry."}
                </div>
                <div className="server-ticker-time">
                    {formatFreshness(ticker?.updatedAt)}
                </div>
            </div>
        </Card>
    );
}

function formatRam(value) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) return "0GB";
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}PB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)}TB`;
    return `${n.toFixed(0)}GB`;
}

function formatFreshness(updatedAt) {
    const time = Number(updatedAt);

    if (!Number.isFinite(time) || time <= 0) return "no telemetry yet";

    const ageSeconds = Math.max(0, Math.round((Date.now() - time) / 1000));

    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
    return `${Math.round(ageSeconds / 3600)}h ago`;
}

function getFleetRamPercent(fleet) {
    const max = Number(fleet?.maxRamLimit);
    const current = Number(fleet?.maxRam);

    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(current)) return 0;

    return Math.max(0, Math.min(100, (current / max) * 100));
}
