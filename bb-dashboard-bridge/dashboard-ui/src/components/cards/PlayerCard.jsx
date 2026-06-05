import Card from "../shared/Card.jsx";
import Row from "../shared/Row.jsx";
import { formatMoney, formatNumber } from "../../utils/formatters.js";

export default function PlayerCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const player = state?.player ?? {};

    return (
        <Card
            id={id}
            title="Player"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >

            <Row label="Money" value={formatMoney(player.money)} tone="green" />
            <Row label="Hacking" value={formatNumber(player.hacking)} tone="blue" />
        </Card>
    );
}