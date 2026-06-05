export function graphNode(id, label, x, y, className = "", raw = null) {
    return {
        id: String(id),
        position: { x, y },
        data: {
            label,
            raw,
        },
        className,
    };
}

export function graphEdge(source, target, options = {}) {
    return {
        id: options.id ?? `${source}-${target}`,
        source: String(source),
        target: String(target),
        animated: options.animated ?? false,
        className: options.className ?? "",
    };
}

export function dedupeNodes(nodes) {
    const map = new Map();

    for (const node of nodes) {
        if (!node?.id) continue;
        map.set(node.id, node);
    }

    return [...map.values()];
}