import { useMemo, useState } from "react";

import GraphCard from "../graphs/GraphCard.jsx";
import {
    graphNode,
    graphEdge,
    dedupeNodes,
} from "../graphs/graphUtils.js";
import NetworkTopologyLegend from "./NetworkTopologyLegend.jsx";
import { sendDashboardCommand } from "../../api/dashboardApi.js";

export default function NetworkTopologyCard({
    state,
    topology,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
    workspaceSettings
}) {
    const [selectedServerId, setSelectedServerId] = useState(null);
    const [hoveredServerId, setHoveredServerId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const isBn9 = Number(state?.bitnode?.number) === 9;
    const cardSize = layoutSize ?? (isBn9 ? "three-quarters" : "third");
    const activeTarget = state?.daemon?.target ?? null;
    const worldDaemon = state?.victory?.worldDaemon ?? "w0r1d_d43m0n";
    const hasTopologyData =
        Array.isArray(topology?.nodes) && topology.nodes.length > 0;
    const topologyMessage =
        topology?.message ??
        "Topology telemetry has not been published yet.";
    const backdoorQueue = useMemo(() => {
        return [...(topology?.nodes ?? [])]
            .filter(node => node?.needsBackdoor)
            .sort((a, b) => {
                const aHops = Array.isArray(a.pathFromHome) ? a.pathFromHome.length : 999;
                const bHops = Array.isArray(b.pathFromHome) ? b.pathFromHome.length : 999;
                return aHops - bHops || Number(a.requiredHack ?? 0) - Number(b.requiredHack ?? 0);
            });
    }, [topology]);

    const selectedServer = useMemo(() => {
        return topology?.nodes?.find(node => node.id === selectedServerId) ?? null;
    }, [topology, selectedServerId]);

    const hoveredServer = useMemo(() => {
        return topology?.nodes?.find(node => node.id === hoveredServerId) ?? null;
    }, [topology, hoveredServerId]);

    const worldDaemonServer = useMemo(() => {
        return topology?.nodes?.find(node => node.id === worldDaemon) ?? null;
    }, [topology, worldDaemon]);

    const selectedPath = selectedServer?.pathFromHome ?? [];
    const worldDaemonPath = worldDaemonServer?.pathFromHome ?? [];

    const { nodes, edges } = useMemo(() => {
        return buildTopologyGraph({
            topology,
            selectedPath,
            activeTarget,
            worldDaemon,
            worldDaemonPath,
        });
    }, [topology, selectedPath, activeTarget, worldDaemon, worldDaemonPath]);

    async function refreshTopology() {
        setRefreshing(true);

        try {
            await sendDashboardCommand("refreshTopology");
        } finally {
            setRefreshing(false);
        }
    }

    async function forceBackdoor(serverId) {
        if (!serverId) return;

        await sendDashboardCommand("forceBackdoor", {
            target: serverId,
        });
    }

    return (
        <GraphCard
            id={id}
            title="Network Topology"
            nodes={nodes}
            edges={edges}
            size={cardSize}
            height={isBn9 ? "calc(100vh - 300px)" : "calc(100vh - 190px)"}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onNodeClick={node => setSelectedServerId(node.id)}
            onNodeMouseEnter={node => setHoveredServerId(node.id)}
            onNodeMouseLeave={() => { }}
            header={
                workspaceSettings?.showLegend !== false ? (
                    <NetworkTopologyLegend
                        topology={topology}
                        state={state}
                        backdoorQueue={backdoorQueue}
                        selectedServer={selectedServer}
                        refreshing={refreshing}
                        onRefresh={refreshTopology}
                        onForceBackdoor={forceBackdoor}
                    />
                ) : null
            }
            overlay={
                !hasTopologyData ? (
                    <div className="graph-empty-overlay">
                        <div>
                            <b>Topology Telemetry Missing</b>
                            <p>{topologyMessage}</p>
                            <button onClick={refreshTopology} disabled={refreshing}>
                                {refreshing ? "Refreshing..." : "Refresh Topology"}
                            </button>
                        </div>
                    </div>
                ) : null
            }
            footer={
                <>
                    {!isBn9 && workspaceSettings?.showPathPanel !== false && (
                        <PathPanel
                            server={selectedServer}
                            path={selectedPath}
                            activeTarget={activeTarget}
                            onClear={() => setSelectedServerId(null)}
                        />
                    )}

                    {!isBn9 && workspaceSettings?.showWorldPanel !== false && (
                        <WorldDaemonPanel
                            worldDaemon={worldDaemon}
                            server={worldDaemonServer}
                            path={worldDaemonPath}
                            canUse={state?.victory?.canUseWorldDaemon}
                            hasRedPill={state?.victory?.hasRedPill}
                        />
                    )}
                </>
            }
        />
    );
}

function PathPanel({ server, path, activeTarget, onClear }) {
    if (!server) {
        return (
            <div className="path-panel muted">
                Select a server node to show path from home.
            </div>
        );
    }

    const command = buildConnectCommand(path);
    const backdoorCommand = buildBackdoorCommand(path);
    const isActiveTarget = server.id === activeTarget;

    async function copyCommand() {
        await navigator.clipboard.writeText(command);
    }

    async function copyBackdoorCommand() {
        await navigator.clipboard.writeText(backdoorCommand);
    }

    return (
        <div className={`path-panel ${server.needsBackdoor ? "path-panel-warning" : ""}`}>
            <div>
                <div className="path-title">
                    {server.id}
                    {isActiveTarget && <span>Daemon Focus</span>}
                    {server.factionServer && <span>Faction</span>}
                    {server.needsBackdoor && <span>Backdoor Needed</span>}
                </div>
                <div className="path-route">{path.join(" -> ")}</div>
                <div className="path-status">{describeSelectedServer(server, path)}</div>
            </div>

            <div className="path-actions">
                <button onClick={copyCommand}>Copy Path</button>
                {server.needsBackdoor && (
                    <button onClick={copyBackdoorCommand}>Copy Backdoor</button>
                )}
                <button onClick={onClear}>Clear</button>
            </div>
        </div>
    );
}

function WorldDaemonPanel({
    worldDaemon,
    server,
    path,
    canUse,
    hasRedPill,
}) {
    if (!server) {
        return (
            <div className="world-panel world-panel-muted">
                <div className="world-title">World Daemon</div>
                <div className="world-route">{worldDaemon} not discovered yet.</div>
            </div>
        );
    }

    const command = buildConnectCommand(path);

    async function copyCommand() {
        await navigator.clipboard.writeText(command);
    }

    return (
        <div className={`world-panel ${canUse ? "world-ready" : "world-locked"}`}>
            <div>
                <div className="world-title">World Daemon Route</div>
                <div className="world-route">{path.join(" → ")}</div>
                <div className="world-status">
                    Red Pill: {hasRedPill ? "YES" : "NO"} · Can Use: {canUse ? "YES" : "NO"}
                </div>
            </div>

            <div className="path-actions">
                <button onClick={copyCommand}>Copy World Path</button>
            </div>
        </div>
    );
}

function buildTopologyGraph({
    topology,
    selectedPath = [],
    activeTarget = null,
    worldDaemon = "w0r1d_d43m0n",
    worldDaemonPath = [],
}) {
    const rawNodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
    const rawEdges = Array.isArray(topology?.edges) ? topology.edges : [];

    const selectedSet = new Set(selectedPath);
    const worldSet = new Set(worldDaemonPath);

    if (rawNodes.length === 0) {
        return {
            nodes: [
                graphNode("empty", "No topology data", 0, 0, "node-locked"),
            ],
            edges: [],
        };
    }

    const positioned = layoutNodes(rawNodes, activeTarget);

    const nodes = positioned.map(node => {
        const label = buildNodeLabel(node);

        const pathClass = selectedSet.has(node.id) ? " node-path" : "";
        const activeClass = node.id === activeTarget ? " node-active-target" : "";
        const worldClass = worldSet.has(node.id) ? " node-world-path" : "";
        const worldDaemonClass = node.id === worldDaemon ? " node-world-daemon" : "";
        const backdoorNeededClass = node.needsBackdoor ? " node-backdoor-needed" : "";
        const factionClass = node.factionServer ? " node-faction-server" : "";
        const prepWarningClass = node.prepWarning ? " node-prep-warning" : "";
        const tacticalClass = node.needsBackdoor || node.factionServer ? " node-tactical" : "";

        return graphNode(
            node.id,
            label,
            node.x,
            node.y,
            `${getNodeClass(node)}${pathClass}${activeClass}${worldClass}${worldDaemonClass}${backdoorNeededClass}${factionClass}${prepWarningClass}${tacticalClass}`,
            node
        );
    });

    const edges = rawEdges
        .filter(edge => edge?.source && edge?.target)
        .map(edge => {
            const source = String(edge.source);
            const target = String(edge.target);

            const isSelectedPathEdge = isEdgeInPath(source, target, selectedPath);
            const isWorldPathEdge = isEdgeInPath(source, target, worldDaemonPath);

            return graphEdge(source, target, {
                id: `${source}-${target}`,
                animated: isSelectedPathEdge || isWorldPathEdge || source === "home" || target === "home",
                className: isWorldPathEdge
                    ? "edge-world-path"
                    : isSelectedPathEdge
                        ? "edge-path"
                        : "edge-candidate",
            });
        });

    return {
        nodes: dedupeNodes(nodes),
        edges,
    };
}

function layoutNodes(rawNodes, activeTarget) {
    const active = rawNodes.find(n => n.id === activeTarget);
    const home = rawNodes.find(n => n.id === "home");

    const others = rawNodes.filter(n =>
        n.id !== "home" &&
        n.id !== activeTarget
    );
    const special = others.filter(n => isSpecialTopologyNode(n));
    const regular = others.filter(n => !isSpecialTopologyNode(n));

    const groups = {
        special,
        purchased: regular.filter(n => n.purchased),
        highValue: regular.filter(n => !n.purchased && n.moneyMax >= 1_000_000_000),
        rooted: regular.filter(n => !n.purchased && n.moneyMax < 1_000_000_000 && n.rooted),
        locked: regular.filter(n => !n.rooted),
    };

    const result = [];

    if (active) {
        result.push({ ...active, x: 0, y: 0 });
    }

    if (home) {
        result.push({ ...home, x: -360, y: 0 });
    }

    placeArc(result, groups.special, 220, -120, 120);
    placeArc(result, groups.highValue, 430, -80, 80);
    placeArc(result, groups.rooted, 620, -120, 120);
    placeArc(result, groups.purchased, 520, 135, 225);
    placeArc(result, groups.locked, 800, -50, 50);

    return result;
}

function isSpecialTopologyNode(node) {
    return Boolean(
        node?.type === "world" ||
        node?.backdoored ||
        node?.factionServer ||
        node?.needsBackdoor
    );
}

function placeArc(result, nodes, radius, startDeg, endDeg) {
    if (!nodes.length) return;

    const start = degToRad(startDeg);
    const end = degToRad(endDeg);
    const count = Math.max(1, nodes.length - 1);

    nodes.forEach((node, index) => {
        const t = nodes.length === 1 ? 0.5 : index / count;
        const angle = start + (end - start) * t;

        result.push({
            ...node,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
        });
    });
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function isEdgeInPath(source, target, path) {
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];

        if (
            (source === a && target === b) ||
            (source === b && target === a)
        ) {
            return true;
        }
    }

    return false;
}

