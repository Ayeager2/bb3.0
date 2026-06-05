import Row from "../shared/Row.jsx";
import ProgressBar from "../shared/ProgressBar.jsx";
import { formatPercent } from "../../utils/formatters.js";

export default function LaneAllocationView({ state }) {
    const l = state?.lanes ?? {};

    return (
        <>
            <Row
                label="Multi"
                value={l.multiTargetEnabled ? "YES" : "NO"}
                tone={l.multiTargetEnabled ? "green" : "red"}
            />

            <Row label="Money 1" value={formatPercent(l.primaryMoneyRamPercent)} tone="green" />
            <ProgressBar value={l.primaryMoneyRamPercent} />

            <Row label="Money 2" value={formatPercent(l.secondaryMoneyRamPercent)} tone="green" />
            <ProgressBar value={l.secondaryMoneyRamPercent} />

            <Row label="EXP" value={formatPercent(l.expRamPercent)} tone="blue" />
            <ProgressBar value={l.expRamPercent} />

            <Row label="Adaptive" value={l.adaptive ? "YES" : "NO"} tone={l.adaptive ? "green" : "red"} />
            <Row label="Reason" value={l.reason ?? "none"} tone="muted" />
        </>
    );
}