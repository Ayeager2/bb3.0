import Row from "../shared/Row.jsx";
import ProgressBar from "../shared/ProgressBar.jsx";
import { formatMoney, formatPercent, formatTime } from "../../utils/formatters.js";

export default function TargetIntelView({ state }) {
    const target = state?.target ?? {};

    return (
        <>
            <Row label="Name" value={target.name ?? "none"} tone="yellow" />
            <Row
                label="Money"
                value={`${formatMoney(target.money)} / ${formatMoney(target.maxMoney)}`}
                tone="green"
            />
            <Row label="Money %" value={formatPercent(target.moneyPercent)} tone="green" />
            <ProgressBar value={target.moneyPercent} />

            <Row
                label="Security"
                value={`${target.security ?? "unknown"} / min ${target.minSecurity ?? "unknown"}`}
                tone="yellow"
            />
            <Row label="Sec Diff" value={target.securityDiff ?? "unknown"} tone="yellow" />
            <Row label="Weaken" value={formatTime(target.weakenTime)} tone="cyan" />
            <Row label="Prep Need" value={formatPercent(target.prepNeed)} tone="purple" />
            <ProgressBar value={target.prepNeed} />
        </>
    );
}