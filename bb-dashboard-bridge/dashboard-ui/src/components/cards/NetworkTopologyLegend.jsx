import "./NetworkTopologyCard.css";

export default function NetworkTopologyLegend({
    topology,
    state,
    refreshing = false,
    onRefresh,
}) {
    const nodes = topology?.nodes ?? [];
    const activeTarget = state?.daemon?.target ?? "none";

    const stats = {
        total: nodes.length,
        rooted: nodes.filter(n => n.rooted).length,
        backdoored: nodes.filter(n => n.backdoored).length,
        purchased: nodes.filter(n => n.purchased).length,
        warnings: nodes.filter(n => n.prepWarning || n.needsBackdoor).length,
    };

    return (
        <div className="topology-legend">
            <div className="legend-block">
                <div className="legend-title">Topology</div>
                <div className="legend-row"><span>Total</span><b>{stats.total}</b></div>
                <div className="legend-row"><span>Rooted</span><b>{stats.rooted}</b></div>
                <div className="legend-row"><span>Backdoored</span><b>{stats.backdoored}</b></div>
                <div className="legend-row"><span>Purchased</span><b>{stats.purchased}</b></div>
                <div className="legend-row"><span>Warnings</span><b>{stats.warnings}</b></div>
            </div>

            <div className="legend-block">
                <div className="legend-title">Focus</div>
                <div className="legend-row"><span>Target</span><b>{activeTarget}</b></div>
                <button
                    className="legend-action"
                    disabled={refreshing}
                    onClick={onRefresh}
                >
                    {refreshing ? "Refreshing..." : "Refresh Topology"}
                </button>
            </div>

            <div className="legend-block legend-keys">
                <div className="legend-title">Keys</div>
                <div><i className="key-rooted" /> Rooted</div>
                <div><i className="key-purchased" /> Purchased</div>
                <div><i className="key-backdoored" /> Backdoored</div>
                <div><i className="key-warning" /> Warning</div>
                <div><i className="key-world" /> World Route</div>
            </div>
        </div>
    );
}