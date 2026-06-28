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

const FONT_SCALE_STORAGE_KEY = "bbdash-font-scale";
const THEME_ACCENT_STORAGE_KEY = "bbdash-theme-accent";
const THEME_SIGNAL_STORAGE_KEY = "bbdash-theme-signal";
const MIN_FONT_OFFSET = 0;
const MAX_FONT_OFFSET = 8;
const LEGACY_SIGNAL_THEMES = new Set(["money_green", "exp_blue", "faction_cyan", "danger_red"]);
const BITNODE_THEME_BY_NODE = {
    1: "bn1_genesis",
    2: "bn2_underworld",
    3: "bn3_corporate",
    4: "sf4_singularity",
    5: "bn5_ai",
    6: "bn6_bladeburner",
    7: "bn7_bladeburner",
    8: "bn8_market",
    9: "bn9_hacknet",
    10: "bn10_sleeves",
    11: "bn11_knife",
    12: "bn12_loop",
};
const BITNODE_THEME_IDS = new Set(Object.values(BITNODE_THEME_BY_NODE));

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
    const [fontOffset, setFontOffset] = useState(() => loadFontOffset());
    const [themeAccent, setThemeAccent] = useState(() => loadThemeAccent());
    const [themeSignal, setThemeSignal] = useState(() => loadThemeSignal());

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

    function updateFontOffset(nextOffset) {
        const clamped = Math.max(MIN_FONT_OFFSET, Math.min(MAX_FONT_OFFSET, Number(nextOffset) || 0));
        setFontOffset(clamped);
        localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(clamped));
    }

    function updateThemeAccent(nextAccent) {
        const accent = String(nextAccent || "auto");
        setThemeAccent(accent);
        localStorage.setItem(THEME_ACCENT_STORAGE_KEY, accent);
    }

    function updateThemeSignal(nextSignal) {
        const signal = String(nextSignal || "auto");
        setThemeSignal(signal);
        localStorage.setItem(THEME_SIGNAL_STORAGE_KEY, signal);
    }

    useEffect(() => {
        const resolvedTheme = resolveBitNodeTheme(state);
        const savedBitNodeThemeIsStale = themeAccent !== "auto"
            && BITNODE_THEME_IDS.has(themeAccent)
            && themeAccent !== resolvedTheme;

        if (!savedBitNodeThemeIsStale) return;

        setThemeAccent("auto");
        localStorage.setItem(THEME_ACCENT_STORAGE_KEY, "auto");
    }, [state?.bitnode?.number, themeAccent]);

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

    const activeAccent = themeAccent === "auto"
        ? resolveBitNodeTheme(state)
        : themeAccent;
    const activeSignal = themeSignal === "auto"
        ? resolveSignalTheme(state)
        : themeSignal;

    return (
        <div
            className={`app-shell theme-${activeAccent} signal-${activeSignal} workspace-${workspaceSettings.mode}`}
            style={{ "--font-boost": `${fontOffset}px` }}
        >
            <TopBar
                state={state}
                error={error}
                commandStatus={commandStatus}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            />

            <DashboardGrid
                state={state}
                events={events}
                topology={topology}
                toastSettings={toastSettings}
                onToastSettingsChange={updateToastSettings}
                workspaceSettings={workspaceSettings}
                onWorkspaceSettingsChange={updateWorkspaceSettings}
                fontOffset={fontOffset}
                onFontOffsetChange={updateFontOffset}
                themeAccent={themeAccent}
                activeAccent={activeAccent}
                onThemeAccentChange={updateThemeAccent}
                themeSignal={themeSignal}
                activeSignal={activeSignal}
                onThemeSignalChange={updateThemeSignal}
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

function loadFontOffset() {
    const saved = Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY));
    if (!Number.isFinite(saved)) return 0;
    return Math.max(MIN_FONT_OFFSET, Math.min(MAX_FONT_OFFSET, saved));
}

function loadThemeAccent() {
    const saved = localStorage.getItem(THEME_ACCENT_STORAGE_KEY) || "auto";
    return LEGACY_SIGNAL_THEMES.has(saved) ? "auto" : saved;
}

function loadThemeSignal() {
    const savedSignal = localStorage.getItem(THEME_SIGNAL_STORAGE_KEY);
    if (savedSignal) return savedSignal;

    const oldMainTheme = localStorage.getItem(THEME_ACCENT_STORAGE_KEY);
    return LEGACY_SIGNAL_THEMES.has(oldMainTheme) ? oldMainTheme : "auto";
}

function resolveBitNodeTheme(state) {
    const bitNode = Number(state?.bitnode?.number);
    return BITNODE_THEME_BY_NODE[bitNode] ?? BITNODE_THEME_BY_NODE[1];
}

function resolveSignalTheme(state) {
    const mode = String(state?.progression?.mode ?? "").toLowerCase();
    const phase = String(state?.progression?.phase ?? "").toLowerCase();
    const priority = String(state?.progression?.priority ?? "").toLowerCase();
    const danger = String(state?.theme?.dangerLevel ?? "").toLowerCase();

    if (danger === "high" || phase.includes("reset") || phase.includes("destroy")) return "danger_red";
    if (phase.includes("faction") || priority.includes("faction")) return "faction_cyan";
    if (mode.includes("exp") || priority.includes("level")) return "exp_blue";
    if (mode.includes("money") || priority.includes("income")) return "money_green";

    return "neutral";
}
