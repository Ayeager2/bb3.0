import Card from "../shared/Card.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./ServerTickerCard.css";

export default function ServerTickerCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
}) {
    const ticker = state?.servers?.serverTicker ?? null;
    const fleet = ticker?.fleet ?? {};
    const servers = Array.isArray(fleet?.servers)
        ? fleet.servers
        : Object.entries(fleet?.serverRam ?? {}).map(([name, ram]) => ({ name, ram }));
    const nextAction = fleet?.nextAction ?? null;
    const acted = ticker?.acted === true;
    const ram = ticker?.ram ?? fleet.maxRam ?? 0;
    const fleetRamPercent = getFleetRamPercent(fleet);

    return (
        <Card
            id={id}
            title="Server Ticker"
            size={layoutSize ?? "third"}
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
                    <div className="server-ticker-cost">
                        <span>Actions</span>
                        <b>{formatNumber(ticker?.purchaseCount ?? (acted ? 1 : 0), 0)}</b>
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
                    <div className="server-ticker-fleet-row">
                        <span>Total RAM</span>
                        <b className="server-ticker-total">
                            {formatRam(fleet.totalRam)}
                            <small>{formatNumber(fleetRamPercent, 1)}%</small>
                        </b>
                    </div>
                    <div className="server-ticker-bar" title={`Fleet fill: ${formatNumber(fleetRamPercent, 1)}%`}>
                        <span style={{ width: `${fleetRamPercent}%` }} />
                    </div>
                </div>

                <div className="server-ticker-next">
                    <div className="server-ticker-next-head">
                        <span>Next Upgrade</span>
                        <b className={nextAction?.affordable ? "affordable" : "waiting"}>
                            {nextAction?.affordable ? "READY" : "WAIT"}
                        </b>
                    </div>
                    <div className="server-ticker-next-grid">
                        <Mini label="Server" value={nextAction?.server ?? "new"} />
                        <Mini label="From" value={formatRam(nextAction?.fromRam ?? fleet?.weakest?.ram)} />
                        <Mini label="To" value={formatRam(nextAction?.ram)} />
                        <Mini label="Cost" value={formatMoney(nextAction?.cost ?? 0)} />
                    </div>
                    <p>{fleet?.weakest?.name ? `Weakest server: ${fleet.weakest.name}` : "No weakest server telemetry."}</p>
                </div>

                <div className="server-ticker-table">
                    <div className="server-ticker-table-head">
                        <span>Server</span>
                        <span>RAM</span>
                        <span>Used</span>
                    </div>
                    {servers.length === 0 ? (
                        <div className="server-ticker-empty">No cloud fleet telemetry.</div>
                    ) : servers.slice(0, 25).map(server => (
                        <div className="server-ticker-table-row" key={server.name}>
                            <b>{server.name}</b>
                            <span>{formatRam(server.ram)}</span>
                            <span>{formatRam(server.usedRam)}</span>
                        </div>
                    ))}
                </div>

                <div className="server-ticker-message">
                    {ticker?.message ?? "Waiting for server purchaser telemetry."}
                    {ticker?.stoppedReason ? (
                        <small>{ticker.stoppedReason}</small>
                    ) : null}
                </div>
                <div className="server-ticker-time">
                    {formatFreshness(ticker?.updatedAt)}
                </div>
            </div>
        </Card>
    );
}

function Mini({ label, value }) {
    return (
        <div>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function formatRam(value) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) return "0GB";
    if (n >= 1024 * 1024) return `${formatNumber(n / 1024 / 1024, 1)}PB`;
    if (n >= 1024) return `${formatNumber(n / 1024, 1)}TB`;
    return `${formatNumber(n, 0)}GB`;
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
    const total = Number(fleet?.totalRam);
    const count = Number(fleet?.count);
    const limit = Number(fleet?.limit);
    const maxRam = Number(fleet?.maxRam);

    if (!Number.isFinite(total) || total <= 0) return 0;

    const currentFleetSize = Number.isFinite(count) && count > 0 ? count : limit;
    const bandCapacity = Number.isFinite(currentFleetSize) && currentFleetSize > 0 && Number.isFinite(maxRam) && maxRam > 0
        ? currentFleetSize * maxRam
        : Number(fleet?.maxRamLimit);

    if (!Number.isFinite(bandCapacity) || bandCapacity <= 0) return 0;

    return Math.max(0, Math.min(100, (total / bandCapacity) * 100));
}
