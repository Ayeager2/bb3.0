
//bb-dashboard-bridge\dashboard-ui\src\components\settings\WidgetsSettings.jsx
import Switch from "../shared/Switch.jsx";

export default function WidgetsSettings({ layout, registry, onToggleVisible }) {
    return (
        <div className="settings-list">
            {layout.order.map(id => {
                const config = registry[id];
                if (!config) return null;

                const enabled = layout.visible[id] !== false;

                return (
                    <div key={id} className="settings-item">
                        <div>
                            <div className="settings-item-title">{config.title}</div>
                            <div className="settings-item-id">{id}</div>
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