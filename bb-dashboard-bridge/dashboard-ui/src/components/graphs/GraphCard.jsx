import { useEffect, useMemo, useRef, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import Card from "../shared/Card.jsx";
import FloatingNodeTooltip from "./FloatingNodeTooltip.jsx";
import "./GraphCard.css";

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
    onNodeClick,
    onNodeMouseEnter,
    onNodeMouseLeave,
    header,
    footer,
    overlay,
}) {
    const graphWrapRef = useRef(null);
    const [hoverTooltip, setHoverTooltip] = useState(null);
    const [flowInstance, setFlowInstance] = useState(null);
    const [resizeTick, setResizeTick] = useState(0);

    const stableNodes = useMemo(() => nodes ?? [], [nodes]);
    const stableEdges = useMemo(() => edges ?? [], [edges]);

    const [graphNodes, setGraphNodes, onNodesChange] = useNodesState(stableNodes);
    const [graphEdges, setGraphEdges, onEdgesChange] = useEdgesState(stableEdges);

    function getTooltipPosition(event) {
        const rect = graphWrapRef.current?.getBoundingClientRect();

        if (!rect) {
            return { x: 0, y: 0 };
        }

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    useEffect(() => {
        setGraphNodes(previous => mergeNodes(previous, stableNodes));
        setGraphEdges(stableEdges);
    }, [stableNodes, stableEdges, setGraphNodes, setGraphEdges]);

    useEffect(() => {
        const element = graphWrapRef.current;
        if (!element || typeof ResizeObserver === "undefined") return undefined;

        const observer = new ResizeObserver(() => {
            setResizeTick(tick => tick + 1);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!fitView || !flowInstance || stableNodes.length === 0 || collapsed) return undefined;

        const frame = window.requestAnimationFrame(() => {
            flowInstance.fitView({
                padding: 0.25,
                duration: 180,
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [fitView, flowInstance, stableNodes, stableEdges, height, size, collapsed, resizeTick]);

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
            {header}

            <div ref={graphWrapRef} className="graph-card" style={{ height }}>
                <ReactFlow
                    nodes={graphNodes}
                    edges={graphEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => onNodeClick?.(node)}
                    onNodeMouseEnter={(event, node) => {
                        setHoverTooltip({
                            node,
                            position: getTooltipPosition(event),
                        });

                        onNodeMouseEnter?.(node);
                    }}
                    onNodeMouseMove={(event, node) => {
                        setHoverTooltip({
                            node,
                            position: getTooltipPosition(event),
                        });
                    }}
                    onNodeMouseLeave={(_, node) => {
                        setHoverTooltip(null);
                        onNodeMouseLeave?.(node);
                    }}
                    onInit={setFlowInstance}
                    fitView={fitView}
                    fitViewOptions={{ padding: 0.25 }}
                    nodesDraggable
                    nodesConnectable={false}
                    elementsSelectable
                >
                    <Background />
                    <Controls />
                </ReactFlow>

                <FloatingNodeTooltip
                    node={hoverTooltip?.node?.data?.raw}
                    position={hoverTooltip?.position}
                />

                {overlay}
            </div>

            {footer}
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
