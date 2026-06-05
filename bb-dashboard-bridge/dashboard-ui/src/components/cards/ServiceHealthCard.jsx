import Card from "../shared/Card.jsx";
import Row from "../shared/Row.jsx";

export default function ServiceHealthCard({
    state,
    id,
    collapsed,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    const services = state?.services ?? [];

    const running = services.filter(s => s.status === "running").length;
    const failed = services.filter(s => s.status === "failed").length;
    const blocked = services.filter(s => s.status === "blocked").length;
    const total = services.length;

    const important = services
        .filter(s => s.status === "failed" || s.status === "blocked")
        .slice(0, 8);

    return (
        <Card
            id={id}
            title="Service Health"
            size="half"
            collapsed={collapsed}
            onToggle={onToggle}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        >
            <Row label="Total" value={total} tone="cyan" />
            <Row label="Running" value={running} tone="green" />
            <Row label="Blocked" value={blocked} tone={blocked ? "yellow" : "muted"} />
            <Row label="Failed" value={failed} tone={failed ? "red" : "green"} />

            <div className="service-list">
                {important.length === 0 && (
                    <div className="muted">No blocked or failed services.</div>
                )}

                {important.map(service => (
                    <div key={service.id ?? service.key} className={`service-line service-${service.status}`}>
                        <div className="service-name">{service.id ?? service.name ?? "unknown"}</div>
                        <div className="service-status">{service.status ?? "unknown"}</div>
                        <div className="service-reason">{service.reason ?? "no reason"}</div>
                    </div>
                ))}
            </div>
        </Card>
    );
}