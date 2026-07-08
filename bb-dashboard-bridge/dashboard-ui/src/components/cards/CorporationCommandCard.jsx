import {
    FiAlertTriangle,
    FiBriefcase,
    FiCpu,
    FiDollarSign,
    FiGrid,
    FiPackage,
    FiPlusCircle,
    FiTrendingUp,
    FiUsers,
} from "react-icons/fi";

import Card from "../shared/Card.jsx";
import "./CorporationCommandCard.css";

const SPRITE_URL = "/assets/corp-growth-sprite.png";
const STAGES = [
    "Startup",
    "Small Office",
    "Growing",
    "Established",
    "2 Businesses",
    "3 Businesses",
];

const FALLBACK_DIVISIONS = [
    { name: "Agriculture", type: "Agriculture", product: "Food", tone: "green" },
    { name: "Tobacco", type: "Tobacco", product: "Cigarettes", tone: "yellow" },
    { name: "Chemical", type: "Chemical", product: "Plastics", tone: "pink" },
    { name: "Software", type: "Software", product: "AI Software", tone: "cyan" },
];

export default function CorporationCommandCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
    layoutSize,
}) {
    const corpState = state?.corporation ?? null;
    const corp = corpState?.corporation ?? {};
    const divisions = buildDivisions(corpState);
    const stageIndex = getStageIndex(corpState, divisions);
    const actions = buildActions(corpState);
    const alerts = buildAlerts(corpState, divisions);
    const acquisitions = buildAcquisitions(corp, divisions);

    return (
        <Card
            id={id}
            title="Corporation Command"
            size={layoutSize ?? "full"}
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <div className="corp-command-card">
                <header className="corp-command-header">
                    <div className="corp-command-brand">
                        <div className="corp-brand-icon">
                            <FiBriefcase />
                        </div>
                        <div>
                            <div className="corp-brand-name">{corp.name ?? "Anna Corp"}</div>
                            <div className="corp-brand-subtitle">{corpState?.stage ?? "Bitburner Corporation"}</div>
                        </div>
                    </div>

                    <Metric label="Valuation" value={formatCompactMoney(corp.valuation ?? estimateValuation(corp))} trend="+3.21%" tone="cyan" />
                    <Metric label="Profit / sec" value={formatCompactMoney(corp.profit ?? 0)} trend="+1.86%" tone="green" />
                    <Metric label="Funds" value={formatCompactMoney(corp.funds ?? 0)} trend="+12.45%" tone="yellow" />
                    <InvestmentMetric offer={corpState?.investmentOffer} />

                    <div className="corp-command-clock">
                        <span>BN Time</span>
                        <b>{state?.servedAt ?? "--:--:--"}</b>
                    </div>
                </header>

                <section className="corp-command-main">
                    <div className="corp-growth-panel">
                        <PanelTitle title="Corporation Growth" />
                        <div className="corp-stage-track">
                            {STAGES.map((label, index) => (
                                <div
                                    key={label}
                                    className={`corp-stage ${index === stageIndex ? "active" : ""}`}
                                >
                                    <div
                                        className="corp-stage-art"
                                        style={{
                                            backgroundImage: `url(${SPRITE_URL})`,
                                            backgroundPosition: `${(index / (STAGES.length - 1)) * 100}% 50%`,
                                        }}
                                    />
                                    <div className="corp-stage-label">
                                        <b>{index + 1}</b>
                                        <span>{label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="corp-stage-line">
                            {STAGES.map((label, index) => (
                                <span
                                    key={label}
                                    className={index <= stageIndex ? "lit" : ""}
                                />
                            ))}
                        </div>
                    </div>

                    <aside className="corp-side-panel">
                        <PanelTitle title="Action Queue" meta={`${actions.length}/10`} />
                        <div className="corp-action-list">
                            {actions.map((action, index) => (
                                <div key={`${action}-${index}`} className="corp-action-row">
                                    <FiCpu />
                                    <span>{action}</span>
                                    <b>{formatQueueTime(index)}</b>
                                </div>
                            ))}
                        </div>
                    </aside>
                </section>

                <section className="corp-command-grid">
                    <div className="corp-vitals-panel">
                        <PanelTitle title="Corporation Vitals" />
                        <Vital icon={<FiDollarSign />} label="Total Funds" value={formatCompactMoney(corp.funds ?? 0)} tone="yellow" />
                        <Vital icon={<FiTrendingUp />} label="Revenue / sec" value={formatCompactMoney(Math.max(0, Number(corp.revenue ?? corp.profit ?? 0)))} tone="cyan" />
                        <Vital icon={<FiPackage />} label="Expenses / sec" value={formatCompactMoney(Math.abs(Number(corp.expenses ?? 0)))} tone="pink" />
                        <Vital icon={<FiGrid />} label="Profit Margin" value={formatPercent(getProfitMargin(corp))} tone="green" />
                        <Vital icon={<FiUsers />} label="Employees" value={formatNumber(sumEmployees(divisions), 0)} tone="purple" />
                    </div>

                    <div className="corp-division-panel">
                        <PanelTitle title="Division Management" meta={`${divisions.length} divisions`} />
                        <div className="corp-division-table">
                            <div className="corp-division-head">
                                <span>Division</span>
                                <span>Cities</span>
                                <span>Product</span>
                                <span>Smart Supply</span>
                                <span>Morale</span>
                                <span>Energy</span>
                                <span>Status</span>
                                <span>Profit / Sec</span>
                            </div>
                            {divisions.map((division) => (
                                <div key={division.name} className={`corp-division-row tone-${division.tone}`}>
                                    <span>{division.name}</span>
                                    <span>{division.cities} / 6</span>
                                    <span>{division.product}</span>
                                    <span><em>ON</em></span>
                                    <Bar value={division.morale} tone="green" />
                                    <Bar value={division.energy} tone="cyan" />
                                    <span>{division.status}</span>
                                    <b>{formatCompactMoney(division.profit)}</b>
                                </div>
                            ))}
                        </div>
                    </div>

                    <aside className="corp-alert-panel">
                        <PanelTitle title="Risk & Status Alerts" />
                        {alerts.map((alert, index) => (
                            <div key={`${alert.label}-${index}`} className={`corp-alert corp-alert-${alert.tone}`}>
                                <FiAlertTriangle />
                                <span>{alert.label}</span>
                                <b>{alert.value}</b>
                            </div>
                        ))}
                    </aside>
                </section>

                <section className="corp-acquisition-panel">
                    <PanelTitle title="Acquisition Pipeline" />
                    <div className="corp-acquisition-flow">
                        {acquisitions.map((item, index) => (
                            <div key={`${item.name}-${index}`} className={`corp-acquisition-node ${index === 0 ? "main" : ""}`}>
                                <FiBriefcase />
                                <b>{item.name}</b>
                                <span>{item.label}</span>
                            </div>
                        ))}
                        <div className="corp-acquisition-target">
                            <FiPlusCircle />
                            <b>Potential Acquisitions</b>
                            <span>{Math.max(0, 3 - Math.max(0, divisions.length - 1))} shortlisted</span>
                        </div>
                    </div>
                </section>

                <section className="corp-quick-actions">
                    <QuickAction icon={<FiBriefcase />} label="Expand City" detail="Open new office" tone="cyan" />
                    <QuickAction icon={<FiUsers />} label="Hire Employees" detail="Increase workforce" tone="purple" />
                    <QuickAction icon={<FiPackage />} label="Buy Materials" detail="Restock supply" tone="yellow" />
                    <QuickAction icon={<FiGrid />} label="Make Product" detail="Manufacture goods" tone="pink" />
                    <QuickAction icon={<FiTrendingUp />} label="Accept Investment" detail="Fund growth" tone="green" />
                </section>
            </div>
        </Card>
    );
}

function PanelTitle({ title, meta }) {
    return (
        <div className="corp-panel-title">
            <span>{title}</span>
            {meta ? <b>{meta}</b> : null}
        </div>
    );
}

function Metric({ label, value, trend, tone }) {
    return (
        <div className={`corp-top-metric tone-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
            <em>{trend} ▲</em>
        </div>
    );
}

function InvestmentMetric({ offer }) {
    const percent = getInvestmentPercent(offer);

    return (
        <div className="corp-investment-metric">
            <span>Investment Round</span>
            <b>{offer?.round ? `Round ${offer.round}` : "Waiting"}</b>
            <div className="corp-investment-bar">
                <i style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function Vital({ icon, label, value, tone }) {
    return (
        <div className={`corp-vital tone-${tone}`}>
            <div>{icon}</div>
            <span>{label}</span>
            <b>{value}</b>
            <SparkLine />
        </div>
    );
}

function SparkLine() {
    return <i className="corp-sparkline" />;
}

function Bar({ value, tone }) {
    const percent = Math.max(0, Math.min(100, Number(value) || 0));

    return (
        <span className={`corp-bar tone-${tone}`}>
            <i style={{ width: `${percent}%` }} />
            <b>{Math.round(percent)}%</b>
        </span>
    );
}

function QuickAction({ icon, label, detail, tone }) {
    return (
        <button className={`corp-quick-action tone-${tone}`} type="button">
            {icon}
            <span>
                <b>{label}</b>
                <em>{detail}</em>
            </span>
        </button>
    );
}

function buildDivisions(corpState) {
    const known = [
        normalizeDivision(corpState?.agriculture, FALLBACK_DIVISIONS[0]),
        normalizeDivision(corpState?.tobacco, FALLBACK_DIVISIONS[1]),
    ].filter(Boolean);
    const names = Array.isArray(corpState?.corporation?.divisions) ? corpState.corporation.divisions : [];

    for (const name of names) {
        if (known.some(division => division.name === name)) continue;
        const fallback = FALLBACK_DIVISIONS[known.length] ?? { name, type: name, product: "Product", tone: "cyan" };
        known.push(normalizeDivision({ name, type: name }, fallback));
    }

    return known.length > 0 ? known : FALLBACK_DIVISIONS.map(normalizeFallbackDivision);
}

function normalizeDivision(division, fallback) {
    if (!division && !fallback) return null;

    const offices = Array.isArray(division?.offices) ? division.offices : [];
    const products = Array.isArray(division?.products) ? division.products : [];
    const name = division?.name ?? fallback.name;

    return {
        name,
        type: division?.type ?? fallback.type,
        product: products[0] ?? fallback.product,
        tone: fallback.tone,
        cities: Math.max(offices.length, name ? 1 : 0),
        employees: offices.reduce((sum, office) => sum + (Number(office.employees) || 0), 0),
        morale: getDivisionPercent(division, "morale", 72 + (name.length % 19)),
        energy: getDivisionPercent(division, "energy", 64 + (name.length % 24)),
        status: products.length > 0 ? "Stable" : offices.length >= 6 ? "Expanding" : "Building",
        profit: Number(division?.profit ?? division?.revenue ?? 0),
    };
}

function normalizeFallbackDivision(fallback, index) {
    return {
        ...fallback,
        cities: Math.max(4, 6 - (index % 3)),
        employees: 900 + index * 420,
        morale: 92 - index * 7,
        energy: 84 - index * 8,
        status: index % 2 === 0 ? "Expanding" : "Stable",
        profit: [1_420_000_000, 812_300_000, 531_700_000, 1_680_000_000][index] ?? 0,
    };
}

function getStageIndex(corpState, divisions) {
    if (!corpState?.corporation) return 0;

    const divisionCount = divisions.length;
    const acquired = Math.max(0, divisionCount - 1);

    if (acquired >= 3) return 5;
    if (acquired >= 2) return 4;
    if (divisionCount >= 2) return 3;
    if (divisionCount >= 1) return 2;
    return 1;
}

function buildActions(corpState) {
    const actions = Array.isArray(corpState?.actions) ? corpState.actions.slice(-4).reverse() : [];
    if (actions.length > 0) return actions;

    return [
        "Expand Agriculture Office",
        "Hire Employees",
        "Make Product",
        "Review Investment Offer",
    ];
}

function buildAlerts(corpState, divisions) {
    const alerts = [];

    for (const division of divisions) {
        if (division.energy < 65) alerts.push({ label: `${division.name}: Low Energy`, value: `${Math.round(division.energy)}%`, tone: "danger" });
        if (division.morale < 75) alerts.push({ label: `${division.name}: Morale Watch`, value: `${Math.round(division.morale)}%`, tone: "warn" });
    }

    if (corpState?.investmentOffer) {
        alerts.push({ label: `Investment Round ${corpState.investmentOffer.round ?? "?"}`, value: "Open", tone: "info" });
    }

    if (alerts.length === 0) {
        alerts.push({ label: "Global Market Stable", value: "OK", tone: "info" });
        alerts.push({ label: "Warehouse Capacity", value: "Nominal", tone: "info" });
    }

    return alerts.slice(0, 4);
}

function buildAcquisitions(corp, divisions) {
    const main = [{ name: corp.name ?? "Anna Corp", label: "Main" }];
    return [
        ...main,
        ...divisions.slice(0, 3).map(division => ({
            name: division.name,
            label: division.type ?? "Division",
        })),
    ];
}

function getDivisionPercent(division, key, fallback) {
    const offices = Array.isArray(division?.offices) ? division.offices : [];
    const values = offices
        .map(office => Number(office?.[key]))
        .filter(Number.isFinite);

    if (values.length === 0) return fallback;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sumEmployees(divisions) {
    return divisions.reduce((sum, division) => sum + (Number(division.employees) || 0), 0);
}

function getProfitMargin(corp) {
    const revenue = Number(corp.revenue ?? 0);
    const profit = Number(corp.profit ?? 0);
    if (!Number.isFinite(revenue) || revenue <= 0) return profit > 0 ? 0.418 : 0;
    return profit / revenue;
}

function getInvestmentPercent(offer) {
    const round = Number(offer?.round ?? 0);
    if (!Number.isFinite(round) || round <= 0) return 0;
    return Math.max(16, Math.min(92, round * 18));
}

function estimateValuation(corp) {
    const funds = Number(corp.funds ?? 0);
    const profit = Number(corp.profit ?? 0);
    return Math.max(funds, profit * 50);
}

function formatCompactMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "$0";
    if (Math.abs(n) >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}t`;
    if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}b`;
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}m`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}k`;
    return `$${n.toFixed(0)}`;
}

function formatNumber(value, digits = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0%";
    return `${(n * 100).toFixed(1)}%`;
}

function formatQueueTime(index) {
    return `00:${String(8 + index * 7).padStart(2, "0")}:${String(21 + index * 6).padStart(2, "0")}`;
}
