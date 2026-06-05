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

                        <button
                            className={`switch ${enabled ? "switch-on" : ""}`}
                            onClick={() => onToggleVisible(id)}
                        >
                            <span />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}