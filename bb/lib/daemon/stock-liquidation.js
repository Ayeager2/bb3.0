import { logPurchase } from "/lib/daemon/purchase-log.js";

export function liquidateAllStocks(ns, source = "stock-liquidation") {
    const result = {
        sold: 0,
        longShares: 0,
        shortShares: 0,
        symbols: [],
        proceeds: 0,
        errors: [],
    };

    let symbols;
    try {
        symbols = ns.stock.getSymbols();
    } catch (error) {
        result.errors.push(`Stock symbols unavailable: ${String(error?.message ?? error)}`);
        return result;
    }

    for (const sym of symbols) {
        let longShares;
        let shortShares;
        try {
            const position = ns.stock.getPosition(sym);
            longShares = Number(position?.[0]) || 0;
            shortShares = Number(position?.[2]) || 0;
        } catch (error) {
            result.errors.push(`${sym}: position unavailable: ${String(error?.message ?? error)}`);
            continue;
        }

        if (longShares > 0) {
            const moneyBefore = ns.getPlayer().money;
            try {
                const salePrice = ns.stock.sellStock(sym, longShares);
                const moneyAfter = ns.getPlayer().money;
                result.sold++;
                result.longShares += longShares;
                result.proceeds += Math.max(0, moneyAfter - moneyBefore);
                result.symbols.push(sym);
                logPurchase(ns, {
                    source,
                    type: "stock-sale",
                    item: sym,
                    cost: -Math.max(0, moneyAfter - moneyBefore),
                    price: salePrice,
                    count: longShares,
                    moneyBefore,
                    moneyAfter,
                    message: `[STOCK] Sold ${longShares} ${sym}.`,
                });
            } catch (error) {
                result.errors.push(`${sym}: long sale failed: ${String(error?.message ?? error)}`);
            }
        }

        if (shortShares > 0) {
            const moneyBefore = ns.getPlayer().money;
            try {
                const salePrice = ns.stock.sellShort(sym, shortShares);
                const moneyAfter = ns.getPlayer().money;
                result.sold++;
                result.shortShares += shortShares;
                result.proceeds += Math.max(0, moneyAfter - moneyBefore);
                result.symbols.push(sym);
                logPurchase(ns, {
                    source,
                    type: "stock-sale",
                    item: `${sym} short`,
                    cost: -Math.max(0, moneyAfter - moneyBefore),
                    price: salePrice,
                    count: shortShares,
                    moneyBefore,
                    moneyAfter,
                    message: `[STOCK] Covered ${shortShares} short ${sym}.`,
                });
            } catch (error) {
                result.errors.push(`${sym}: short sale failed: ${String(error?.message ?? error)}`);
            }
        }
    }

    return result;
}

export function describeStockLiquidation(result) {
    const positions = Number(result?.sold) || 0;
    const longShares = Number(result?.longShares) || 0;
    const shortShares = Number(result?.shortShares) || 0;
    const errors = Array.isArray(result?.errors) ? result.errors.length : 0;

    if (positions <= 0 && errors <= 0) return "No stock positions to sell.";

    const parts = [];
    if (longShares > 0) parts.push(`${longShares} long shares`);
    if (shortShares > 0) parts.push(`${shortShares} short shares`);
    if (errors > 0) parts.push(`${errors} sale errors`);

    return `Sold ${parts.join(", ")}.`;
}
