import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiInfo, FiAlertTriangle, FiXCircle, FiX } from "react-icons/fi";
import "./ToastHost.css";

const LEVEL_CONFIG = {
    info: { icon: <FiInfo />, ttl: 4000 },
    success: { icon: <FiCheckCircle />, ttl: 4000 },
    warning: { icon: <FiAlertTriangle />, ttl: 7000 },
    danger: { icon: <FiXCircle />, ttl: "close" },
    error: { icon: <FiXCircle />, ttl: "close" },
};

export default function ToastHost({ events = [], settings }) {
    const [dismissed, setDismissed] = useState(() => new Set());
    const [seen, setSeen] = useState(() => new Set());

    const toastEvents = useMemo(() => {
        return events
            .filter(event => shouldToast(event, settings))
            .slice(-6)
            .reverse()
            .map(event => ({
                ...event,
                toastId: getToastId(event),
            }))
            .filter(event => !dismissed.has(event.toastId));
    }, [events, dismissed, settings]);

    useEffect(() => {
        for (const event of toastEvents) {
            if (seen.has(event.toastId)) continue;

            const ttl = getEventTtl(event);

            setSeen(current => new Set([...current, event.toastId]));

            if (ttl === "close" || ttl === 0) {
                continue;
            }

            const timer = setTimeout(() => {
                dismiss(event.toastId);
            }, ttl);

            return () => clearTimeout(timer);
        }
    }, [toastEvents, seen]);

    function dismiss(id) {
        setDismissed(current => new Set([...current, id]));
    }

    if (!toastEvents.length) return null;

    return (
        <div className="toast-host">
            {toastEvents.map(event => {
                const level = normalizeLevel(event.level);
                const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info;
                const ttl = getEventTtl(event);
                const sticky = ttl === "close" || ttl === 0;

                return (
                    <div key={event.toastId} className={`toast-item toast-${level}`}>
                        <div className="toast-icon">{config.icon}</div>

                        <div className="toast-content">
                            <div className="toast-title">
                                {event.type ?? "system"}
                                {sticky && <span className="toast-sticky">STICKY</span>}
                            </div>

                            <div className="toast-message">
                                {event.message ?? ""}
                            </div>
                        </div>

                        <button className="toast-close" onClick={() => dismiss(event.toastId)}>
                            <FiX />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function getEventTtl(event) {
    const explicit =
        event?.ttl ??
        event?.toastTtl ??
        event?.data?.ttl ??
        event?.data?.toastTtl;

    if (explicit === "close" || explicit === "sticky") return "close";

    const numeric = Number(explicit);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;

    const level = normalizeLevel(event?.level);
    return LEVEL_CONFIG[level]?.ttl ?? 5000;
}

function shouldToast(event, settings) {
    if (settings?.enabled === false) return false;

    const level = normalizeLevel(event?.level);
    const type = String(event?.type ?? "system");

    const levelAllowed = settings?.levels?.[level] ?? true;
    const typeAllowed = settings?.types?.[type] ?? false;

    return levelAllowed && typeAllowed;
}

function normalizeLevel(level) {
    const value = String(level ?? "info").toLowerCase();

    if (value === "error") return "error";
    if (value === "danger") return "danger";
    if (value === "warning") return "warning";
    if (value === "success") return "success";

    return "info";
}

function getToastId(event) {
    return `${event.ts ?? "no-ts"}-${event.type ?? "system"}-${event.message ?? ""}`;
}