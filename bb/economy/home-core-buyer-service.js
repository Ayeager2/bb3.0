import { logPurchase } from "/lib/daemon/purchase-log.js";

const DEFAULT_REFRESH_MS = 10000;
const DEFAULT_MIN_MONEY = 10_000_000;
const DEFAULT_RESERVE = 5_000_000;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["refresh", DEFAULT_REFRESH_MS],
        ["min-money", DEFAULT_MIN_MONEY],
        ["reserve", DEFAULT_RESERVE],
    ]);

    const refreshMs = Number(flags.refresh) || DEFAULT_REFRESH_MS;
    const minMoney = Number(flags["min-money"]) || DEFAULT_MIN_MONEY;
    const reserve = Number(flags.reserve) || DEFAULT_RESERVE;

    while (true) {
        const moneyBefore = ns.getPlayer().money;
        const spendable = Math.max(0, moneyBefore - reserve);

        if (moneyBefore < minMoney || spendable <= 0) {
            await ns.sleep(refreshMs);
            continue;
        }

        const coresBefore = ns.getServer("home").cpuCores;

        let bought = false;

        try {
            bought = ns.singularity.upgradeHomeCores();
        } catch (error) {
            try {
                bought = ns.upgradeHomeCores();
            } catch (fallbackError) {
                bought = false;
            }
        }

        const moneyAfter = ns.getPlayer().money;
        const coresAfter = ns.getServer("home").cpuCores;

        if (bought || coresAfter > coresBefore) {
            const actualCost = Math.max(0, moneyBefore - moneyAfter);

            const message =
                `[HOME CORE BUYER] Upgraded home cores from ${coresBefore} to ${coresAfter} for ${ns.format.number(actualCost)}.`;

            ns.toast(`Home cores upgraded: ${coresAfter}`, "success", 8000);
            ns.tprint(message);

            logPurchase(ns, {
                source: "home-core-buyer",
                type: "home-core",
                item: `home core ${coresAfter}`,
                cost: actualCost,
                moneyBefore,
                moneyAfter,
                message,
            });
        }

        await ns.sleep(refreshMs);
    }
}