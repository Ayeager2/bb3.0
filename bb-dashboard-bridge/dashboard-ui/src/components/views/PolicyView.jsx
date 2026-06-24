import ProgressBar from "../shared/ProgressBar.jsx";
import { formatMoney, formatPercent } from "../../utils/formatters.js";
import "./PolicyView.css";

export default function PolicyView({ state }) {
    const p = state?.policy ?? {};
    const caps = state?.capabilities ?? {};
    const lanes = state?.lanes ?? {};
    const sourceFiles = buildSourceFileStatus(caps.sourceFiles);

    const spendingFlags = [
        ["Servers", p.allowServerPurchases],
        ["Stocks", p.allowStockTrading],
        ["Hacknet", p.allowHacknet],
        ["HomeRAM", p.allowHomeRam],
        ["EXEs", p.allowExePurchases],
        ["Augs", p.allowAugmentPurchases],
    ];

    const operationFlags = [
        ["Faction", p.allowFactionWork],
        ["Background", p.backgroundFactionWork],
        ["Reset", p.allowReset],
        ["Travel", p.allowIntTravel],
    ];

    return (
        <div className="policy-view">
            <section className="policy-hero">
                <div>
                    <div className="policy-kicker">Reserve</div>
                    <div className="policy-reserve">{formatMoney(p.reserveMoney)}</div>
                    <div className="policy-note">
                        {p.backgroundFactionReason ?? lanes.reason ?? "Automation policy is active."}
                    </div>
                </div>

                <div className={`policy-mode ${lanes.multiTargetEnabled ? "policy-mode-on" : "policy-mode-off"}`}>
                    {lanes.multiTargetEnabled ? "MULTI" : "SINGLE"}
                </div>
            </section>

            <PolicyFlagGroup title="Spending" flags={spendingFlags} />
            <PolicyFlagGroup title="Operations" flags={operationFlags} />

            <section className="policy-lanes">
                <div className="policy-section-title">RAM Lanes</div>
                <Lane label="Money Primary" value={lanes.primaryMoneyRamPercent} tone="green" />
                <Lane label="Money Secondary" value={lanes.secondaryMoneyRamPercent} tone="green" />
                <Lane label="EXP" value={lanes.expRamPercent} tone="cyan" />
                <div className={`policy-adaptive ${lanes.adaptive ? "policy-adaptive-on" : ""}`}>
                    Adaptive lane targeting: {lanes.adaptive ? "ON" : "OFF"}
                </div>
            </section>

            <section className="policy-capabilities">
                <div className="policy-section-title">Capabilities</div>
                <div className="policy-chip-grid">
                    {Object.entries(caps).filter(([key]) => key !== "sourceFiles").map(([key, value]) => (
                        <span key={key} className={`policy-chip ${value ? "policy-chip-on" : "policy-chip-off"}`}>
                            {formatCapability(key)}
                        </span>
                    ))}
                </div>
            </section>

            <section className="policy-source-files">
                <div className="policy-section-title">Source Files</div>
                <div className="policy-source-grid">
                    {sourceFiles.map(sourceFile => (
                        <span
                            key={sourceFile.n}
                            className={[
                                "source-file-chip",
                                `source-file-${sourceFile.tone}`,
                                sourceFile.repeatable ? "source-file-repeatable" : "",
                            ].filter(Boolean).join(" ")}
                            title={sourceFile.title}
                        >
                            <b>SF{sourceFile.n}</b>
                            <em>{sourceFile.label}</em>
                        </span>
                    ))}
                </div>
            </section>
        </div>
    );
}

function PolicyFlagGroup({ title, flags }) {
    return (
        <section className="policy-flag-group">
            <div className="policy-section-title">{title}</div>
            <div className="policy-flag-grid">
                {flags.map(([label, enabled]) => (
                    <span key={label} className={`policy-flag ${enabled ? "policy-flag-on" : "policy-flag-off"}`}>
                        {label}
                    </span>
                ))}
            </div>
        </section>
    );
}

function Lane({ label, value, tone }) {
    return (
        <div className={`policy-lane policy-lane-${tone}`}>
            <div className="policy-lane-header">
                <span>{label}</span>
                <strong>{formatPercent(value)}</strong>
            </div>
            <ProgressBar value={value} />
        </div>
    );
}

function formatCapability(key) {
    return String(key)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ");
}

function buildSourceFileStatus(sourceFiles = []) {
    const byNumber = new Map(
        (Array.isArray(sourceFiles) ? sourceFiles : []).map(sourceFile => [
            Number(sourceFile.n),
            Number(sourceFile.lvl),
        ])
    );

    return Array.from({ length: 14 }, (_, index) => {
        const n = index + 1;
        const lvl = Math.max(0, byNumber.get(n) ?? 0);
        const repeatable = n === 12;
        const max = repeatable ? null : 3;
        const tone = getSourceFileTone({ lvl, max, repeatable });
        const label = repeatable
            ? (lvl > 0 ? `L${lvl}` : "none")
            : `${Math.min(lvl, max)}/${max}`;

        return {
            n,
            lvl,
            max,
            repeatable,
            tone,
            label,
            title: repeatable
                ? `Source-File ${n}: repeatable level ${lvl}`
                : `Source-File ${n}: ${Math.min(lvl, max)} of ${max}`,
        };
    });
}

function getSourceFileTone({ lvl, repeatable }) {
    if (lvl <= 0) return "empty";
    if (repeatable) return "rainbow";
    if (lvl === 1) return "one";
    if (lvl === 2) return "two";
    return "max";
}
