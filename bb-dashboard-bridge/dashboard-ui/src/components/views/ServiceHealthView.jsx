import "./ServiceHealthView.css";

export default function ServiceHealthView({ state }) {
    const services = Array.isArray(state?.services) ? state.services : [];

    if (!services.length) {
        return <div className="muted">No service health data available.</div>;
    }

    const normalized = services.map(normalizeService);

    const sorted = [...normalized].sort((a, b) => {
        const priorityDelta = getSortPriority(a) - getSortPriority(b);
        if (priorityDelta !== 0) return priorityDelta;

        return a.label.localeCompare(b.label);
    });

    const counts = {
        total: normalized.length,
        running: normalized.filter(s => s.state === "running").length,
        blocked: normalized.filter(s => s.state === "blocked").length,
        completed: normalized.filter(s => s.state === "completed").length,
        failed: normalized.filter(s => s.state === "failed").length,
    };

    return (
        <div className="service-health-view">
            <section className={`service-health-hero service-health-hero-${getOverallTone(counts)}`}>
                <div>
                    <div className="service-kicker">Service Supervisor</div>
                    <div className="service-health-title">
                        {counts.running}/{counts.total} active
                    </div>
                    <div className="service-health-note">
                        {buildHealthNote(counts)}
                    </div>
                </div>

                <div className="service-health-status">
                    {counts.failed > 0 ? "ATTN" : "ONLINE"}
                </div>
            </section>

            <div className="service-health-summary">
                <Metric label="Total" value={counts.total} />
                <Metric label="Running" value={counts.running} tone="green" />
                <Metric label="Blocked" value={counts.blocked} tone={counts.blocked ? "yellow" : "muted"} />
                <Metric label="Done" value={counts.completed} tone={counts.completed ? "cyan" : "muted"} />
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
    return (
        <div className={`service-row service-row-${service.tone}`}>
            <div className="service-row-main">
                <div>
                    <div className="service-name">{service.label}</div>
                    <div className="service-script">{service.script}</div>
                </div>

                <span className="service-status">{service.statusLabel}</span>
            </div>

            <div className="service-meta">
                <Meta label="host" value={service.host} />
                <Meta label="threads" value={`${service.threads}t`} />
                <Meta label="type" value={service.type} />
                <Meta label="kind" value={service.kind} />
                {service.pid > 0 ? <Meta label="pid" value={service.pid} /> : null}
                {service.keepAlive ? <Meta label="keep" value="alive" /> : null}
                {service.enabled === false ? <Meta label="enabled" value="no" tone="red" /> : null}
                {service.restartCount !== null ? <Meta label="restarts" value={service.restartCount} /> : null}
                {service.failureCount !== null ? <Meta label="failures" value={service.failureCount} tone="red" /> : null}
            </div>

            {service.purpose && (
                <div className="service-purpose">{service.purpose}</div>
            )}

            {service.reason && (
                <div className={`service-reason service-reason-${service.tone}`}>
                    <span>{service.reasonLabel}</span>
                    <strong>{service.reason}</strong>
                </div>
            )}

            {service.args.length > 0 && (
                <div className="service-args">
                    <span>args</span>
                    <code>{service.args.map(String).join(" ")}</code>
                </div>
            )}
        </div>
    );
}

function Meta({ label, value, tone = "" }) {
    if (value === null || value === undefined || value === "") return null;

    return (
        <span className={tone ? `service-meta-${tone}` : ""}>
            <b>{label}</b> {value}
        </span>
    );
}

function normalizeService(service = {}) {
    const status = String(service.status ?? "").toLowerCase();
    const kind = String(service.kind ?? "").toLowerCase();
    const running = service.running === true;

    const state = getServiceState({ status, kind, running });
    const tone = getToneForState(state);

    return {
        ...service,
        label: String(service.id ?? service.name ?? "service"),
        script: String(service.name ?? "unknown script"),
        host: service.host ?? "home",
        threads: service.threads ?? 1,
        type: service.type ?? "UNKNOWN",
        kind: service.kind ?? null,
        pid: Number(service.pid ?? 0),
        args: Array.isArray(service.args) ? service.args : [],
        state,
        tone,
        statusLabel: getStatusLabel({ status, kind, running, state }),
        reason: service.reason ?? "",
        reasonLabel: getReasonLabel(state),
        restartCount: getOptionalNumber(service.restartCount ?? service.restarts ?? service.restartAttempts),
        failureCount: getOptionalNumber(service.failureCount ?? service.failures ?? service.errorCount),
    };
}

function getServiceState({ status, kind, running }) {
    if (status === "failed" || kind === "failed" || status === "error") return "failed";
    if (status === "blocked" || status === "cooldown" || kind === "locked") return "blocked";
    if (status === "completed" || kind === "done") return "completed";
    if (running || status === "running" || status === "started") return "running";

    return "stopped";
}

function getToneForState(state) {
    if (state === "failed") return "failed";
    if (state === "blocked") return "warning";
    if (state === "completed") return "completed";
    if (state === "running") return "running";
    return "stopped";
}

function getStatusLabel({ status, kind, running, state }) {
    if (state === "blocked") return "POLICY BLOCK";
    if (state === "completed") return "DONE";
    if (state === "failed") return "FAILED";
    if (status === "started" || kind === "once") return "STARTED";
    if (running) return "RUNNING";
    return "STOPPED";
}

function getReasonLabel(state) {
    if (state === "blocked") return "blocked";
    if (state === "completed") return "complete";
    if (state === "failed") return "failure";
    return "reason";
}

function getSortPriority(service) {
    const order = {
        failed: 0,
        blocked: 1,
        stopped: 2,
        running: 3,
        completed: 4,
    };

    return order[service.state] ?? 5;
}

function getOverallTone(counts) {
    if (counts.failed > 0) return "failed";
    if (counts.blocked > 0) return "warning";
    return "running";
}

function buildHealthNote(counts) {
    if (counts.failed > 0) return `${counts.failed} service failure(s) need attention.`;
    if (counts.blocked > 0) return `${counts.blocked} service(s) are intentionally blocked by policy or completed conditions.`;
    return "All tracked services are healthy or complete.";
}

function getOptionalNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
