import "./NetworkTopologyCard.css";

export default function NetworkTopologyLegend({
    topology,
    state,
    backdoorQueue = [],
    selectedServer = null,
    refreshing = false,
    onRefresh,
    onForceBackdoor,
}) {
    const nodes = topology?.nodes ?? [];
    const activeTarget = state?.daemon?.target ?? "none";
    const nextBackdoor = backdoorQueue[0] ?? null;
    const commandBackdoor =
        selectedServer?.needsBackdoor
            ? selectedServer
            : nextBackdoor;
    const nextBackdoorHops = Array.isArray(nextBackdoor?.pathFromHome)
        ? Math.max(0, nextBackdoor.pathFromHome.length - 1)
        : null;
    const backdoorCommand = commandBackdoor
        ? `${buildConnectCommand(commandBackdoor.pathFromHome ?? [])}; backdoor`
        : null;

    const stats = {
        total: nodes.length,
        rooted: nodes.filter(n => n.rooted).length,
        backdoored: nodes.filter(n => n.backdoored).length,
        faction: nodes.filter(n => n.factionServer).length,
        backdoorNeeded: nodes.filter(n => n.needsBackdoor).length,
        purchased: nodes.filter(n => n.purchased).length,
        warnings: nodes.filter(n => n.prepWarning || n.needsBackdoor).length,
    };
    const statItems = [
        ["Root", stats.rooted, "green"],
        ["BD", stats.backdoored, "cyan"],
        ["Faction", stats.faction, "purple"],
        ["Need", stats.backdoorNeeded, "yellow"],
        ["Owned", stats.purchased, "purple"],
        ["Warn", stats.warnings, "yellow"],
    ];

    return (
        <div className="topology-legend">
            <div className="legend-block">
                <div className="legend-title">Topology</div>
                <div className="legend-topology-cluster">
                    <div className="legend-total">
                        <b>{stats.total}</b>
                        <span>nodes</span>
                    </div>
                    <div className="legend-stat-grid">
                        {statItems.map(([label, value, tone]) => (
                            <div className={`legend-stat legend-stat-${tone}`} key={label}>
                                <span>{label}</span>
                                <b>{value}</b>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="legend-block">
                <div className="legend-title">Focus</div>
                <div className="legend-focus-grid">
                    <div className="legend-row"><span>Target</span><b>{activeTarget}</b></div>
                    <div className="legend-row"><span>Next BD</span><b>{nextBackdoor ? nextBackdoor.id : "clear"}</b></div>
                    <div className="legend-row"><span>Hops</span><b>{nextBackdoorHops ?? "n/a"}</b></div>
                </div>
                <div className="legend-action-row">
                    {backdoorCommand && (
                        <button
                            className="legend-action legend-action-warn"
                            onClick={() => navigator.clipboard.writeText(backdoorCommand)}
                        >
                            Copy BD
                        </button>
                    )}
                    {commandBackdoor && (
                        <button
                            className="legend-action legend-action-hot"
                            onClick={() => onForceBackdoor?.(commandBackdoor.id)}
                        >
                            {selectedServer?.needsBackdoor ? "Force Selected" : "Force BD"}
                        </button>
                    )}
                    <button
                        className="legend-action"
                        disabled={refreshing}
                        onClick={onRefresh}
                    >
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            <div className="legend-block legend-keys">
                <div className="legend-title">Keys</div>
                <div><i className="key-rooted" /> Rooted</div>
                <div><i className="key-purchased" /> Purchased</div>
                <div><i className="key-backdoored" /> Backdoored</div>
                <div><i className="key-faction" /> Faction</div>
                <div><i className="key-backdoor-needed" /> Need Backdoor</div>
                <div><i className="key-warning" /> Warning</div>
                <div><i className="key-world" /> World Route</div>
            </div>
        </div>
    );
}

function buildConnectCommand(path) {
    return path.map((serverName, index) => {
        if (index === 0) return "home";
        return `connect ${serverName}`;
    }).join("; ");
}
