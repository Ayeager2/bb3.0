import { useEffect, useState } from "react";
import TopBar from "./components/layout/TopBar.jsx";
import DashboardGrid from "./components/layout/DashboardGrid.jsx";
import RightInspectorDrawer from "./components/inspector/RightInspectorDrawer.jsx";
import ToastHost from "./components/notifications/ToastHost.jsx";
import CommandPalette from "./components/command/CommandPalette.jsx";

import {
    fetchDashboardState,
    fetchDashboardEvents,
    fetchNetworkTopology,
    fetchCommandStatus,
    fetchDaemonReasoning,
    fetchDaemonReasoningHistory
} from "./api/dashboardApi.js";

import {
    loadToastSettings,
    saveToastSettings,
} from "./components/notifications/toastSettings.js";

import {
    loadWorkspaceSettings,
    saveWorkspaceSettings,
} from "./components/layout/workspaceSettings.js";

export default function App() {
    const [state, setState] = useState(null);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    const [commandStatus, setCommandStatus] = useState(null);
    const [toastSettings, setToastSettings] = useState(() => loadToastSettings());
    const [topology, setTopology] = useState({ nodes: [], edges: [] });
    const [inspectorOpen, setInspectorOpen] = useState(() => { return localStorage.getItem("bbdash-inspector-open") === "true"; });
    const [workspaceSettings, setWorkspaceSettings] = useState(() => loadWorkspaceSettings());
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [inspectorInitialTab, setInspectorInitialTab] = useState("core");
    const [reasoning, setReasoning] = useState(null);
    const [reasoningHistory, setReasoningHistory] = useState([]);

    async function refreshState() {
        try {
            const nextState = await fetchDashboardState();
            setState(nextState);
            setError(null);

            try {
                const nextEvents = await fetchDashboardEvents();
                setEvents(Array.isArray(nextEvents) ? nextEvents : []);
            } catch {
                setEvents([]);
            }

            try {
                const nextTopology = await fetchNetworkTopology();
                setTopology(nextTopology ?? { nodes: [], edges: [] });
            } catch {
                setTopology({ nodes: [], edges: [] });
            }

            try {
                const nextCommandStatus = await fetchCommandStatus();
                setCommandStatus(nextCommandStatus);
            } catch {
                setCommandStatus(null);
            }

            try {
                const nextReasoning = await fetchDaemonReasoning();
                setReasoning(nextReasoning);
            } catch {
                setReasoning(null);
            }

            try {
                const nextReasoningHistory = await fetchDaemonReasoningHistory();
                setReasoningHistory(Array.isArray(nextReasoningHistory) ? nextReasoningHistory : []);
            } catch {
                setReasoningHistory([]);
            }
        } catch (err) {
            setError(err);
        }
    }

    useEffect(() => {
        refreshState();

        const id = setInterval(refreshState, 3000);

        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        localStorage.setItem("bbdash-inspector-open", String(inspectorOpen));
    }, [inspectorOpen]);

    function updateToastSettings(next) {
        setToastSettings(next);
        saveToastSettings(next);
    }

    function updateWorkspaceSettings(next) {
        setWorkspaceSettings(next);
        saveWorkspaceSettings(next);
    }

    useEffect(() => {
        function onKeyDown(event) {
            const isCommandK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

            if (!isCommandK) return;

            event.preventDefault();
            setCommandPaletteOpen(open => !open);
        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    function openInspectorTab(tabId) {
        setInspectorInitialTab(tabId);
        setInspectorOpen(true);
    }
    return (
        <div className={`app-shell theme-${state?.theme?.accent ?? "default"} workspace-${workspaceSettings.mode}`}>
            <TopBar state={state} error={error} commandStatus={commandStatus} />

            <DashboardGrid
                state={state}
                events={events}
                topology={topology}
                toastSettings={toastSettings}
                onToastSettingsChange={updateToastSettings}
                workspaceSettings={workspaceSettings}
                onWorkspaceSettingsChange={updateWorkspaceSettings}
            />

            <RightInspectorDrawer
                open={inspectorOpen}
                initialTab={inspectorInitialTab}
                state={state}
                events={events}
                reasoning={reasoning}
                reasoningHistory={reasoningHistory}
                onClose={() => setInspectorOpen(false)}
                onToggle={() => setInspectorOpen(open => !open)}
            />

            <CommandPalette
                open={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                onOpenInspectorTab={openInspectorTab}
                onWorkspaceSettingsChange={updateWorkspaceSettings}
            />

            <ToastHost events={events} settings={toastSettings} />
        </div>
    );
}