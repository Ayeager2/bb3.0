import Row from "../shared/Row.jsx";
import { formatMoney } from "../../utils/formatters.js";

export default function PolicyView({ state }) {
    const p = state?.policy ?? {};

    const flags = [
        ["Servers", p.allowServerPurchases],
        ["Stocks", p.allowStockTrading],
        ["Hacknet", p.allowHacknet],
        ["HomeRAM", p.allowHomeRam],
        ["EXEs", p.allowExePurchases],
        ["Augs", p.allowAugmentPurchases],
        ["Reset", p.allowReset],
        ["Travel", p.allowIntTravel],
    ];

    return (
        <>
            <Row label="Reserve" value={formatMoney(p.reserveMoney)} tone="yellow" />

            <div className="flag-list">
                {flags.map(([label, enabled]) => (
                    <span
                        key={label}
                        className={`flag-pill ${enabled ? "flag-on" : "flag-off"}`}
                    >
                        {label}
                    </span>
                ))}
            </div>
        </>
    );
}