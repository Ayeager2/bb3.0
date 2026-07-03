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
const GANG_SPRITE_STORAGE_KEY = "bbdash-gang-sprite-v1";
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
const GANG_SPRITE_PALETTES = {
    rainbow: ["#ff2e88", "#ff8a00", "#faff00", "#00ff9c", "#00f5ff", "#3b82f6", "#a855f7"],
    lesbian: ["#d52d00", "#ef7627", "#ff9a56", "#ffffff", "#d162a4", "#b55690", "#a30262"],
    pride: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982", "#ff2e88"],
    trans: ["#5bcefa", "#f5a9b8", "#ffffff", "#f5a9b8", "#5bcefa", "#ffffff", "#5bcefa"],
    bi: ["#d60270", "#d60270", "#9b4f96", "#0038a8", "#0038a8", "#9b4f96", "#d60270"],
    pan: ["#ff218c", "#ff218c", "#ffd800", "#ffd800", "#21b1ff", "#21b1ff", "#ff218c"],
    ace: ["#000000", "#a3a3a3", "#ffffff", "#800080", "#000000", "#a3a3a3", "#800080"],
    nonbinary: ["#fff430", "#ffffff", "#9c59d1", "#000000", "#fff430", "#9c59d1", "#ffffff"],
    agender: ["#000000", "#b9b9b9", "#ffffff", "#b8f483", "#ffffff", "#b9b9b9", "#000000"],
    genderfluid: ["#ff75a2", "#ffffff", "#be18d6", "#000000", "#333ebd", "#be18d6", "#ff75a2"],
};

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
    const [gangSpriteSettings, setGangSpriteSettings] = useState(() => loadGangSpriteSettings());

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

    function updateGangSpriteSettings(nextSettings) {
        const normalized = normalizeGangSpriteSettings(nextSettings);
        setGangSpriteSettings(normalized);
        localStorage.setItem(GANG_SPRITE_STORAGE_KEY, JSON.stringify(normalized));
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

    const activeAccent = themeAccent === "auto"
        ? resolveBitNodeTheme(state)
        : themeAccent;
    const activeSignal = themeSignal === "auto"
        ? resolveSignalTheme(state)
        : themeSignal;

    return (
        <div
            className={`app-shell theme-${activeAccent} signal-${activeSignal} workspace-${workspaceSettings.mode}`}
            style={{
                "--font-boost": `${fontOffset}px`,
                ...buildGangSpriteStyle(gangSpriteSettings),
            }}
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
                gangSpriteSettings={gangSpriteSettings}
                onGangSpriteSettingsChange={updateGangSpriteSettings}
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

function loadGangSpriteSettings() {
    try {
        return normalizeGangSpriteSettings(JSON.parse(localStorage.getItem(GANG_SPRITE_STORAGE_KEY) || "null"));
    } catch {
        return normalizeGangSpriteSettings(null);
    }
}

function normalizeGangSpriteSettings(settings) {
    const paletteId = String(settings?.paletteId || "rainbow");
    const fallbackColors = GANG_SPRITE_PALETTES[paletteId] ?? GANG_SPRITE_PALETTES.rainbow;
    const colors = Array.from({ length: 7 }, (_, index) => {
        const value = settings?.colors?.[index] ?? fallbackColors[index] ?? GANG_SPRITE_PALETTES.rainbow[index];
        return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : GANG_SPRITE_PALETTES.rainbow[index];
    });

    return { paletteId, colors };
}

function buildGangSpriteStyle(settings) {
    const normalized = normalizeGangSpriteSettings(settings);
    return Object.fromEntries(normalized.colors.map((color, index) => [`--gang-shirt-${index + 1}`, color]));
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
