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

const STAGES = [
    "Startup",
    "Small Office",
    "Growing",
    "Established",
    "2 Businesses",
    "3 Businesses",
];

const STAGE_IMAGES = STAGES.map((_, index) => `/assets/corp-growth-stages/corp-growth-stage-${index + 1}.png`);

const RAMP_FLOW = [
    { key: "agriculture-main-startup", label: "Sector-12 Seed" },
    { key: "waiting-round-1-offer", label: "Round 1 Offer" },
    { key: "agriculture-round-1", label: "Round 1 Build" },
    { key: "agriculture-expand-city", label: "City Expansion" },
    { key: "waiting-round-2-offer", label: "Round 2 Offer" },
    { key: "tobacco-growth", label: "Tobacco Growth" },
];

const CITY_ORDER = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];

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
    const corp = normalizeCorporation(corpState);
    const divisions = buildDivisions(corpState);
    const stageIndex = getStageIndex(corpState, divisions);
    const actions = buildActions(corpState);
    const alerts = buildAlerts(corpState, divisions);
    const acquisitions = buildAcquisitions(corp, divisions);
    const ramp = getRampSummary(corpState, divisions);
    const stageFlow = buildStageFlow(corpState);
    const waveSummary = buildMaterialWaveSummary(corpState);
    const citySummary = getCitySummary(corpState);

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
                            <div className="corp-brand-subtitle">{ramp.subtitle}</div>
                        </div>
                    </div>

                    <Metric label="Valuation" value={formatCompactMoney(corp.valuation ?? estimateValuation(corp))} trend={ramp.stageLabel} tone="cyan" />
                    <Metric label="Profit / sec" value={formatCompactMoney(corp.profit ?? 0)} trend={corp.profit >= 0 ? "profit online" : "cash drain"} tone={corp.profit >= 0 ? "green" : "pink"} />
                    <Metric label="Funds" value={formatCompactMoney(corp.funds ?? 0)} trend={ramp.statusLabel} tone="yellow" />
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
                                    <div className="corp-stage-art">
                                        <img
                                            alt=""
                                            className="corp-stage-art-image"
                                            draggable="false"
                                            src={STAGE_IMAGES[index]}
                                        />
                                    </div>
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
                        <PanelTitle title="Ramp Status" meta={corpState?.updatedAtText ?? "waiting"} />
                        <div className="corp-status-strip">
                            <span>{corpState?.status ?? "unknown"}</span>
                            <b>{corpState?.message ?? "No corporation telemetry yet."}</b>
                        </div>

                        <div className="corp-stage-flow">
                            {stageFlow.map((step) => (
                                <div key={step.key} className={`corp-stage-step ${step.state}`}>
                                    <i />
                                    <span>{step.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="corp-ramp-facts">
                            <div>
                                <span>Active Cities</span>
                                <b>{citySummary.activeCount}/6</b>
                            </div>
                            <div>
                                <span>Next City</span>
                                <b>{citySummary.nextCity}</b>
                            </div>
                            <div>
                                <span>Offer</span>
                                <b>{formatInvestmentOffer(corpState?.investmentOffer)}</b>
                            </div>
                        </div>

                        {waveSummary.length > 0 ? (
                            <div className="corp-wave-grid">
                                {waveSummary.map((wave) => (
                                    <div key={wave.key} className={`corp-wave ${wave.complete ? "complete" : "pending"}`}>
                                        <span>{wave.label}</span>
                                        <b>{wave.complete ? "Complete" : `${wave.missingCount} missing`}</b>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="corp-action-log">
                            <div className="corp-log-title">
                                <span>Recent Script Log</span>
                                <b>{actions.length}</b>
                            </div>
                            {actions.map((action, index) => (
                                <div key={`${action}-${index}`} className="corp-action-row">
                                    <FiCpu />
                                    <span>{action}</span>
                                    <b>{index === 0 ? "now" : `${index + 1} ago`}</b>
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
            <em>{trend}</em>
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
    const actions = Array.isArray(corpState?.actions) ? corpState.actions : [];
    const known = [];
    const names = Array.isArray(corpState?.corporation?.divisions) ? corpState.corporation.divisions : [];

    if (corpState?.agriculture) {
        known.push(normalizeDivision(corpState.agriculture, FALLBACK_DIVISIONS[0], actions));
    }

    if (corpState?.tobacco) {
        known.push(normalizeDivision(corpState.tobacco, FALLBACK_DIVISIONS[1], actions));
    }

    for (const name of names) {
        if (known.some(division => division.name === name)) continue;
        const fallback = FALLBACK_DIVISIONS[known.length] ?? { name, type: name, product: "Product", tone: "cyan" };
        known.push(normalizeDivision({ name, type: name }, fallback, actions));
    }

    if (known.length > 0) {
        const corp = normalizeCorporation(corpState);
        return known.map(division => ({
            ...division,
            profit: division.profit || (known.length === 1 ? corp.profit : 0),
        }));
    }

    return corpState ? [] : FALLBACK_DIVISIONS.map(normalizeFallbackDivision);
}

function normalizeDivision(division, fallback, actions = []) {
    if (!division && !fallback) return null;

    const offices = Array.isArray(division?.offices) ? division.offices : [];
    const products = Array.isArray(division?.products) ? division.products : [];
    const name = division?.name ?? fallback.name;
    const actionCities = getCitiesFromActions(actions, name);

    return {
        name,
        type: division?.type ?? fallback.type,
        product: products[0] ?? fallback.product,
        tone: fallback.tone,
        cities: Math.max(offices.length, actionCities.length, name ? 1 : 0),
        employees: offices.reduce((sum, office) => sum + (Number(office.employees) || 0), 0),
        morale: getDivisionPercent(division, "morale", 72 + (name.length % 19)),
        energy: getDivisionPercent(division, "energy", 64 + (name.length % 24)),
        status: products.length > 0 ? "Stable" : offices.length >= 6 || actionCities.length >= 6 ? "Ramping" : "Building",
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
    const cityCount = divisions.reduce((max, division) => Math.max(max, Number(division.cities) || 0), 0);
    const status = String(corpState?.status ?? "").toLowerCase();

    if (acquired >= 3) return 5;
    if (acquired >= 2) return 4;
    if (divisionCount >= 2) return 3;
    if (cityCount >= 6 || status.includes("ramp")) return 2;
    if (divisionCount >= 1) return 1;
    return 1;
}

function buildActions(corpState) {
    const actions = Array.isArray(corpState?.actions) ? corpState.actions.slice(-7).reverse() : [];
    if (actions.length > 0) return actions;

    return [
        corpState?.message ?? "Waiting for corporation telemetry.",
    ];
}

function buildStageFlow(corpState) {
    const activeIndex = getStageFlowIndex(corpState?.stage);

    return RAMP_FLOW.map((step, index) => ({
        ...step,
        state: index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending",
    }));
}

function getStageFlowIndex(stage) {
    const normalized = String(stage ?? "").toLowerCase();
    if (normalized === "agriculture-startup" || normalized === "agriculture-main-startup") return 0;
    if (normalized === "waiting-round-1-offer" || normalized === "accept-round-1") return 1;
    if (normalized === "agriculture-round-1") return 2;
    if (normalized === "agriculture-expand-city") return 3;
    if (normalized === "waiting-round-2-offer" || normalized === "accept-round-2") return 4;
    if (normalized.includes("tobacco")) return 5;
    if (normalized.includes("recover")) return 0;
    return 0;
}

function buildMaterialWaveSummary(corpState) {
    const waves = corpState?.materialWave;
    if (!waves || typeof waves !== "object") return [];

    const labels = {
        agricultureMainStartup: "Sector-12 Boosters",
        agricultureStartup: "Legacy Startup",
        agricultureRound1: "Round 1 Materials",
        agricultureRound2: "Round 2 Materials",
    };

    return Object.entries(waves)
        .filter(([, value]) => value && typeof value === "object")
        .map(([key, value]) => ({
            key,
            label: labels[key] ?? splitCamel(key),
            complete: Boolean(value.complete),
            missingCount: Array.isArray(value.missing) ? value.missing.length : 0,
        }));
}

function getCitySummary(corpState) {
    const offices = Array.isArray(corpState?.agriculture?.offices) ? corpState.agriculture.offices : [];
    const activeCities = offices
        .map(office => office?.city)
        .filter(Boolean);
    const activeSet = new Set(activeCities);
    const nextCity = CITY_ORDER.find(city => !activeSet.has(city)) ?? "All Open";

    return {
        activeCount: activeSet.size,
        nextCity,
    };
}

function buildAlerts(corpState, divisions) {
    const alerts = [];
    const corp = normalizeCorporation(corpState);

    if (!corpState?.corporation) {
        alerts.push({ label: "Corporation Not Created", value: "Waiting", tone: "warn" });
    }

    if (corp.profit < 0) {
        alerts.push({ label: "Profit Below Zero", value: formatCompactMoney(corp.profit), tone: "danger" });
    }

    if (corpState?.status) {
        alerts.push({ label: corpState.status, value: corpState?.source ?? "corp", tone: corp.profit >= 0 ? "info" : "warn" });
    }

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

function normalizeCorporation(corpState) {
    const raw = corpState?.corporation ?? {};
    const revenue = Number(raw.revenue ?? 0);
    const expenses = Number(raw.expenses ?? 0);
    const rawProfit = Number(raw.profit);
    const profit = Number.isFinite(rawProfit) ? rawProfit : revenue - expenses;

    return {
        ...raw,
        funds: Number(raw.funds ?? 0),
        revenue,
        expenses,
        profit: Number.isFinite(profit) ? profit : 0,
    };
}

function getRampSummary(corpState, divisions) {
    const status = String(corpState?.status ?? "offline");
    const stage = getStageIndex(corpState, divisions) + 1;
    const cityCount = divisions.reduce((max, division) => Math.max(max, Number(division.cities) || 0), 0);
    const source = String(corpState?.source ?? "corp");

    return {
        subtitle: `${source} / ${status}`,
        stageLabel: `stage ${stage}/6`,
        statusLabel: cityCount > 0 ? `${cityCount}/6 cities` : status,
    };
}

function getCitiesFromActions(actions = [], divisionName = "") {
    if (!Array.isArray(actions) || actions.length === 0) return [];

    const cities = new Set();
    const cityNames = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];
    const divisionNeedle = String(divisionName || "").toLowerCase();

    for (const action of actions) {
        const text = String(action || "");
        if (divisionNeedle && !text.toLowerCase().includes(divisionNeedle)) continue;

        for (const city of cityNames) {
            if (text.includes(city)) cities.add(city);
        }
    }

    return [...cities];
}

function getInvestmentPercent(offer) {
    const round = Number(offer?.round ?? 0);
    if (!Number.isFinite(round) || round <= 0) return 0;
    return Math.max(16, Math.min(92, round * 18));
}

function formatInvestmentOffer(offer) {
    if (!offer) return "Waiting";
    const round = offer?.round ? `R${offer.round}` : "Offer";
    const funds = formatCompactMoney(offer?.funds ?? 0);
    return `${round} ${funds}`;
}

function splitCamel(value) {
    return String(value)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
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

