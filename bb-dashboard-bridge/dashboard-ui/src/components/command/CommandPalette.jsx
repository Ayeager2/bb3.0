import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiActivity,
    FiCommand,
    FiCpu,
    FiFlag,
    FiRefreshCw,
    FiTrash2,
    FiZap,
    FiHelpCircle
} from "react-icons/fi";

import { sendDashboardCommand } from "../../api/dashboardApi.js";
import { getWorkspacePreset, WORKSPACE_MODES } from "../layout/workspaceSettings.js";
import "./CommandPalette.css";

const COMMANDS = [
    {
        id: "refresh-topology",
        label: "Refresh topology",
        hint: "Run topology writer once",
        icon: <FiRefreshCw />,
        keywords: ["topology", "map", "refresh"],
        run: async ctx => {
            await sendDashboardCommand("refreshTopology");
            ctx.close();
        },
    },
    {
        id: "debug-snapshot",
        label: "Debug snapshot",
        hint: "Force dashboard state snapshot",
        icon: <FiCpu />,
        keywords: ["debug", "snapshot", "state"],
        run: async ctx => {
            await sendDashboardCommand("debugSnapshot");
            ctx.close();
        },
    },
    {
        id: "event-test",
        label: "Event test",
        hint: "Write test event",
        icon: <FiActivity />,
        keywords: ["event", "test", "toast"],
        run: async ctx => {
            await sendDashboardCommand("eventTest");
            ctx.close();
        },
    },
    {
        id: "clear-events",
        label: "Clear events",
        hint: "Clear event log",
        icon: <FiTrash2 />,
        danger: true,
        keywords: ["clear", "events", "log"],
        run: async ctx => {
            await sendDashboardCommand("clearEvents");
            ctx.close();
        },
    },
    {
        id: "open-core",
        label: "Open inspector: Core",
        hint: "Core state, target intel, target stability",
        icon: <FiCpu />,
        keywords: ["core", "target", "stability"],
        run: ctx => {
            ctx.openInspector("core");
            ctx.close();
        },
    },
    {
        id: "open-victory",
        label: "Open inspector: Victory",
        hint: "Victory plan and BN4 readiness",
        icon: <FiFlag />,
        keywords: ["victory", "bn4", "readiness", "world"],
        run: ctx => {
            ctx.openInspector("victory");
            ctx.close();
        },
    },
    {
        id: "open-events",
        label: "Open inspector: Events",
        hint: "Live daemon event feed",
        icon: <FiActivity />,
        keywords: ["events", "feed", "logs"],
        run: ctx => {
            ctx.openInspector("events");
            ctx.close();
        },
    },
    {
        id: "workspace-tactical",
        label: "Workspace: Tactical",
        hint: "Full command cockpit",
        icon: <FiCommand />,
        keywords: ["workspace", "tactical", "full"],
        run: ctx => {
            ctx.setWorkspace(getWorkspacePreset(WORKSPACE_MODES.TACTICAL));
            ctx.close();
        },
    },
    {
        id: "workspace-debug",
        label: "Workspace: Debug",
        hint: "Maximum diagnostics",
        icon: <FiCommand />,
        keywords: ["workspace", "debug"],
        run: ctx => {
            ctx.setWorkspace(getWorkspacePreset(WORKSPACE_MODES.DEBUG));
            ctx.close();
        },
    },
    {
        id: "workspace-progression",
        label: "Workspace: Progression",
        hint: "Victory/world-daemon focus",
        icon: <FiZap />,
        keywords: ["workspace", "progression", "victory"],
        run: ctx => {
            ctx.setWorkspace(getWorkspacePreset(WORKSPACE_MODES.PROGRESSION));
            ctx.close();
        },
    },
    {
        id: "workspace-minimal",
        label: "Workspace: Minimal",
        hint: "Clean topology-first view",
        icon: <FiCommand />,
        keywords: ["workspace", "minimal", "clean"],
        run: ctx => {
            ctx.setWorkspace(getWorkspacePreset(WORKSPACE_MODES.MINIMAL));
            ctx.close();
        },
    },
    {
        id: "open-reasoning",
        label: "Open inspector: Reasoning",
        hint: "Explain current daemon decisions",
        icon: <FiHelpCircle />,
        keywords: ["why", "reason", "reasoning", "explain", "daemon"],
        run: ctx => {
            ctx.openInspector("reasoning");
            ctx.close();
        },
    },
];

