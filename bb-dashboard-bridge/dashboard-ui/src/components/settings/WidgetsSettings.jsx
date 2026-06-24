
//bb-dashboard-bridge\dashboard-ui\src\components\settings\WidgetsSettings.jsx
import Switch from "../shared/Switch.jsx";

const SIZE_OPTIONS = [
    { value: "quarter", label: "1/4" },
    { value: "third", label: "1/3" },
    { value: "half", label: "2/4" },
    { value: "two-thirds", label: "2/3" },
    { value: "three-quarters", label: "3/4" },
    { value: "full", label: "1" },
];

export default function WidgetsSettings({
    layout,
    registry,
    onToggleVisible,
    onSetCardSize,
}) {
    return (
        <div className="settings-list">
            {layout.order.map(id => {
                const config = registry[id];
                if (!config) return null;

                const enabled = layout.visible[id] !== false;
                const selectedSize = layout.sizes?.[id] ?? "default";

                return (
                    <div key={id} className="settings-item">
                        <div>
                            <div className="settings-item-title">{config.title}</div>
                            <div className="settings-item-id">{id}</div>
                            <div className="settings-size-row" aria-label={`${config.title} card size`}>
                                {SIZE_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        className={`settings-size-chip ${selectedSize === option.value ? "active" : ""}`}
                                        onClick={() => onSetCardSize(id, option.value)}
                                        type="button"
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Switch
                            checked={enabled}
                            onChange={() => onToggleVisible(id)}
                        />
                    </div>
                );
            })}
        </div>
    );
}
