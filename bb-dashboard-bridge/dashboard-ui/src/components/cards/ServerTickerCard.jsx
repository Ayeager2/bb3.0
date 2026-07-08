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
    const featuredServer =
        nextAction?.server
            ? {
                name: nextAction.server,
                ram: nextAction?.ram ?? nextAction?.toRam ?? fleet?.weakest?.ram ?? 0,
                usedRam: fleet?.weakest?.usedRam ?? 0,
            }
            : servers[0] ?? null;

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
                <div className="server-ticker-fleet">
                    <div className="server-ticker-fleet-row">
                        <span>Fleet</span>
                        <b>{fleet.count ?? 0}/{fleet.limit ?? 0}</b>
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

                <div className="server-ticker-scroll">
                    <div className="server-ticker-next">
                        <div className="server-ticker-next-head">
                            <span>Next Upgrade</span>
                            <b className={nextAction?.affordable ? "affordable" : "waiting"}>
                                {nextAction?.affordable ? "READY" : "WAIT"}
                            </b>
                        </div>
                        <div className="server-ticker-next-showcase">
                            <ServerTile server={featuredServer} featured />
                            <div className="server-ticker-next-grid">
                                <Mini label="Server" value={nextAction?.server ?? featuredServer?.name ?? "new"} />
                                <Mini label="From" value={formatRam(nextAction?.fromRam ?? fleet?.weakest?.ram)} />
                                <Mini label="To" value={formatRam(nextAction?.ram ?? featuredServer?.ram)} />
                                <Mini label="Cost" value={formatMoney(nextAction?.cost ?? 0)} />
                            </div>
                        </div>
                        <p>{fleet?.weakest?.name ? `Weakest server: ${fleet.weakest.name}` : "No weakest server telemetry."}</p>
                    </div>

                    <div className="server-ticker-grid" aria-label="Cloud server fleet">
                        {servers.length === 0 ? (
                            <div className="server-ticker-empty">No cloud fleet telemetry.</div>
                        ) : servers.slice(0, 25).map(server => (
                            <ServerTile server={server} key={server.name} />
                        ))}
                    </div>
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

function ServerTile({ server, featured = false }) {
    const ram = Number(server?.ram) || 0;
    const usedRam = Number(server?.usedRam) || 0;
    const tier = getServerTier(ram);
    const usedPercent =
        ram > 0
            ? Math.max(0, Math.min(100, (usedRam / ram) * 100))
            : 0;

    return (
        <div className={`server-tile server-tile-${tier.id} ${featured ? "server-tile-featured" : ""}`}>
            <div className="server-tile-online" />
            <img
                src={tier.image}
                alt=""
                className="server-tile-art"
                draggable="false"
            />
            <div className="server-tile-name">{server?.name ?? "new-server"}</div>
            <div className="server-tile-ram">{formatRam(ram)}</div>
            <div className="server-tile-tier">{tier.label}</div>
            <div className="server-tile-used" title={`Used RAM: ${formatRam(usedRam)} / ${formatRam(ram)}`}>
                <span style={{ width: `${usedPercent}%` }} />
            </div>
        </div>
    );
}

function getServerTier(ram) {
    const value = Number(ram) || 0;

    if (value >= 1024 * 1024) {
        return { id: "1p", image: "/sprites/servers/generated/server-tier-1p.png", label: "128-bit / 32-core" };
    }

    if (value >= 1024) {
        return { id: "1t", image: "/sprites/servers/generated/server-tier-1t.png", label: "64-bit / 16-core" };
    }

    if (value >= 512) {
        return { id: "512", image: "/sprites/servers/generated/server-tier-512.png", label: "96-bit / 16-core" };
    }

    if (value >= 256) {
        return { id: "256", image: "/sprites/servers/generated/server-tier-256.png", label: "64-bit / 8-core" };
    }

    if (value >= 64) {
        return { id: "64", image: "/sprites/servers/generated/server-tier-64.png", label: "64-bit / 4-core" };
    }

    return { id: "32", image: "/sprites/servers/generated/server-tier-32.png", label: "32-bit / 2-core" };
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
