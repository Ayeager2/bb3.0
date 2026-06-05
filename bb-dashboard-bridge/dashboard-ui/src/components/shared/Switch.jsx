//bb-dashboard-bridge\dashboard-ui\src\components\shared\Switch.jsx
import "./Switch.css";

export default function Switch({
    checked = false,
    onChange,
    disabled = false,
    className = "",
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            className={[
                "switch",
                checked ? "switch-on" : "",
                disabled ? "switch-disabled" : "",
                className,
            ].join(" ")}
            onClick={onChange}
        >
            <span />
        </button>
    );
}