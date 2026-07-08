import { useEffect, useState } from "react";

import {
    FiActivity,
    FiCpu,
    FiFlag,
    FiSettings,
    FiServer,
    FiX,
    FiHelpCircle,
    FiDollarSign,
    FiShoppingCart,
    FiUser,
} from "react-icons/fi";

import CoreStateView from "../views/CoreStateView.jsx";
import TargetIntelView from "../views/TargetIntelView.jsx";
import VictoryPlanView from "../views/VictoryPlanView.jsx";
import PolicyView from "../views/PolicyView.jsx";
import ServiceHealthView from "../views/ServiceHealthView.jsx";
import DebugActionsSettings from "../settings/DebugActionsSettings.jsx";
import EventFeedView from "../events/EventFeedView.jsx";
import DaemonReasoningView from "../views/DaemonReasoningView.jsx";
import BN9EconomyView from "../views/BN9EconomyView.jsx";
import BuyerLogView from "../views/BuyerLogView.jsx";
import CharacterActionsView from "../views/CharacterActionsView.jsx";

import "./RightInspectorDrawer.css";

const TABS = [
    { id: "core", label: "Core", icon: <FiCpu /> },
    { id: "character", label: "Character", icon: <FiUser /> },
    { id: "victory", label: "Victory", icon: <FiFlag /> },
    { id: "policy", label: "Policy", icon: <FiSettings /> },
    { id: "services", label: "Services", icon: <FiServer /> },
    { id: "bn9", label: "BN9 Economy", icon: <FiDollarSign /> },
    { id: "buyer", label: "Buyer Log", icon: <FiShoppingCart /> },
    { id: "events", label: "Events", icon: <FiActivity /> },
    { id: "reasoning", label: "Reasoning", icon: <FiHelpCircle /> },
];

export default function RightInspectorDrawer({
    open,
    events = [],
    state,
    onClose,
    onToggle,
    toastSettings,
    onToastSettingsChange,
    initialTab,
    reasoning,
    reasoningHistory = [],
}) {
    const [activeTab, setActiveTab] = useState(initialTab ?? "core");
    const activeConfig = TABS.find(tab => tab.id === activeTab) ?? TABS[0];

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    return (
        <>
            <button className="right-inspector-tab" onClick={onToggle} title="Inspector">
                {activeConfig.icon}
            </button>

            <aside className={`right-inspector ${open ? "right-inspector-open" : ""}`}>
                <div className="right-inspector-header">
                    <div>
                        <div className="right-inspector-title">Inspector</div>
                        <div className="right-inspector-subtitle">{activeConfig.label}</div>
                    </div>

                    <button className="right-inspector-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="right-inspector-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`right-inspector-tab-button ${activeTab === tab.id ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                            title={tab.label}
                        >
                            {tab.icon}
                        </button>
                    ))}
                </div>

                <div className="right-inspector-body">
                    {activeTab === "core" && (
                        <InspectorStack>
                            <InspectorSection title="Core State">
                                <CoreStateView state={state} />
                            </InspectorSection>

                            <InspectorSection title="Target Intel">
                                <TargetIntelView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "victory" && (
                        <InspectorStack>
                            <InspectorSection title="Victory Plan">
                                <VictoryPlanView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "character" && (
                        <InspectorStack>
                            <InspectorSection title="Character Actions">
                                <CharacterActionsView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "policy" && (
                        <InspectorStack>
                            <InspectorSection title="Automation Policy">
                                <PolicyView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "services" && (
                        <InspectorStack>
                            <InspectorSection title="Services & Commands">
                                <ServiceHealthView state={state} />
                                <DebugActionsSettings />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "bn9" && (
                        <InspectorStack>
                            <InspectorSection title="BN9 Stock / Hash Ledger">
                                <BN9EconomyView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "buyer" && (
                        <InspectorStack>
                            <InspectorSection title="Buyer Log">
                                <BuyerLogView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "reasoning" && (
                        <InspectorStack>
                            <InspectorSection title="Daemon Reasoning">
                                <DaemonReasoningView
                                    reasoning={reasoning}
                                    history={reasoningHistory}
                                />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "events" && (
                        <EventFeedView events={events} limit={80} />
                    )}
                </div>
            </aside>
        </>
    );
}

function InspectorStack({ children }) {
    return <div className="inspector-stack">{children}</div>;
}

function InspectorSection({ title, children }) {
    return (
        <section className="inspector-section">
            <div className="inspector-section-title">{title}</div>
            <div className="inspector-section-body">{children}</div>
        </section>
    );
}
