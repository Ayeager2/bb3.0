const PURCHASE_LOG_FILE = "/data/purchases.log.txt";
const PURCHASE_STATE_FILE = "/data/purchases-state.txt";

export function logPurchase(ns, event = {}) {
    const entry = {
        time: Date.now(),
        timeText: new Date().toLocaleTimeString(),
        source: event.source ?? "unknown",
        type: event.type ?? "purchase",
        item: event.item ?? "unknown",
        cost: event.cost ?? null,
        moneyBefore: event.moneyBefore ?? null,
        moneyAfter: event.moneyAfter ?? ns.getPlayer().money,
        message: event.message ?? "",
    };

    ns.write(PURCHASE_LOG_FILE, JSON.stringify(entry) + "\n", "a");
    ns.write(PURCHASE_STATE_FILE, JSON.stringify(entry, null, 2), "w");

    return entry;
}