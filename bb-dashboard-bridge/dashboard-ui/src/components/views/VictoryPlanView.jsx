import Row from "../shared/Row.jsx";
import { formatNumber } from "../../utils/formatters.js";

export default function VictoryPlanView({ state }) {
    const v = state?.victory ?? {};

    return (
        <>
            <Row label="Stage" value={v.stage ?? "unknown"} tone="purple" />
            <Row label="Next" value={v.nextAction ?? "none"} tone="muted" />
            <Row label="Hack Goal" value={formatNumber(v.hackingTarget)} tone="yellow" />
            <Row label="Daedalus" value={v.hasDaedalus ? "YES" : "NO"} tone={v.hasDaedalus ? "green" : "red"} />
            <Row label="Red Pill" value={v.hasRedPill ? "YES" : "NO"} tone={v.hasRedPill ? "green" : "red"} />
            <Row label="World" value={v.worldDaemon ?? "w0r1d_d43m0n"} tone="cyan" />
            <Row label="Can Use" value={v.canUseWorldDaemon ? "YES" : "NO"} tone={v.canUseWorldDaemon ? "green" : "red"} />
        </>
    );
}