//lib/daemon/purchase-log.js
const PURCHASE_LOG_FILE = "/data/purchases.log.txt";
const PURCHASE_STATE_FILE = "/data/purchases-state.txt";

export function logPurchase(ns, event = {}) {
    const entry = {
        time: Date.now(),
        timeText: new Date().toLocaleTimeString(),
        source: event.source ?? "unknown",
        type: event.type ?? "purchase",
        category: event.category ?? getPurchaseCategory(event),
        item: event.item ?? "unknown",
        cost: event.cost ?? null,
        moneyBefore: event.moneyBefore ?? null,
        moneyAfter: event.moneyAfter ?? ns.getPlayer().money,
        message: event.message ?? "",
        details: event.details ?? null,
        purchases: Array.isArray(event.purchases) ? event.purchases : [],
    };

    ns.write(PURCHASE_LOG_FILE, JSON.stringify(entry) + "\n", "a");
    ns.write(PURCHASE_STATE_FILE, JSON.stringify(entry, null, 2), "w");

    return entry;
}

function getPurchaseCategory(event) {
    const source =
        String(event.source ?? "").toLowerCase();
    const type =
        String(event.type ?? "").toLowerCase();
    const item =
        String(event.item ?? "").toLowerCase();

    if (source.includes("augment") || type.includes("augment")) return "augmentations";
    if (source.includes("hacknet") || type.includes("hacknet") || item.includes("hacknet")) return "hacknet";
    if (source.includes("stock") || type.includes("stock") || type.includes("market")) return "stocks";
    if (source.includes("darkweb") || type.includes("program") || item.endsWith(".exe")) return "programs";
    if (source.includes("home") || item.includes("home ram") || item.includes("home core")) return "home";
    if (source.includes("server") || type.includes("server")) return "servers";
    if (source.includes("faction") || type.includes("donation")) return "factions";

    return "other";
}
