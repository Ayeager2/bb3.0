export const WORKSPACE_SETTINGS_KEY = "bbdash-workspace-v1";

export const WORKSPACE_MODES = {
    TACTICAL: "tactical",
    DEBUG: "debug",
    PROGRESSION: "progression",
    MINIMAL: "minimal",
};

export const DEFAULT_WORKSPACE_SETTINGS = {
    mode: WORKSPACE_MODES.TACTICAL,
    showLegend: true,
    showWorldPanel: true,
    showPathPanel: true,
    showTopologyStats: true,
};

export function loadWorkspaceSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(WORKSPACE_SETTINGS_KEY) || "null");

        if (!saved) return DEFAULT_WORKSPACE_SETTINGS;

        return {
            ...DEFAULT_WORKSPACE_SETTINGS,
            ...saved,
        };
    } catch {
        return DEFAULT_WORKSPACE_SETTINGS;
    }
}

export function saveWorkspaceSettings(settings) {
    localStorage.setItem(WORKSPACE_SETTINGS_KEY, JSON.stringify(settings));
}

export function getWorkspacePreset(mode) {
    if (mode === WORKSPACE_MODES.DEBUG) {
        return {
            mode,
            showLegend: true,
            showWorldPanel: true,
            showPathPanel: true,
            showTopologyStats: true,
        };
    }

    if (mode === WORKSPACE_MODES.PROGRESSION) {
        return {
            mode,
            showLegend: true,
            showWorldPanel: true,
            showPathPanel: false,
            showTopologyStats: true,
        };
    }

    if (mode === WORKSPACE_MODES.MINIMAL) {
        return {
            mode,
            showLegend: false,
            showWorldPanel: false,
            showPathPanel: false,
            showTopologyStats: false,
        };
    }

    return {
        mode: WORKSPACE_MODES.TACTICAL,
        showLegend: true,
        showWorldPanel: true,
        showPathPanel: true,
        showTopologyStats: true,
    };
}