import "./ServiceHealthView.css";

export default function ServiceHealthView({ state }) {
    const services = Array.isArray(state?.services) ? state.services : [];

    if (!services.length) {
        return <div className="muted">No service health data available.</div>;
    }

    const sorted = [...services].sort((a, b) => {
        if (a.running !== b.running) return a.running ? 1 : -1;
        return String(a.id ?? a.name).localeCompare(String(b.id ?? b.name));
    });

    const counts = {
        total: services.length,
        running: services.filter(s => s.running).length,
        stopped: services.filter(s => !s.running).length,
        blocked: services.filter(s => isBlocked(s)).length,
        failed: services.filter(s => isFailed(s)).length,
    };

    return (
        <div className="service-health-view">
            <div className="service-health-summary">
                <Metric label="Total" value={counts.total} />
                <Metric label="Running" value={counts.running} tone="green" />
                <Metric label="Stopped" value={counts.stopped} tone={counts.stopped ? "red" : "muted"} />
                <Metric label="Blocked" value={counts.blocked} tone={counts.blocked ? "yellow" : "muted"} />
                <Metric label="Failed" value={counts.failed} tone={counts.failed ? "red" : "muted"} />
            </div>

            <div className="service-health-list">
                {sorted.map(service => (
                    <ServiceRow key={service.key ?? service.id ?? service.name} service={service} />
                ))}
            </div>
        </div>
    );
}

function Metric({ label, value, tone = "cyan" }) {
    return (
        <div className={`service-metric service-metric-${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

function ServiceRow({ service }) {
    const status = getStatus(service);
    const tone = getTone(service);

    return (
        <div className={`service-row service-row-${tone}`}>
            <div className="service-row-main">
                <div>
                    <div className="service-name">{service.id ?? service.name ?? "service"}</div>
                    <div className="service-script">{service.name ?? "unknown script"}</div>
                </div>

                <span className="service-status">{status}</span>
            </div>

            <div className="service-meta">
                <span>{service.host ?? "home"}</span>
                <span>{service.threads ?? 1}t</span>
                <span>{service.type ?? "UNKNOWN"}</span>
                {service.kind && <span>{service.kind}</span>}
                {service.pid ? <span>pid {service.pid}</span> : null}
                {service.keepAlive && <span>keepAlive</span>}
                {service.tail && <span>tail</span>}
            </div>

            {service.purpose && (
                <div className="service-purpose">{service.purpose}</div>
            )}

            {service.reason && (
                <div className={`service-reason service-reason-${tone}`}>
                    {service.reason}
                </div>
            )}

            {Array.isArray(service.args) && service.args.length > 0 && (
                <div className="service-args">
                    args: {service.args.map(String).join(" ")}
                </div>
            )}
        </div>
    );
}

function getStatus(service) {
    if (service.status) return String(service.status).toUpperCase();
    if (service.blocked) return "BLOCKED";
    if (service.running) return "RUNNING";
    return "STOPPED";
}

function getTone(service) {
    if (isFailed(service)) return "failed";
    if (isBlocked(service)) return "warning";
    if (service.running) return "running";
    return "stopped";
}

function isBlocked(service) {
    return (
        service.blocked === true ||
        service.status === "blocked" ||
        service.status === "cooldown"
    );
}

function isFailed(service) {
    return service.status === "failed" || service.kind === "failed";
}