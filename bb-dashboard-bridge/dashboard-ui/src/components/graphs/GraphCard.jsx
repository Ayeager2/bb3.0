import { useEffect, useMemo } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import Card from "../shared/Card.jsx";

export default function GraphCard({
    id,
    title,
    nodes,
    edges,
    size = "full",
    collapsed = false,
    onToggle,
    onMoveUp,
    onMoveDown,
    height = 520,
    fitView = true,
}) {
    const stableNodes = useMemo(() => nodes ?? [], [nodes]);
    const stableEdges = useMemo(() => edges ?? [], [edges]);

    const [graphNodes, setGraphNodes, onNodesChange] = useNodesState(stableNodes);
    const [graphEdges, setGraphEdges, onEdgesChange] = useEdgesState(stableEdges);

    useEffect(() => {
        setGraphNodes(previous => mergeNodes(previous, stableNodes));
        setGraphEdges(stableEdges);
    }, [stableNodes, stableEdges, setGraphNodes, setGraphEdges]);

    return (
        <Card
            id={id}
            title={title}
            size={size}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="graph-card" style={{ height }}>
                <ReactFlow
                    nodes={graphNodes}
                    edges={graphEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView={fitView}
                    fitViewOptions={{ padding: 0.25 }}
                    nodesDraggable
                    nodesConnectable={false}
                    elementsSelectable
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </Card>
    );
}

function mergeNodes(previousNodes, nextNodes) {
    const previousById = new Map(previousNodes.map(node => [node.id, node]));

    return nextNodes.map(nextNode => {
        const oldNode = previousById.get(nextNode.id);

        if (!oldNode) return nextNode;

        return {
            ...nextNode,
            position: oldNode.position,
            selected: oldNode.selected,
            dragging: oldNode.dragging,
        };
    });
}