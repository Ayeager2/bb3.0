import { formatTime } from "../../utils/formatters.js";

export default function TopBar({ state, error }) {
    return (
        <header className="topbar">
            <div>
                <div className="app-title">DAEMON DASHBOARD</div>
                <div className="app-subtitle">External Bitburner tactical overlay</div>
            </div>

            <div className="app-status">
                {error ? (
                    <span className="red">Waiting for bridge/state...</span>
                ) : (
                    <>
                        <div>
                            <span className="green">LIVE</span>{" "}
                            Bridge {state?.bridgeUpdatedAtText ?? formatTime(state?.bridgeUpdatedAt)}
                        </div>
                        <div className="mini">
                            Game {formatTime(state?.updatedAt)} | Daemon {formatTime(state?.daemonUpdatedAt)}
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}