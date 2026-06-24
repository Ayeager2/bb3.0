import { useState } from "react";
import { formatMoney, formatNumber, formatPercent } from "../../utils/formatters.js";
import "./BuyerLogView.css";

export default function BuyerLogView({ state }) {
    const [scope, setScope] = useState("lifetime");
    const log =
        state?.economy?.purchaseLog ?? {};
    const lifetimeEntries =
        Array.isArray(log.entries) ? log.entries : [];
    const sessionEntries =
        Array.isArray(log.sessionEntries) ? log.sessionEntries : [];
    const entries =
        scope === "session" ? sessionEntries : lifetimeEntries;
    const byCategory =
        scope === "session"
            ? (Array.isArray(log.sessionByCategory) ? log.sessionByCategory : [])
            : (Array.isArray(log.byCategory) ? log.byCategory : []);
    const totals =
        scope === "session" ? (log.sessionTotals ?? {}) : (log.totals ?? {});
    const lifetimeTotals =
        log.totals ?? {};
    const sessionTotals =
        log.sessionTotals ?? {};

    return (
        <div className="buyer-log-view">
            <div className="buyer-log-scope">
                <button
                    type="button"
                    className={scope === "lifetime" ? "active" : ""}
                    onClick={() => setScope("lifetime")}
                >
                    Lifetime
                </button>
                <button
                    type="button"
                    className={scope === "session" ? "active" : ""}
                    onClick={() => setScope("session")}
                >
                    Install
                </button>
            </div>

            <div className="buyer-log-summary">
                <Metric label={scope === "session" ? "Install Spend" : "Lifetime Spend"} value={formatMoney(totals.spent ?? 0)} tone="green" />
                <Metric label="Purchases" value={formatNumber(totals.count ?? entries.length, 0)} tone="cyan" />
                <Metric label="Latest" value={totals.latestText ?? "none"} tone="yellow" />
            </div>

            <div className="buyer-log-comparison">
                <span>Lifetime {formatMoney(lifetimeTotals.spent ?? 0)}</span>
                <span>Install {formatMoney(sessionTotals.spent ?? 0)}</span>
            </div>

            <section className="buyer-log-panel">
                <div className="buyer-log-panel-title">Spend Mix</div>
                <SpendDonut categories={byCategory} />
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

function SpendDonut({ categories = [] }) {
    const slices =
        categories
            .filter(category => Number(category.spent) > 0)
            .slice(0, 8);
    const gradient =
        buildDonutGradient(slices);

    return (
        <div className="buyer-spend-donut-wrap">
            <div
                className="buyer-spend-donut"
                style={{ background: gradient }}
                title={slices.map(category => `${labelCategory(category.label)}: ${formatPercent(category.percent ?? 0, 1)}`).join("\n")}
            >
                <span>{slices.length}</span>
                <small>cats</small>
            </div>
            <div className="buyer-spend-legend">
                {slices.length === 0 ? (
                    <span>No spend mix yet.</span>
                ) : slices.map((category, index) => (
                    <span key={category.id}>
                        <i style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                        {labelCategory(category.label)}
                    </span>
                ))}
            </div>
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

const CATEGORY_COLORS = [
    "#00e5ff",
    "#00ff88",
    "#ffd000",
    "#ff9d00",
    "#bc7cff",
    "#ff2f6d",
    "#5ee7ff",
    "#d6ff4d",
];

function buildDonutGradient(categories) {
    if (!categories.length) {
        return "conic-gradient(rgba(148, 163, 184, .25) 0deg 360deg)";
    }

    let cursor = 0;
    const stops = [];

    for (let index = 0; index < categories.length; index += 1) {
        const category = categories[index];
        const percent = Math.max(0, Number(category.percent) || 0);
        const next = Math.min(1, cursor + percent);
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        stops.push(`${color} ${cursor * 360}deg ${next * 360}deg`);
        cursor = next;
    }

    if (cursor < 1) {
        stops.push(`rgba(148, 163, 184, .16) ${cursor * 360}deg 360deg`);
    }

    return `conic-gradient(${stops.join(", ")})`;
}

function labelCategory(value = "other") {
    return String(value)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}
