import { useEffect, useMemo, useState } from "react";
import { FiSettings } from "react-icons/fi";

import CoreStateCard from "../cards/CoreStateCard.jsx";
import PlayerCard from "../cards/PlayerCard.jsx";
import TargetIntelCard from "../cards/TargetIntelCard.jsx";
import BN4ReadinessCard from "../cards/BN4ReadinessCard.jsx";
import VictoryPlanCard from "../cards/VictoryPlanCard.jsx";
import LaneAllocationCard from "../cards/LaneAllocationCard.jsx";
import PolicyCard from "../cards/PolicyCard.jsx";
import ServerSummaryCard from "../cards/ServerSummaryCard.jsx";
import CapabilitiesCard from "../cards/CapabilitiesCard.jsx";
import WidgetResolverCard from "../cards/WidgetResolverCard.jsx";
import EventFeedCard from "../cards/EventFeedCard.jsx";
import ServiceHealthCard from "../cards/ServiceHealthCard.jsx";
import DashboardControlPanel from "../settings/DashboardControlPanel.jsx";
import TargetStabilityCard from "../cards/TargetStabilityCard.jsx";
import NetworkMapCard from "../cards/NetworkMapCard.jsx";
import NetworkTopologyCard from "../cards/NetworkTopologyCard.jsx";

const DEFAULT_CARD_ORDER = [
    "core",
    "player",
    "servers",
    "services",
    "target",
    "readiness",
    "victory",
    "lanes",
    "policy",
    "capabilities",
    "widgets",
    "targetStability",
    "networkTopology",
];

const CARD_STORAGE_KEY = "bbdash-card-layout-v2";

const CARD_REGISTRY = {
    core: { title: "Core State", component: CoreStateCard },
    player: { title: "Player", component: PlayerCard },
    servers: { title: "Servers", component: ServerSummaryCard },
    services: { title: "Service Health", component: ServiceHealthCard },
    target: { title: "Target Intel", component: TargetIntelCard },
    readiness: { title: "BN4 Readiness", component: BN4ReadinessCard },
    victory: { title: "Victory Plan", component: VictoryPlanCard },
    lanes: { title: "Lane Allocation", component: LaneAllocationCard },
    policy: { title: "Spending Policy", component: PolicyCard },
    capabilities: { title: "Capabilities", component: CapabilitiesCard },
    widgets: { title: "Widget Resolver", component: WidgetResolverCard },
    targetStability: { title: "Target Stability", component: TargetStabilityCard },
    networkTopology: { title: "Network Topology", component: NetworkTopologyCard },
};

export default function DashboardGrid({ state, events = [], topology = { nodes: [], edges: [] } }) {
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