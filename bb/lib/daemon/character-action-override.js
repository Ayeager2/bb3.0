// /lib/daemon/character-action-override.js

export const CHARACTER_ACTION_OVERRIDE_FILE = "/data/character-action-override.txt";

export function readCharacterActionOverride(ns) {
    try {
        if (!ns.fileExists(CHARACTER_ACTION_OVERRIDE_FILE, "home")) return null;

        const raw = ns.read(CHARACTER_ACTION_OVERRIDE_FILE);
        if (!raw.trim()) return null;

        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function isCharacterActionOverrideActive(ns) {
    return readCharacterActionOverride(ns)?.enabled === true;
}

export function describeCharacterActionOverride(override) {
    if (!override?.enabled) return "No dashboard character override is active.";

    return override.label ?? `Dashboard character override is active: ${override.action ?? "manual action"}.`;
}
