import { useEffect, useState } from "react";
import TopBar from "./components/layout/TopBar.jsx";
import DashboardGrid from "./components/layout/DashboardGrid.jsx";
import RightInspectorDrawer from "./components/inspector/RightInspectorDrawer.jsx";
import ToastHost from "./components/notifications/ToastHost.jsx";

import {
    fetchDashboardState,
    fetchDashboardEvents,
    fetchNetworkTopology,
    fetchCommandStatus
} from "./api/dashboardApi.js";

import {
    loadToastSettings,
    saveToastSettings,
} from "./components/notifications/toastSettings.js";

export default function App() {
    const [state, setState] = useState(null);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    const [commandStatus, setCommandStatus] = useState(null);
    const [toastSettings, setToastSettings] = useState(() => loadToastSettings());
    const [topology, setTopology] = useState({ nodes: [], edges: [] });
    const [inspectorOpen, setInspectorOpen] = useState(() => {
        return localStorage.getItem("bbdash-inspector-open") === "true";
    });

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
    return (
        <div className={`app-shell theme-${state?.theme?.accent ?? "default"}`}>
            <TopBar state={state} error={error} commandStatus={commandStatus} />

            <DashboardGrid
                state={state}
                events={events}
                topology={topology}
                toastSettings={toastSettings}
                onToastSettingsChange={updateToastSettings}
            />

            <RightInspectorDrawer
                open={inspectorOpen}
                state={state}
                events={events}
                onClose={() => setInspectorOpen(false)}
                onToggle={() => setInspectorOpen(open => !open)}
            />

            <ToastHost events={events} settings={toastSettings} />
        </div>
    );
}