export default function CommandPalette({
    open,
    onClose,
    onOpenInspectorTab,
    onWorkspaceSettingsChange,
}) {
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");
    const inputRef = useRef(null);
    const itemRefs = useRef([]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (!q) return COMMANDS;

        return COMMANDS.filter(command => {
            const haystack = [
                command.label,
                command.hint,
                ...(command.keywords ?? []),
            ].join(" ").toLowerCase();

            return haystack.includes(q);
        });
    }, [query]);

    useEffect(() => {
        if (!open) return;

        setQuery("");
        setActiveIndex(0);
        setError("");

        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (filtered.length === 0) {
            setActiveIndex(0);
            return;
        }

        setActiveIndex(index => Math.min(index, filtered.length - 1));
    }, [open, filtered.length]);

    useEffect(() => {
        if (!open) return;

        itemRefs.current[activeIndex]?.scrollIntoView({
            block: "nearest",
        });
    }, [open, activeIndex]);

    useEffect(() => {
        if (!open) return;

        function onKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex(index => {
                    if (filtered.length === 0) return 0;

                    return Math.min(index + 1, filtered.length - 1);
                });
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex(index => Math.max(index - 1, 0));
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                const command = filtered[activeIndex];
                if (command && !busyId) runCommand(command);
            }
        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, filtered, activeIndex, busyId]);

    async function runCommand(command) {
        if (busyId) return;

        setBusyId(command.id);
        setError("");

        const ctx = {
            close: onClose,
            openInspector: tabId => onOpenInspectorTab?.(tabId),
            setWorkspace: settings => onWorkspaceSettingsChange?.(settings),
        };

        try {
            await command.run(ctx);
        } catch (err) {
            setError(String(err?.message ?? err));
        } finally {
            setBusyId(null);
        }
    }

    if (!open) return null;

    return (
        <div className="command-palette-backdrop" onMouseDown={onClose}>
            <section
                className="command-palette"
                onMouseDown={event => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
            >
                <div className="command-palette-scanline" aria-hidden="true" />

                <div className="command-palette-input-wrap">
                    <FiCommand />
                    <input
                        ref={inputRef}
                        autoFocus
                        value={query}
                        onChange={event => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        placeholder="Type a command..."
                        aria-label="Search commands"
                    />
                </div>

                <div className="command-palette-list" role="listbox" aria-label="Available commands">
                    {filtered.length === 0 && (
                        <div className="command-empty">No commands found.</div>
                    )}

                    {filtered.map((command, index) => (
                        <button
                            key={command.id}
                            ref={element => {
                                itemRefs.current[index] = element;
                            }}
                            className={[
                                "command-item",
                                index === activeIndex ? "active" : "",
                                command.danger ? "danger" : "",
                            ].join(" ")}
                            type="button"
                            role="option"
                            aria-selected={index === activeIndex}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => runCommand(command)}
                            disabled={busyId !== null}
                        >
                            <span className="command-icon">{command.icon}</span>

                            <span className="command-text">
                                <span className="command-label">{command.label}</span>
                                <span className="command-hint">{command.hint}</span>
                            </span>

                            {busyId === command.id && (
                                <span className="command-busy">...</span>
                            )}
                        </button>
                    ))}
                </div>

                {error && <div className="command-error">{error}</div>}

                <div className="command-footer">
                    <span>Up/Down Navigate</span>
                    <span>Enter Run</span>
                    <span>Esc Close</span>
                </div>
            </section>
        </div>
    );
}
