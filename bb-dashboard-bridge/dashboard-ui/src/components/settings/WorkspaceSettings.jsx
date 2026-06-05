import {
    getWorkspacePreset,
    WORKSPACE_MODES,
} from "../layout/workspaceSettings.js";

import "./WorkspaceSettings.css";

const MODE_OPTIONS = [
    {
        id: WORKSPACE_MODES.TACTICAL,
        title: "Tactical",
        description: "Full command cockpit with topology panels visible.",
    },
    {
        id: WORKSPACE_MODES.DEBUG,
        title: "Debug",
        description: "Maximum diagnostic visibility.",
    },
    {
        id: WORKSPACE_MODES.PROGRESSION,
        title: "Progression",
        description: "Focus on victory/world daemon progress.",
    },
    {
        id: WORKSPACE_MODES.MINIMAL,
        title: "Minimal",
        description: "Clean topology-first view.",
    },
];

export default function WorkspaceSettings({
    settings,
    onChange,
}) {
    function applyPreset(mode) {
        onChange(getWorkspacePreset(mode));
    }

    function toggle(key) {
        onChange({
            ...settings,
            [key]: !settings[key],
        });
    }

    return (
        <div className="workspace-settings">
            <section className="workspace-mode-grid">
                {MODE_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        className={`workspace-mode-card ${settings.mode === option.id ? "active" : ""}`}
                        onClick={() => applyPreset(option.id)}
                    >
                        <div className="workspace-mode-title">{option.title}</div>
                        <div className="workspace-mode-description">{option.description}</div>
                    </button>
                ))}
            </section>

            <section className="workspace-toggle-list">
                <ToggleRow
                    label="Show Topology Legend"
                    active={settings.showLegend}
                    onClick={() => toggle("showLegend")}
                />

                <ToggleRow
                    label="Show World Panel"
                    active={settings.showWorldPanel}
                    onClick={() => toggle("showWorldPanel")}
                />

                <ToggleRow
                    label="Show Path Panel"
                    active={settings.showPathPanel}
                    onClick={() => toggle("showPathPanel")}
                />

                <ToggleRow
                    label="Show Topology Stats"
                    active={settings.showTopologyStats}
                    onClick={() => toggle("showTopologyStats")}
                />
            </section>
        </div>
    );
}

function ToggleRow({ label, active, onClick }) {
    return (
        <button className="workspace-toggle-row" onClick={onClick}>
            <span>{label}</span>
            <span className={`workspace-switch ${active ? "workspace-switch-on" : ""}`}>
                <span />
            </span>
        </button>
    );
}