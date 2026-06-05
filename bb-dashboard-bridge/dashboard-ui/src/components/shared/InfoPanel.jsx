import "./InfoPanel.css";

export default function InfoPanel({
    title,
    subtitle,
    children,
    muted = false,
    className = "",
}) {
    return (
        <div className={`info-panel ${muted ? "info-panel-muted" : ""} ${className}`}>
            {(title || subtitle) && (
                <div className="info-panel-header">
                    {title && <div className="info-panel-title">{title}</div>}
                    {subtitle && <div className="info-panel-subtitle">{subtitle}</div>}
                </div>
            )}

            <div className="info-panel-body">
                {children}
            </div>
        </div>
    );
}