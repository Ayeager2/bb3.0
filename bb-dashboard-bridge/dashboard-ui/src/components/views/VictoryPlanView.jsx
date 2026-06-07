import ProgressBar from "../shared/ProgressBar.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";
import "./VictoryPlanView.css";

export default function VictoryPlanView({ state }) {
    const v = state?.victory ?? {};
    const r = state?.readiness ?? {};
    const readyRatio = r.totalChecks ? r.readyCount / r.totalChecks : 0;

    return (
        <div className="victory-plan">
            <section className={`victory-hero ${r.ready ? "victory-ready" : ""}`}>
                <div>
                    <div className="victory-kicker">BN4 Route</div>
                    <div className="victory-stage">{v.stage ?? "unknown"}</div>
                    <div className="victory-next">{v.nextAction ?? r.goal ?? "No victory action published."}</div>
                </div>

                <div className={`victory-status ${r.ready ? "victory-status-ready" : "victory-status-pending"}`}>
                    {r.ready ? "READY" : `${r.readyCount ?? 0}/${r.totalChecks ?? 0}`}
                </div>
            </section>

            <section className="victory-readiness-panel">
                <div className="victory-section-title">Readiness</div>
                <ProgressBar value={readyRatio} />
                <div className="victory-check-grid">
                    <CheckTile
                        label="Hacking"
                        value={`${formatNumber(r.hacking)} / ${formatNumber(r.hackingTarget ?? v.hackingTarget)}`}
                        ready={r.hackingReady}
                    />
                    <CheckTile
                        label="Money"
                        value={`${formatMoney(r.money)} / ${formatMoney(r.moneyTarget)}`}
                        ready={r.moneyReady}
                    />
                    <CheckTile
                        label="Home RAM"
                        value={r.homeRamReady ? "ready" : "blocked"}
                        ready={r.homeRamReady}
                    />
                    <CheckTile
                        label="Augments"
                        value={`${formatNumber(r.augmentCount)} / ${formatNumber(r.augmentTarget)}`}
                        ready={r.augReady}
                    />
                </div>
            </section>

            <section className="victory-artifact-grid">
                <ArtifactBadge label="Daedalus" active={v.hasDaedalus} />
                <ArtifactBadge label="Red Pill" active={v.hasRedPill} />
                <ArtifactBadge label="World Access" active={v.canUseWorldDaemon} />
            </section>

            <section className="victory-world-panel">
                <div className="victory-section-title">World Daemon</div>
                <div className="victory-world-name">{v.worldDaemon ?? "w0r1d_d43m0n"}</div>
                <div className="victory-world-note">
                    {v.canUseWorldDaemon
                        ? "World daemon access is available."
                        : "Route remains locked until readiness checks and required augmentations align."}
                </div>
            </section>
        </div>
    );
}

function CheckTile({ label, value, ready }) {
    return (
        <div className={`victory-check ${ready ? "victory-check-ready" : "victory-check-pending"}`}>
            <div>{label}</div>
            <strong>{value}</strong>
        </div>
    );
}

function ArtifactBadge({ label, active }) {
    return (
        <div className={`victory-artifact ${active ? "victory-artifact-on" : "victory-artifact-off"}`}>
            <span>{label}</span>
            <strong>{active ? "YES" : "NO"}</strong>
        </div>
    );
}
