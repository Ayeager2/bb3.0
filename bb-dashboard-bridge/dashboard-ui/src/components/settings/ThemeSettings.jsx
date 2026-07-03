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

const GANG_SPRITE_PALETTES = [
    { id: "rainbow", label: "RGBIV", note: "neon rainbow", colors: ["#ff2e88", "#ff8a00", "#faff00", "#00ff9c", "#00f5ff", "#3b82f6", "#a855f7"] },
    { id: "lesbian", label: "Lesbian", note: "sunset pinks", colors: ["#d52d00", "#ef7627", "#ff9a56", "#ffffff", "#d162a4", "#b55690", "#a30262"] },
    { id: "pride", label: "Pride", note: "classic flag", colors: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982", "#ff2e88"] },
    { id: "trans", label: "Trans", note: "blue pink white", colors: ["#5bcefa", "#f5a9b8", "#ffffff", "#f5a9b8", "#5bcefa", "#ffffff", "#5bcefa"] },
    { id: "bi", label: "Bi", note: "pink purple blue", colors: ["#d60270", "#d60270", "#9b4f96", "#0038a8", "#0038a8", "#9b4f96", "#d60270"] },
    { id: "pan", label: "Pan", note: "pink yellow blue", colors: ["#ff218c", "#ff218c", "#ffd800", "#ffd800", "#21b1ff", "#21b1ff", "#ff218c"] },
    { id: "ace", label: "Ace", note: "black gray purple", colors: ["#000000", "#a3a3a3", "#ffffff", "#800080", "#000000", "#a3a3a3", "#800080"] },
    { id: "nonbinary", label: "Nonbinary", note: "yellow white purple black", colors: ["#fff430", "#ffffff", "#9c59d1", "#000000", "#fff430", "#9c59d1", "#ffffff"] },
    { id: "agender", label: "Agender", note: "green white gray", colors: ["#000000", "#b9b9b9", "#ffffff", "#b8f483", "#ffffff", "#b9b9b9", "#000000"] },
    { id: "genderfluid", label: "Genderfluid", note: "pink white purple blue", colors: ["#ff75a2", "#ffffff", "#be18d6", "#000000", "#333ebd", "#be18d6", "#ff75a2"] },
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
    gangSpriteSettings = { paletteId: "rainbow", colors: GANG_SPRITE_PALETTES[0].colors },
    onGangSpriteSettingsChange,
}) {
    const spriteColors = normalizeSpriteColors(gangSpriteSettings.colors);

    function applySpritePalette(option) {
        onGangSpriteSettingsChange?.({
            paletteId: option.id,
            colors: option.colors,
        });
    }

    function updateSpriteColor(index, color) {
        const nextColors = [...spriteColors];
        nextColors[index] = color;

        onGangSpriteSettingsChange?.({
            paletteId: "custom",
            colors: nextColors,
        });
    }

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

            <div className="settings-item settings-item-stacked">
                <div>
                    <div className="settings-item-title">Gang Sprite Look</div>
                    <div className="settings-item-id">Choose the shirt palette for operator sprites, then tune each color slot.</div>
                </div>

                <div className="sprite-palette-grid">
                    {GANG_SPRITE_PALETTES.map(option => (
                        <button
                            key={option.id}
                            className={`sprite-palette-chip ${gangSpriteSettings.paletteId === option.id ? "active" : ""}`}
                            onClick={() => applySpritePalette(option)}
                            type="button"
                        >
                            <span>{option.label}</span>
                            <em>{option.note}</em>
                            <ColorStrip colors={option.colors} />
                        </button>
                    ))}
                </div>

                <div className="sprite-color-grid">
                    {spriteColors.map((color, index) => (
                        <label className="sprite-color-field" key={index}>
                            <span>Slot {index + 1}</span>
                            <input
                                type="color"
                                value={color}
                                onChange={event => updateSpriteColor(index, event.target.value)}
                            />
                            <b>{color}</b>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ColorStrip({ colors }) {
    return (
        <div className="sprite-color-strip" aria-hidden="true">
            {colors.map((color, index) => (
                <i key={`${color}-${index}`} style={{ background: color }} />
            ))}
        </div>
    );
}

function normalizeSpriteColors(colors) {
    const fallback = GANG_SPRITE_PALETTES[0].colors;
    return Array.from({ length: 7 }, (_, index) => {
        const color = colors?.[index] ?? fallback[index];
        return /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : fallback[index];
    });
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
