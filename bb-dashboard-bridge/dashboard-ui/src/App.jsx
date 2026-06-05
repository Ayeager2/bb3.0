import { useEffect, useState } from "react";
import TopBar from "./components/layout/TopBar.jsx";
import DashboardGrid from "./components/layout/DashboardGrid.jsx";
import EventFeedDrawer from "./components/events/EventFeedDrawer.jsx";

import {
    fetchDashboardState,
    fetchDashboardEvents,
    fetchNetworkTopology,
} from "./api/dashboardApi.js";

export default function App() {
    const [state, setState] = useState(null);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    const [topology, setTopology] = useState({ nodes: [], edges: [] });
    const [eventFeedOpen, setEventFeedOpen] = useState(() => {
        return localStorage.getItem("bbdash-event-feed-open") === "true";
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
        localStorage.setItem("bbdash-event-feed-open", String(eventFeedOpen));
    }, [eventFeedOpen]);
    return (
        <div className={`app-shell theme-${state?.theme?.accent ?? "default"}`}>
            <TopBar state={state} error={error} />
            <DashboardGrid
                state={state}
                events={events}
                topology={topology}
            />
            <EventFeedDrawer
                open={eventFeedOpen}
                events={events}
                onClose={() => setEventFeedOpen(false)}
                onToggle={() => setEventFeedOpen(open => !open)}
            />
        </div>
    );
}