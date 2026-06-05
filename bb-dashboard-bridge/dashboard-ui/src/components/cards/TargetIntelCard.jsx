import Card from "../shared/Card.jsx";
import Row from "../shared/Row.jsx";
import ProgressBar from "../shared/ProgressBar.jsx";
import {
    formatMoney,
    formatNumber,
    formatPercent,
    formatSeconds,
} from "../../utils/formatters.js";

export default function TargetIntelCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const target = state?.target ?? {};

    const securityTone =
        Number(target.securityDiff ?? 0) <= 0.1 ? "green" : "yellow";

    return (
        <Card
            id={id}
            title="Target Intel"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
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
                value={`${formatNumber(target.security)} / min ${formatNumber(target.minSecurity)}`}
                tone="red"
            />
            <Row label="Sec Diff" value={formatNumber(target.securityDiff)} tone={securityTone} />
            <Row label="Weaken" value={formatSeconds(target.weakenTime)} tone="cyan" />
            <Row label="Prep Need" value={formatPercent(target.prepNeed)} tone="yellow" />
        </Card>
    );
}