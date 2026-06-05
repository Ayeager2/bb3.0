import Card from "../shared/Card.jsx";
import Row from "../shared/Row.jsx";
import Chip from "../shared/Chip.jsx";
import { formatMoney } from "../../utils/formatters.js";

export default function PolicyCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const p = state?.policy ?? {};

    return (
        <Card
            id={id}
            title="Spending Policy"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <Row label="Reserve" value={formatMoney(p.reserveMoney)} tone="green" />

            <div className="chip-wrap">
                <Chip label="Servers" active={p.allowServerPurchases} />
                <Chip label="Stocks" active={p.allowStockTrading} />
                <Chip label="Hacknet" active={p.allowHacknet} />
                <Chip label="Home RAM" active={p.allowHomeRam} />
                <Chip label="EXEs" active={p.allowExePurchases} />
                <Chip label="Augs" active={p.allowAugmentPurchases} hot={p.allowAugmentPurchases} />
                <Chip label="Reset" active={p.allowReset} hot={p.allowReset} />
                <Chip label="Travel" active={p.allowIntTravel} />
            </div>
        </Card >
    );
}