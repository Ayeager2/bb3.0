export default function Card({
    id,
    title,
    children,
    size = "half",
    collapsed = false,
    onToggle,
    onMoveUp,
    onMoveDown,
}) {
    return (
        <section className={`card card-${size}`} data-card-id={id}>
            <div className="card-header">
                <button className="card-toggle" onClick={onToggle}>
                    {collapsed ? "+" : "−"}
                </button>

                <div className="card-title">{title}</div>

                <div className="card-actions">
                    <button onClick={onMoveUp}>↑</button>
                    <button onClick={onMoveDown}>↓</button>
                </div>
            </div>

            {!collapsed && (
                <div className="card-body">
                    {children}
                </div>
            )}
        </section>
    );
}