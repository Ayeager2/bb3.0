// /lib/ui/event-log.js

export const UI_EVENT_LOG_FILE = "/data/ui/event-log.txt";
const MAX_EVENTS = 80;

export function writeUiEvent(ns, type, message, options = {}) {
    const event = {
        ts: Date.now(),
        type: String(type ?? "system"),
        level: String(options.level ?? "info"),
        message: String(message ?? ""),
        data: options.data ?? null,
    };

    const events = readUiEvents(ns);
    events.push(event);

    const trimmed = events.slice(-MAX_EVENTS);
    const text = trimmed.map(e => JSON.stringify(e)).join("\n");

    ns.write(UI_EVENT_LOG_FILE, text, "w");
}

export function readUiEvents(ns) {
    try {
        if (!ns.fileExists(UI_EVENT_LOG_FILE, "home")) return [];

        const raw = ns.read(UI_EVENT_LOG_FILE);
        if (!raw.trim()) return [];

        return raw
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => JSON.parse(line));
    } catch {
        return [];
    }
}