import { useState } from "react";
import { formatMoney, formatNumber, formatPercent } from "../../utils/formatters.js";
import "./BuyerLogView.css";

export default function BuyerLogView({ state }) {
    const log =
        state?.economy?.purchaseLog ?? {};
    const entries =
        Array.isArray(log.entries) ? log.entries : [];
    const byCategory =
        Array.isArray(log.byCategory) ? log.byCategory : [];
    const totals =
        log.totals ?? {};

    return (
        <div className="buyer-log-view">
            <div className="buyer-log-summary">
                <Metric label="Tracked Spend" value={formatMoney(totals.spent ?? 0)} tone="green" />
                <Metric label="Purchases" value={formatNumber(totals.count ?? entries.length, 0)} tone="cyan" />
                <Metric label="Latest" value={totals.latestText ?? "none"} tone="yellow" />
            </div>

            <section className="buyer-log-panel">
                <div className="buyer-log-panel-title">Spend Mix</div>
                <div className="buyer-category-list">
                    {byCategory.length === 0 ? (
                        <div className="buyer-log-empty">No purchase categories yet.</div>
                    ) : byCategory.slice(0, 8).map(category => (
                        <div className="buyer-category-row" key={category.id}>
                            <div title={`${labelCategory(category.label)}: ${formatNumber(category.count, 0)} buys`}>
                                <b>{labelCategory(category.label)}</b>
                                <span>{formatNumber(category.count, 0)} buys</span>
                            </div>
                            <div className="buyer-category-bar">
                                <i style={{ width: `${Math.max(4, Number(category.percent) * 100)}%` }} />
                            </div>
                            <em title={formatMoney(category.spent)}>{formatMoney(category.spent)}</em>
                            <strong title={formatPercent(category.percent ?? 0, 1)}>{formatPercent(category.percent ?? 0, 0)}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className="buyer-log-panel">
                <div className="buyer-log-panel-title">Buyer Log</div>
                <div className="buyer-log-table">
                    <div className="buyer-log-head">
                        <span>Time</span>
                        <span>Category</span>
                        <span>Item</span>
                        <span>Cost</span>
                    </div>
                    {entries.length === 0 ? (
                        <div className="buyer-log-empty">No purchases logged yet.</div>
                    ) : entries.slice(0, 80).map((entry, index) => (
                        <PurchaseRow entry={entry} key={`${entry.time ?? index}-${entry.source}-${entry.item}`} />
                    ))}
                </div>
            </section>
        </div>
    );
}

function PurchaseRow({ entry }) {
    const [open, setOpen] = useState(false);
    const childCount =
        Array.isArray(entry.purchases) ? entry.purchases.length : 0;
    const hasDetails =
        Boolean(entry.message) ||
        childCount > 0 ||
        Boolean(entry.details);

    return (
        <div className={`buyer-log-entry ${open ? "buyer-log-entry-open" : ""}`}>
            <button
                className="buyer-log-row"
                type="button"
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                title={entry.message ?? `${entry.item ?? "unknown"} · ${formatMoney(entry.cost ?? 0)}`}
            >
                <span>{entry.timeText ?? "--"}</span>
                <span className={`buyer-category buyer-${entry.category ?? "other"}`}>{labelCategory(entry.category)}</span>
                <span>
                    <b title={entry.item ?? "unknown"}>{entry.item ?? "unknown"}</b>
                    <small title={`${entry.source ?? "unknown"}${childCount > 1 ? ` | ${childCount} bundled buys` : ""}`}>
                        {entry.source ?? "unknown"}{childCount > 1 ? ` | ${childCount} bundled buys` : ""}
                    </small>
                </span>
                <em title={formatMoney(entry.cost ?? 0)}>{formatMoney(entry.cost ?? 0)}</em>
            </button>

            {open && (
                <div className="buyer-log-details">
                    <DetailLine label="Message" value={entry.message ?? "No message recorded."} />
                    <DetailLine label="Source" value={entry.source ?? "unknown"} />
                    <DetailLine label="Category" value={labelCategory(entry.category)} />
                    <DetailLine label="Cost" value={formatMoney(entry.cost ?? 0)} />
                    {entry.moneyBefore !== undefined && (
                        <DetailLine label="Before" value={formatMoney(entry.moneyBefore)} />
                    )}
                    {entry.moneyAfter !== undefined && (
                        <DetailLine label="After" value={formatMoney(entry.moneyAfter)} />
                    )}

                    {childCount > 0 && (
                        <div className="buyer-log-bundle">
                            <b>Bundled Buys</b>
                            {entry.purchases.map((purchase, index) => (
                                <span key={`${purchase.label ?? purchase.item ?? index}-${index}`}>
                                    {purchase.label ?? purchase.item ?? purchase.type ?? `buy ${index + 1}`}
                                    {purchase.cost !== undefined ? ` · ${formatMoney(purchase.cost)}` : ""}
                                </span>
                            ))}
                        </div>
                    )}

                    {hasDetails && entry.details && (
                        <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                    )}
                </div>
            )}
        </div>
    );
}

function DetailLine({ label, value }) {
    return (
        <div className="buyer-log-detail-line">
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function Metric({ label, value, tone = "cyan" }) {
    return (
        <div className={`buyer-log-metric buyer-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function labelCategory(value = "other") {
    return String(value)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}
