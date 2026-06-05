import { useEffect, useState } from "react";
import {
    fetchCommandStatus,
    sendDashboardCommand,
} from "../../api/dashboardApi.js";
import "./DebugActionsSettings.css"
const ACTIONS = [
    {
        command: "refreshTopology",
        title: "Refresh Topology",
        description: "Runs the topology writer once.",
    },
    {
        command: "debugSnapshot",
        title: "State Snapshot",
        description: "Forces a dashboard state snapshot.",
    },
    {
        command: "eventTest",
        title: "Event Test",
        description: "Writes a test event into the event feed.",
    },
    {
        command: "clearEvents",
        title: "Clear Events",
        description: "Clears the Bitburner UI event log.",
        danger: true,
    },
];

export default function DebugActionsSettings() {
    const [busyCommand, setBusyCommand] = useState(null);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState(null);

    async function loadStatus() {
        try {
            const next = await fetchCommandStatus();
            setStatus(next);
        } catch {
            setStatus(null);
        }
    }

    useEffect(() => {
        loadStatus();

        const id = setInterval(loadStatus, 3000);

        return () => clearInterval(id);
    }, []);

    async function runCommand(command) {
        setBusyCommand(command);
        setMessage("");

        try {
            await sendDashboardCommand(command);
            setMessage(`Sent command: ${command}`);

            setTimeout(loadStatus, 750);
        } catch (error) {
            setMessage(String(error?.message ?? error));
        } finally {
            setBusyCommand(null);
        }
    }

    return (
        <div className="settings-list">
            <CommandStatus status={status} />

            {ACTIONS.map(action => (
                <div key={action.command} className="settings-item">
                    <div>
                        <div className="settings-item-title">{action.title}</div>
                        <div className="settings-item-id">{action.description}</div>
                    </div>

                    <button
                        className={`control-action ${action.danger ? "control-action-danger" : ""}`}
                        disabled={busyCommand === action.command}
                        onClick={() => runCommand(action.command)}
                    >
                        {busyCommand === action.command ? "Running..." : "Run"}
                    </button>
                </div>
            ))}

            {message && (
                <div className="settings-message">
                    {message}
                </div>
            )}
        </div>
    );
}

function CommandStatus({ status }) {
    const tone = status?.status ?? "unknown";

    return (
        <div className={`command-status command-status-${tone}`}>
            <div>
                <div className="settings-item-title">Command Runner</div>
                <div className="settings-item-id">
                    {status?.message ?? "No status yet."}
                </div>
            </div>

            <div className="command-status-pill">
                {status?.running ? "ONLINE" : "OFFLINE"} · {tone}
            </div>
        </div>
    );
}