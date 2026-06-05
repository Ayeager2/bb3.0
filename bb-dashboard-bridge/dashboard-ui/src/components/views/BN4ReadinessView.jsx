import Row from "../shared/Row.jsx";
import ProgressBar from "../shared/ProgressBar.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";

export default function BN4ReadinessView({ state }) {
    const r = state?.readiness ?? {};
    const readyRatio = r.totalChecks ? r.readyCount / r.totalChecks : 0;

    return (
        <>
            <Row label="Goal" value={r.goal ?? "unknown"} tone="purple" />
            <Row
                label="Ready"
                value={`${r.readyCount ?? 0}/${r.totalChecks ?? 0}`}
                tone={r.ready ? "green" : "yellow"}
            />
            <ProgressBar value={readyRatio} />

            <Row label="Overall" value={r.ready ? "YES" : "NO"} tone={r.ready ? "green" : "red"} />
            <Row
                label="Hacking"
                value={`${formatNumber(r.hacking)} / ${formatNumber(r.hackingTarget)}`}
                tone={r.hackingReady ? "green" : "yellow"}
            />
            <Row
                label="Money"
                value={`${formatMoney(r.money)} / ${formatMoney(r.moneyTarget)}`}
                tone={r.moneyReady ? "green" : "yellow"}
            />
            <Row label="Home RAM" value={r.homeRamReady ? "YES" : "NO"} tone={r.homeRamReady ? "green" : "red"} />
            <Row
                label="Augs"
                value={`${formatNumber(r.augmentCount)} / ${formatNumber(r.augmentTarget)}`}
                tone={r.augReady ? "green" : "yellow"}
            />
        </>
    );
}