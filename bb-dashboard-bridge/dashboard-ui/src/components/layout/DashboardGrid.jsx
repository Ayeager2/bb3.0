import { useState, useEffect, useMemo } from "react";
import { FiSettings } from "react-icons/fi";

import NetworkTopologyCard from "../cards/NetworkTopologyCard.jsx";
import DashboardControlPanel from "../settings/DashboardControlPanel.jsx";

const DEFAULT_CARD_ORDER = [
    "networkTopology",
];

const CARD_STORAGE_KEY = "bbdash-card-layout-v2";

const CARD_REGISTRY = {
    networkTopology: { title: "Network Topology", component: NetworkTopologyCard },
};

export default function DashboardGrid({
    state,
    events = [],
    topology = { nodes: [], edges: [] },
    toastSettings,
    onToastSettingsChange,
}) {
    const [layout, setLayout] = useState(() => loadLayout());
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(layout));
    }, [layout]);

    const orderedCards = useMemo(() => {
        return layout.order
            .filter(id => CARD_REGISTRY[id])
            .filter(id => layout.visible[id] !== false);
    }, [layout.order, layout.visible]);

    function toggleCard(id) {
        setLayout(current => ({
            ...current,
            collapsed: {
                ...current.collapsed,
                [id]: !current.collapsed[id],
            },
        }));
    }

    function toggleVisible(id) {
        setLayout(current => ({
            ...current,
            visible: {
                ...current.visible,
                [id]: current.visible[id] === false,
            },
        }));
    }

    function moveCard(id, direction) {
        setLayout(current => {
            const order = [...current.order,];
            const index = order.indexOf(id);
            const nextIndex = index + direction;

            if (index < 0 || nextIndex < 0 || nextIndex >= order.length) {
                return current;
            }

            [order[index], order[nextIndex]] = [order[nextIndex], order[index]];

            return {
                ...current,
                order,
            };
        });
    }

    function resetLayout() {
        setLayout(defaultLayout());
    }

    if (!state) {
        return (
            <>
                <SettingsButton onClick={() => setSettingsOpen(true)} />

                <div className="grid">
                    <section className="card card-full">
                        <div className="card-title">No State</div>
                        <div className="card-body red">No dashboard state loaded.</div>
                    </section>
                </div>

                <DashboardControlPanel
                    open={settingsOpen}
                    layout={layout}
                    registry={CARD_REGISTRY}
                    onClose={() => setSettingsOpen(false)}
                    onToggleVisible={toggleVisible}
                    onReset={resetLayout}
                    toastSettings={toastSettings}
                    onToastSettingsChange={onToastSettingsChange}
                />
            </>
        );
    }

    return (
        <>
            <main className="grid">
                {orderedCards.map(id => {
                    const config = CARD_REGISTRY[id];
                    const Component = config.component;

                    return (
                        <Component
                            key={id}
                            id={id}
                            state={state}
                            events={events}
                            topology={topology}
                            collapsed={layout.collapsed[id] === true}
                            onToggle={() => toggleCard(id)}
                            onMoveUp={() => moveCard(id, -1)}
                            onMoveDown={() => moveCard(id, 1)}
                        />
                    );
                })}
            </main>

            <SettingsButton onClick={() => setSettingsOpen(true)} />

            <DashboardControlPanel
                open={settingsOpen}
                layout={layout}
                registry={CARD_REGISTRY}
                onClose={() => setSettingsOpen(false)}
                onToggleVisible={toggleVisible}
                onReset={resetLayout}
                toastSettings={toastSettings}
                onToastSettingsChange={onToastSettingsChange}
            />
        </>
    );
}

function SettingsButton({ onClick }) {
    return (
        <button className="settings-gear" onClick={onClick} title="Dashboard control panel">
            <FiSettings />
        </button>
    );
}

function loadLayout() {
    try {
        const saved = JSON.parse(localStorage.getItem(CARD_STORAGE_KEY) || "null");
        if (!saved?.order) throw new Error("No saved layout.");

        const mergedOrder = [
            ...saved.order.filter(id => DEFAULT_CARD_ORDER.includes(id)),
            ...DEFAULT_CARD_ORDER.filter(id => !saved.order.includes(id)),
        ];

        return {
            order: mergedOrder,
            collapsed: saved.collapsed ?? {},
            visible: {
                ...Object.fromEntries(DEFAULT_CARD_ORDER.map(id => [id, true])),
                ...(saved.visible ?? {}),
            },
        };
    } catch {
        return defaultLayout();
    }
}

function defaultLayout() {
    return {
        order: DEFAULT_CARD_ORDER,
        collapsed: {},
        visible: Object.fromEntries(DEFAULT_CARD_ORDER.map(id => [id, true])),
    };
}