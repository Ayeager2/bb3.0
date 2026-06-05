import { useMemo } from "react";

import GraphCard from "../graphs/GraphCard.jsx";
import {
    graphNode,
    graphEdge,
    dedupeNodes,
} from "../graphs/graphUtils.js";

export default function NetworkMapCard(props) {
    const { state } = props;

    const plan = state?.strategicTargetPlan ?? {};
    const target = state?.daemon?.target ?? plan?.target ?? "unknown";
    const candidates = plan?.candidates ?? [];

    const { nodes, edges } = useMemo(() => {
        return buildTargetCandidateGraph(target, candidates);
    }, [target, candidates]);

    return (
        <GraphCard
            {...props}
            title="Target Candidate Graph"
            nodes={nodes}
            edges={edges}
            height={520}
        />
    );
}

function buildTargetCandidateGraph(target, candidates) {
    const safeCandidates = candidates
        .filter(candidate => candidate?.server)
        .slice(0, 12);

    const nodes = [
        graphNode("home", "home", 0, 180, "node-home"),
        graphNode(target, target, 360, 180, "node-target"),
    ];

    const edges = [
        graphEdge("home", target, {
            animated: true,
            className: "edge-active",
        }),
    ];

    safeCandidates.forEach((candidate, index) => {
        if (candidate.server === target) return;

        const angle = (Math.PI * 2 * index) / Math.max(1, safeCandidates.length);
        const x = 360 + Math.cos(angle) * 330;
        const y = 180 + Math.sin(angle) * 190;

        nodes.push(
            graphNode(
                candidate.server,
                `${candidate.server}\n${formatScore(candidate.score)}`,
                x,
                y,
                "node-candidate"
            )
        );

        edges.push(
            graphEdge(target, candidate.server, {
                className: "edge-candidate",
            })
        );
    });

    return {
        nodes: dedupeNodes(nodes),
        edges,
    };
}

function formatScore(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "score ?";
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;

    return n.toFixed(1);
}