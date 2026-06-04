const PURCHASE_LOG_FILE = "/data/purchases.log.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const lines = readLines(ns, PURCHASE_LOG_FILE);

    ns.tprint("Purchase Log");
    ns.tprint("=".repeat(80));

    if (lines.length === 0) {
        ns.tprint("No purchases recorded.");
        return;
    }

    const recent = lines.slice(-25);

    for (const raw of recent) {
        try {
            const entry = JSON.parse(raw);

            ns.tprint(
                `[${entry.timeText}] ` +
                `[${entry.source}] ` +
                `${entry.item} | ` +
                `cost=${formatMoney(entry.cost)} | ` +
                `after=${formatMoney(entry.moneyAfter)}`
            );
        } catch {
            ns.tprint(raw);
        }
    }
}

function readLines(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return [];

        return ns.read(file)
            .split("\n")
            .map(x => x.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function formatMoney(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "$0";

    const abs = Math.abs(n);

    if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}t`;
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}b`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}k`;

    return `$${n.toFixed(0)}`;
}