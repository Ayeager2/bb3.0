//bb-dashboard-bridge\dashboard-ui\src\components\settings\DashboardControlPanel.jsx
import { useState } from "react";
import { FiGrid, FiLayout, FiSliders, FiDatabase, FiTerminal, FiBell, FiX } from "react-icons/fi";
import WidgetsSettings from "./WidgetsSettings.jsx";
import LayoutSettings from "./LayoutSettings.jsx";
import ThemeSettings from "./ThemeSettings.jsx";
import DataSettings from "./DataSettings.jsx";
import DebugActionsSettings from "./DebugActionsSettings.jsx";
import ToastSettingsView from "./ToastSettingsView.jsx";

const TABS = [
    { id: "widgets", icon: <FiGrid />, label: "Widgets" },
    { id: "layout", icon: <FiLayout />, label: "Layout" },
    { id: "theme", icon: <FiSliders />, label: "Theme" },
    { id: "data", icon: <FiDatabase />, label: "Data" },
    { id: "toasts", icon: <FiBell />, label: "Toasts" },
    { id: "debug", icon: <FiTerminal />, label: "Debug Actions" },
];

export default function DashboardControlPanel({
    open,
    layout,
    registry,
    toastSettings,
    onToastSettingsChange,
    onClose,
    onToggleVisible,
    onReset,
}) {
    const [activeTab, setActiveTab] = useState("widgets");

    if (!open) return null;

    return (
        <aside className="control-panel">
            <nav className="control-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`control-tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                    >
                        {tab.icon}
                    </button>
                ))}
            </nav>

            <section className="control-content">
                <div className="control-header">
                    <div>
                        <div className="control-title">Dashboard Control</div>
                        <div className="control-subtitle">{TABS.find(t => t.id === activeTab)?.label}</div>
                    </div>

                    <button className="control-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                {activeTab === "widgets" && (
                    <WidgetsSettings
                        layout={layout}
                        registry={registry}
                        onToggleVisible={onToggleVisible}
                    />
                )}

                {activeTab === "layout" && (
                    <LayoutSettings onReset={onReset} />
                )}

                {activeTab === "theme" && (
                    <ThemeSettings />
                )}

                {activeTab === "data" && (
                    <DataSettings />
                )}

                {activeTab === "toasts" && (
                    <ToastSettingsView
                        settings={toastSettings}
                        onChange={onToastSettingsChange}
                    />
                )}

                {activeTab === "debug" && (
                    <DebugActionsSettings />
                )}
            </section>
        </aside>
    );
}