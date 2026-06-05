//bb-dashboard-bridge/dashboard-ui/src/componenets/cards/NetworkTopologyCard.jsx
import { useMemo } from "react";

import GraphCard from "../graphs/GraphCard.jsx";
import {
    graphNode,
    graphEdge,
    dedupeNodes,
} from "../graphs/graphUtils.js";

export default function NetworkTopologyCard({
    topology,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const { nodes, edges } = useMemo(() => {
        return buildTopologyGraph(topology);
    }, [topology]);

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
        />
    );
}

function buildTopologyGraph(topology) {
    const rawNodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
    const rawEdges = Array.isArray(topology?.edges) ? topology.edges : [];

    if (rawNodes.length === 0) {
        return {
            nodes: [
                graphNode("empty", "No topology data", 0, 0, "node-locked"),
            ],
            edges: [],
        };
    }

    const positioned = layoutNodes(rawNodes);

    const nodes = positioned.map(node => {
        const label = buildNodeLabel(node);

        return graphNode(
            node.id,
            label,
            node.x,
            node.y,
            getNodeClass(node)
        );
    });

    const edges = rawEdges
        .filter(edge => edge?.source && edge?.target)
        .map(edge => {
            const source = String(edge.source);
            const target = String(edge.target);

            return graphEdge(source, target, {
                id: `${source}-${target}`,
                animated: source === "home" || target === "home",
                className: "edge-candidate",
            });
        });

    return {
        nodes: dedupeNodes(nodes),
        edges,
    };
}

function layoutNodes(rawNodes) {
    const home = rawNodes.find(n => n.id === "home");
    const others = rawNodes.filter(n => n.id !== "home");

    const groups = {
        special: others.filter(n => n.type === "world" || n.backdoored),
        rooted: others.filter(n => n.type !== "world" && !n.backdoored && n.rooted),
        locked: others.filter(n => !n.rooted),
    };

    const result = [];

    if (home) {
        result.push({
            ...home,
            x: 0,
            y: 0,
        });
    }

    placeRing(result, groups.special, 260, 0);
    placeRing(result, groups.rooted, 520, 40);
    placeRing(result, groups.locked, 780, 80);

    return result;
}

function placeRing(result, nodes, radius, offset) {
    const count = Math.max(1, nodes.length);

    nodes.forEach((node, index) => {
        const angle = ((Math.PI * 2) / count) * index + offset;

        result.push({
            ...node,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
        });
    });
}

function buildNodeLabel(node) {
    const parts = [node.label ?? node.id];

    if (node.requiredHack) {
        parts.push(`H:${node.requiredHack}`);
    }

    if (node.moneyMax > 0) {
        parts.push(formatCompact(node.moneyMax));
    }

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