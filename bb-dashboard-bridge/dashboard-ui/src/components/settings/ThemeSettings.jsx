const BITNODE_THEMES = [
    { id: "auto", label: "Auto", note: "Current BitNode skin" },
    { id: "bn1_genesis", label: "BN1 Genesis", note: "baseline neon" },
    { id: "bn2_underworld", label: "BN2 Underworld", note: "gang / shadow" },
    { id: "bn3_corporate", label: "BN3 Corp", note: "corporate grid" },
    { id: "sf4_singularity", label: "SF4 Singularity", note: "purple command" },
    { id: "bn5_ai", label: "BN5 AI", note: "machine blue" },
    { id: "bn6_bladeburner", label: "BN6 Blade", note: "steel red" },
    { id: "bn7_bladeburner", label: "BN7 Blade+", note: "deep blade" },
    { id: "bn8_market", label: "BN8 Market", note: "stock amber" },
    { id: "bn9_hacknet", label: "BN9 Hash", note: "cyan / orange hash" },
    { id: "bn10_sleeves", label: "BN10 Sleeves", note: "clone violet" },
    { id: "bn11_knife", label: "BN11 Knife", note: "sharp magenta" },
    { id: "bn12_loop", label: "BN12 Loop", note: "rainbow repeat" },
];

const SIGNAL_THEMES = [
    { id: "auto", label: "Auto", note: "current mode signal" },
    { id: "neutral", label: "Neutral", note: "quiet status" },
    { id: "money_green", label: "Money", note: "income active" },
    { id: "exp_blue", label: "EXP", note: "leveling active" },
    { id: "faction_cyan", label: "Faction", note: "rep work active" },
    { id: "danger_red", label: "Reset", note: "danger / reset" },
];

export default function ThemeSettings({
    fontOffset = 0,
    onFontOffsetChange,
    themeAccent = "auto",
    activeAccent = "default",
    onThemeAccentChange,
    themeSignal = "auto",
    activeSignal = "neutral",
    onThemeSignalChange,
}) {
    return (
        <div className="settings-list">
            <ThemeGroup
                title="BitNode Skin"
                detail={`Active: ${activeAccent}. Auto follows the current BitNode skin.`}
                options={BITNODE_THEMES}
                selected={themeAccent}
                onSelect={onThemeAccentChange}
            />

            <ThemeGroup
                title="Secondary Signal"
                detail={`Active: ${activeSignal}. Money/EXP/Faction/Reset tint status accents without replacing the BitNode skin.`}
                options={SIGNAL_THEMES}
                selected={themeSignal}
                onSelect={onThemeSignalChange}
                compact
            />

            <div className="settings-item">
                <div>
                    <div className="settings-item-title">Font Scale</div>
                    <div className="settings-item-id">Increase dashboard text in 1px steps.</div>
                </div>

                <div className="font-scale-control">
                    <button
                        className="control-action"
                        onClick={() => onFontOffsetChange?.(fontOffset - 1)}
                        disabled={fontOffset <= 0}
                    >
                        -
                    </button>
                    <button
                        className="control-action"
                        onClick={() => onFontOffsetChange?.(0)}
                        disabled={fontOffset === 0}
                    >
                        {fontOffset === 0 ? "Base" : `+${fontOffset}px`}
                    </button>
                    <button
                        className="control-action"
                        onClick={() => onFontOffsetChange?.(fontOffset + 1)}
                        disabled={fontOffset >= 8}
                    >
                        +
                    </button>
                </div>
            </div>

            <div className="settings-item">
                <div>
                    <div className="settings-item-title">Theme Engine</div>
                    <div className="settings-item-id">Next: scanlines, glow, and animation level.</div>
                </div>
            </div>
        </div>
    );
}

function ThemeGroup({
    title,
    detail,
    options,
    selected,
    onSelect,
    compact = false,
}) {
    return (
        <div className="settings-item settings-item-stacked">
            <div>
                <div className="settings-item-title">{title}</div>
                <div className="settings-item-id">{detail}</div>
            </div>

            <div className={`theme-chip-grid ${compact ? "theme-chip-grid-compact" : ""}`}>
                {options.map(option => (
                    <button
                        key={option.id}
                        className={[
                            "theme-chip",
                            `theme-chip-${option.id}`,
                            selected === option.id ? "active" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => onSelect?.(option.id)}
                        type="button"
                    >
                        <span>{option.label}</span>
                        <em>{option.note}</em>
                    </button>
                ))}
            </div>
        </div>
    );
}
