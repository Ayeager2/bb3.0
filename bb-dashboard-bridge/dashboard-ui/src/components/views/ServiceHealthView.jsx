import Row from "../shared/Row.jsx";

export default function ServiceHealthView({ state }) {
    const services = Array.isArray(state?.services) ? state.services : [];

    if (!services.length) {
        return <div className="muted">No service health data available.</div>;
    }

    return (
        <>
            {services.map(service => (
                <Row
                    key={service.id ?? service.name}
                    label={service.id ?? service.name ?? "service"}
                    value={service.running ? "RUNNING" : "STOPPED"}
                    tone={service.running ? "green" : "red"}
                />
            ))}
        </>
    );
}