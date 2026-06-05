import "./ToastSettingsView.css";

const LEVELS = [
    ["info", "Info"],
    ["success", "Success"],
    ["warning", "Warning"],
    ["danger", "Danger"],
    ["error", "Error"],
];

const TYPES = [
    ["command", "Commands"],
    ["topology", "Topology"],
    ["reset", "Reset"],
    ["world", "World Daemon"],
    ["backdoor", "Backdoors"],
    ["faction", "Faction"],
    ["services", "Services"],
    ["daemon", "Daemon"],
    ["system", "System"],
];

export default function ToastSettingsView({
    settings,
    onChange,
}) {
    function update(nextPatch) {
        onChange({
            ...settings,
            ...nextPatch,
        });
    }

    function toggleLevel(key) {
        onChange({
            ...settings,
            levels: {
                ...settings.levels,
                [key]: !settings.levels?.[key],
            },
        });
    }

    function toggleType(key) {
        onChange({
            ...settings,
            types: {
                ...settings.types,
                [key]: !settings.types?.[key],
            },
        });
    }

    function resetDefaults() {
        localStorage.removeItem("bbdash-toast-settings-v1");
        window.location.reload();
    }

    return (
        <div className="toast-settings">
            <div className="toast-settings-row">
                <div>
                    <div className="toast-settings-title">Toast Notifications</div>
                    <div className="toast-settings-subtitle">
                        Control which event log items become floating alerts.
                    </div>
                </div>

                <Switch
                    active={settings.enabled}
                    onClick={() => update({ enabled: !settings.enabled })}
                />
            </div>

            <Section title="Levels">
                {LEVELS.map(([key, label]) => (
                    <ToggleRow
                        key={key}
                        label={label}
                        active={settings.levels?.[key] !== false}
                        onClick={() => toggleLevel(key)}
                    />
                ))}
            </Section>

            <Section title="Event Types">
                {TYPES.map(([key, label]) => (
                    <ToggleRow
                        key={key}
                        label={label}
                        active={settings.types?.[key] === true}
                        onClick={() => toggleType(key)}
                    />
                ))}
            </Section>

            <button className="toast-settings-reset" onClick={resetDefaults}>
                Reset Toast Defaults
            </button>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="toast-settings-section">
            <div className="toast-settings-section-title">{title}</div>
            <div className="toast-settings-list">{children}</div>
        </section>
    );
}

function ToggleRow({ label, active, onClick }) {
    return (
        <button className="toast-toggle-row" onClick={onClick}>
            <span>{label}</span>
            <Switch active={active} />
        </button>
    );
}

function Switch({ active, onClick }) {
    return (
        <span
            className={`toast-switch ${active ? "toast-switch-on" : ""}`}
            onClick={onClick}
        >
            <span />
        </span>
    );
}