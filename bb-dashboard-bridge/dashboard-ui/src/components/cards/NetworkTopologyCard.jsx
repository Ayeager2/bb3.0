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
    workspaceSettings
}) {
    const [selectedServerId, setSelectedServerId] = useState(null);
    const [hoveredServerId, setHoveredServerId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const activeTarget = state?.daemon?.target ?? null;
    const worldDaemon = state?.victory?.worldDaemon ?? "w0r1d_d43m0n";

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

    return (
        <GraphCard
            id={id}
            title="Network Topology"
            nodes={nodes}
            edges={edges}
            size="full"
            height={620}
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
                        refreshing={refreshing}
                        onRefresh={refreshTopology}
                    />
                ) : null
            }
            footer={
                <>
                    {workspaceSettings?.showPathPanel !== false && (
                        <PathPanel
                            server={selectedServer}
                            path={selectedPath}
                            onClear={() => setSelectedServerId(null)}
                        />
                    )}

                    {workspaceSettings?.showWorldPanel !== false && (
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

function PathPanel({ server, path, onClear }) {
    if (!server) {
        return (
            <div className="path-panel muted">
                Select a server node to show path from home.
            </div>
        );
    }

    const command = buildConnectCommand(path);

    async function copyCommand() {
        await navigator.clipboard.writeText(command);
    }

    return (
        <div className="path-panel">
            <div>
                <div className="path-title">{server.id}</div>
                <div className="path-route">{path.join(" → ")}</div>
            </div>

            <div className="path-actions">
                <button onClick={copyCommand}>Copy Path</button>
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

        return graphNode(
            node.id,
            label,
            node.x,
            node.y,
            `${getNodeClass(node)}${pathClass}${activeClass}${worldClass}${worldDaemonClass}${backdoorNeededClass}${factionClass}${prepWarningClass}`,
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

    const groups = {
        special: others.filter(n => n.type === "world" || n.backdoored),
        purchased: others.filter(n => n.purchased),
        highValue: others.filter(n => !n.purchased && n.moneyMax >= 1_000_000_000),
        rooted: others.filter(n => !n.purchased && n.moneyMax < 1_000_000_000 && n.rooted),
        locked: others.filter(n => !n.rooted),
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

function buildNodeLabel(node) {
    const parts = [node.label ?? node.id];

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