export function formatMoney(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "unknown";

    return `$${n.toLocaleString(undefined, {
        maximumFractionDigits: 0,
    })}`;
}

export function formatNumber(value, digits = 2) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "unknown";

    return n.toLocaleString(undefined, {
        maximumFractionDigits: digits,
    });
}

export function formatPercent(value, digits = 1) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "unknown";

    return `${(n * 100).toFixed(digits)}%`;
}

export function formatTime(value) {
    if (!value) return "unknown";

    try {
        return new Date(value).toLocaleTimeString();
    } catch {
        return "unknown";
    }
}

export function formatSeconds(ms) {
    const n = Number(ms);

    if (!Number.isFinite(n)) return "unknown";

    return `${(n / 1000).toFixed(1)}s`;
}