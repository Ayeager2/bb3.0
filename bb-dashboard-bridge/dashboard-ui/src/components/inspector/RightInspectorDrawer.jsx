import { useState } from "react";
import {
    FiActivity,
    FiCpu,
    FiFlag,
    FiSettings,
    FiServer,
    FiX,
} from "react-icons/fi";

import CoreStateView from "../views/CoreStateView.jsx";
import TargetIntelView from "../views/TargetIntelView.jsx";
import TargetStabilityView from "../views/TargetStabilityView.jsx";
import VictoryPlanView from "../views/VictoryPlanView.jsx";
import BN4ReadinessView from "../views/BN4ReadinessView.jsx";
import PolicyView from "../views/PolicyView.jsx";
import CapabilitiesView from "../views/CapabilitiesView.jsx";
import LaneAllocationView from "../views/LaneAllocationView.jsx";
import ServiceHealthView from "../views/ServiceHealthView.jsx";
import DebugActionsSettings from "../settings/DebugActionsSettings.jsx";
import EventFeedView from "../events/EventFeedView.jsx";
import ToastSettingsView from "../settings/ToastSettingsView.jsx";
import "./RightInspectorDrawer.css";

const TABS = [
    { id: "core", label: "Core", icon: <FiCpu /> },
    { id: "victory", label: "Victory", icon: <FiFlag /> },
    { id: "policy", label: "Policy", icon: <FiSettings /> },
    { id: "services", label: "Services", icon: <FiServer /> },
    { id: "events", label: "Events", icon: <FiActivity /> },
];

export default function RightInspectorDrawer({
    open,
    events = [],
    state,
    onClose,
    onToggle,
    toastSettings,
    onToastSettingsChange,
}) {
    const [activeTab, setActiveTab] = useState("core");
    const activeConfig = TABS.find(tab => tab.id === activeTab) ?? TABS[0];

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

                            <InspectorSection title="Target Stability">
                                <TargetStabilityView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "victory" && (
                        <InspectorStack>
                            <InspectorSection title="Victory Plan">
                                <VictoryPlanView state={state} />
                            </InspectorSection>

                            <InspectorSection title="BN4 Readiness">
                                <BN4ReadinessView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "policy" && (
                        <InspectorStack>
                            <InspectorSection title="Spending Policy">
                                <PolicyView state={state} />
                            </InspectorSection>

                            <InspectorSection title="Capabilities">
                                <CapabilitiesView state={state} />
                            </InspectorSection>

                            <InspectorSection title="Lane Allocation">
                                <LaneAllocationView state={state} />
                            </InspectorSection>
                        </InspectorStack>
                    )}

                    {activeTab === "services" && (
                        <InspectorStack>
                            <InspectorSection title="Service Health">
                                <ServiceHealthView state={state} />
                            </InspectorSection>

                            <InspectorSection title="Debug Actions">
                                <DebugActionsSettings />
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