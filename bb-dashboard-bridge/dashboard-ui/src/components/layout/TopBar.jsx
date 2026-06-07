import {
    FiActivity,
    FiCommand,
    FiCpu,
    FiDatabase,
    FiDollarSign,
    FiTarget,
    FiZap,
} from "react-icons/fi";

import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./TopBar.css";

export default function TopBar({ state, error, commandStatus, onOpenCommandPalette }) {
    const player = state?.player ?? {};
    const progression = state?.progression ?? {};
    const daemon = state?.daemon ?? {};
    const bridgeTime = state?.bridgeUpdatedAtText ?? formatTime(state?.bridgeUpdatedAt);
    const gameTime = formatTime(state?.updatedAt);
    const daemonTime = formatTime(state?.daemonUpdatedAt);

    return (
        <header className="topbar">
            <div className="topbar-title-block">
                <div className="topbar-title">Daemon Dashboard</div>
                <div className="topbar-subtitle">External Bitburner tactical overlay</div>
                <button
                    type="button"
                    className="topbar-command-button"
                    onClick={onOpenCommandPalette}
                    title="Open command palette"
                >
                    <FiCommand />
                    <span>Command</span>
                    <kbd>Ctrl K</kbd>
                </button>
            </div>

            <div className="topbar-stat-grid">
                <TopBarStat
                    icon={<FiDollarSign />}
                    label="Money"
                    value={formatMoney(player.money)}
                    tone="green"
                />

                <TopBarStat
                    icon={<FiCpu />}
                    label="Hacking"
                    value={formatNumber(player.hacking)}
                    tone="cyan"
                />

                <TopBarStat
                    icon={<FiZap />}
                    label="Mode"
                    value={progression.mode ?? "unknown"}
                    tone="purple"
                />

                <TopBarStat
                    icon={<FiActivity />}
                    label="Phase"
                    value={progression.phase ?? "unknown"}
                    tone="yellow"
                />

                <TopBarStat
                    icon={<FiTarget />}
                    label="Target"
                    value={daemon.target ?? "none"}
                    tone="red"
                />

                <TopBarStat
                    icon={<FiDatabase />}
                    label="Commands"
                    value={formatCommandStatus(commandStatus)}
                    tone={commandStatus?.running ? "green" : "red"}
                />
            </div>

            <div className="topbar-right">
                <div className={`topbar-live ${error ? "topbar-live-error" : ""}`}>
                    {error ? "ERROR" : "LIVE"}
                </div>

                <div className="topbar-time">
                    <div>Bridge {bridgeTime ?? "unknown"}</div>
                    <div>Game {gameTime ?? "unknown"} | Daemon {daemonTime ?? "unknown"}</div>
                </div>
            </div>
        </header>
    );
}

function TopBarStat({ icon, label, value, tone = "cyan" }) {
    return (
        <div className={`topbar-stat topbar-stat-${tone}`}>
            <div className="topbar-stat-icon">{icon}</div>
            <div>
                <div className="topbar-stat-label">{label}</div>
                <div className="topbar-stat-value">{value ?? "unknown"}</div>
            </div>
        </div>
    );
}

function formatCommandStatus(status) {
    if (!status) return "unknown";

    const online = status.running ? "ONLINE" : "OFFLINE";
    const state = status.status ?? "unknown";

    return `${online} - ${state}`;
}

function formatTime(value) {
    if (!value) return "unknown";

    try {
        return new Date(value).toLocaleTimeString();
    } catch {
        return "unknown";
    }
}
