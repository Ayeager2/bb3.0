export const TOAST_SETTINGS_KEY = "bbdash-toast-settings-v1";

export const DEFAULT_TOAST_SETTINGS = {
    enabled: true,
    levels: {
        info: false,
        success: true,
        warning: true,
        danger: true,
        error: true,
    },
    types: {
        command: true,
        topology: true,
        reset: true,
        world: true,
        backdoor: true,
        faction: true,
        system: false,
        services: true,
        daemon: true,
    },
};

export function loadToastSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(TOAST_SETTINGS_KEY) || "null");

        if (!saved) return DEFAULT_TOAST_SETTINGS;

        return {
            enabled: saved.enabled ?? DEFAULT_TOAST_SETTINGS.enabled,
            levels: {
                ...DEFAULT_TOAST_SETTINGS.levels,
                ...(saved.levels ?? {}),
            },
            types: {
                ...DEFAULT_TOAST_SETTINGS.types,
                ...(saved.types ?? {}),
            },
        };
    } catch {
        return DEFAULT_TOAST_SETTINGS;
    }
}

export function saveToastSettings(settings) {
    localStorage.setItem(TOAST_SETTINGS_KEY, JSON.stringify(settings));
}