function buildConnectCommand(path) {
    return path.map((serverName, index) => {
        if (index === 0) return "home";
        return `connect ${serverName}`;
    }).join("; ");
}

function buildBackdoorCommand(path) {
    const connect = buildConnectCommand(path);
    return connect ? `${connect}; backdoor` : "backdoor";
}

function describeSelectedServer(server, path) {
    const bits = [];
    const hops = Array.isArray(path) ? Math.max(0, path.length - 1) : 0;

    bits.push(`${hops} hop${hops === 1 ? "" : "s"}`);
    bits.push(server.rooted ? "rooted" : "locked");

    if (server.factionServer) {
        bits.push(server.needsBackdoor ? "faction route pending" : "faction route complete");
    } else if (server.needsBackdoor) {
        bits.push("backdoor pending");
    }

    if (Number(server.moneyMax) > 0) {
        bits.push(`${formatCompact(server.moneyAvailable)} / ${formatCompact(server.moneyMax)}`);
    }

    return bits.join(" | ");
}

function buildNodeLabel(node) {
    const parts = [node.label ?? node.id];

    if (node.factionServer && node.needsBackdoor) parts.push("FACTION BD");
    else if (node.factionServer) parts.push("FACTION");
    else if (node.needsBackdoor) parts.push("BACKDOOR");
    if (node.requiredHack) parts.push(`H:${node.requiredHack}`);
    if (node.moneyMax > 0) parts.push(formatCompact(node.moneyMax));

    return parts.join("\n");
}

function getNodeClass(node) {
    if (node.id === "home") return "node-home";
    if (node.type === "world") return "node-world";
    if (node.backdoored) return "node-backdoored";
    if (node.purchased) return "node-purchased";
    if (node.rooted) return "node-rooted";

    return "node-locked";
}

function formatCompact(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "?";
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}b`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;

    return `$${n.toFixed(0)}`;
}
