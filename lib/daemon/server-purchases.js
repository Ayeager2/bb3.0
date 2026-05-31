const SERVER_PREFIX = "Server";
const MIN_SERVER_RAM = 8;
const MAX_UPGRADE_MULTIPLIER = 4;
const MIN_SPENDABLE_AFTER_PURCHASE = 1_000_000;
const RESERVE_PERCENT = 0.15;
const EARLY_MIN_RESERVE = 1_000_000;

export async function runServerPurchaser(ns, policy = {}) {
    if (!ns.cloud) {
        return noAction("Cloud API unavailable.");
    }

    if (policy.allowServerPurchases !== true) {
        return noAction("Server purchases blocked by policy.");
    }

    const limit = ns.cloud.getServerLimit();
    const maxRam = ns.cloud.getRamLimit();
    const owned = ns.cloud.getServerNames();

    const money = ns.getPlayer().money;
    const policyReserve = policy.reserveMoney ?? 0;
    const reserve = getEffectiveReserve(money, policyReserve);
    const safeSpendable = Math.max(0, money - reserve);
    const budget = Math.max(0, safeSpendable - MIN_SPENDABLE_AFTER_PURCHASE);

    const desiredRam = getBestAffordableRam(ns, budget, maxRam);

    ns.print(
        `Cloud check | owned=${owned.length}/${limit} | ` +
        `money=${ns.format.number(money)} | ` +
        `reserve=${ns.format.number(reserve)} | ` +
        `spendable=${ns.format.number(safeSpendable)} | ` +
        `budget=${ns.format.number(budget)} | ` +
        `maxRam=${ns.format.ram(maxRam)} | ` +
        `desiredRam=${ns.format.ram(desiredRam)}`
    );

    if (safeSpendable < MIN_SPENDABLE_AFTER_PURCHASE) {
        return noAction("Not enough safe spendable cash.");
    }

    if (desiredRam < MIN_SERVER_RAM) {
        return noAction("No affordable server RAM tier.");
    }

    if (owned.length < limit) {
        return buyNewServer(ns, desiredRam, safeSpendable);
    }

    return upgradeWeakestServer(ns, owned, desiredRam, safeSpendable);
}

function getEffectiveReserve(money, policyReserve) {
    const percentReserve = money * RESERVE_PERCENT;

    // If policy reserve is larger than current money, it would freeze early growth.
    // Use a smaller early-game reserve instead.
    if (policyReserve > money) {
        return Math.max(EARLY_MIN_RESERVE, percentReserve);
    }

    return Math.max(policyReserve, percentReserve);
}

function buyNewServer(ns, desiredRam, safeSpendable) {
    const cost = ns.cloud.getServerCost(desiredRam);

    if (safeSpendable - cost < MIN_SPENDABLE_AFTER_PURCHASE) {
        return noAction("Purchase would drain too much cash.");
    }

    const name = getNextServerName(ns);
    const purchased = ns.cloud.purchaseServer(name, desiredRam);

    if (!purchased) {
        return noAction(`Purchase failed for ${name}.`);
    }

    return acted(
        "buy",
        purchased,
        cost,
        `Purchased ${purchased} with ${ns.format.ram(desiredRam)}.`
    );
}

function upgradeWeakestServer(ns, owned, desiredRam, safeSpendable) {
    const weakest = getWeakestServer(ns, owned);
    if (!weakest) {
        return noAction("No weakest server found.");
    }

    let targetRam = Math.min(
        desiredRam,
        weakest.ram * MAX_UPGRADE_MULTIPLIER
    );

    while (targetRam > weakest.ram) {
        const upgradeCost = ns.cloud.getServerUpgradeCost(weakest.name, targetRam);

        if (
            Number.isFinite(upgradeCost) &&
            upgradeCost > 0 &&
            safeSpendable - upgradeCost >= MIN_SPENDABLE_AFTER_PURCHASE
        ) {
            ns.killall(weakest.name);

            const upgraded = ns.cloud.upgradeServer(weakest.name, targetRam);

            if (!upgraded) {
                return noAction(`Failed to upgrade ${weakest.name}.`);
            }

            return acted(
                "upgrade",
                weakest.name,
                upgradeCost,
                `Upgraded ${weakest.name} from ${ns.format.ram(weakest.ram)} to ${ns.format.ram(targetRam)}.`
            );
        }

        targetRam = targetRam / 2;
    }

    return noAction(
        `No affordable upgrade. Weakest=${ns.format.ram(weakest.ram)}, desired=${ns.format.ram(desiredRam)}.`
    );
}

function getBestAffordableRam(ns, spendable, maxRam) {
    let best = 0;
    let ram = MIN_SERVER_RAM;

    while (ram <= maxRam) {
        const cost = ns.cloud.getServerCost(ram);

        if (!Number.isFinite(cost) || cost <= 0) break;

        if (cost <= spendable) {
            best = ram;
            ram *= 2;
            continue;
        }

        break;
    }

    return best;
}

function getWeakestServer(ns, servers) {
    return servers
        .map(name => ({
            name,
            ram: ns.getServerMaxRam(name),
        }))
        .sort((a, b) => a.ram - b.ram)[0] ?? null;
}

function getNextServerName(ns) {
    for (let i = 1; i <= 9999; i++) {
        const name = `${SERVER_PREFIX}${i}`;
        if (!ns.serverExists(name)) return name;
    }

    return `${SERVER_PREFIX}-${Date.now()}`;
}

function acted(type, server, cost, message) {
    return {
        acted: true,
        type,
        server,
        item: server,
        cost,
        message,
    };
}

function noAction(message) {
    return {
        acted: false,
        type: "none",
        server: null,
        cost: 0,
        message,
    };
}