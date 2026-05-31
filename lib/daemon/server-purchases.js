const SERVER_PREFIX = "Server";
const MIN_SERVER_RAM = 8;
const MAX_UPGRADE_MULTIPLIER = 4;
const MIN_SPENDABLE_AFTER_PURCHASE = 1_000_000;
const RESERVE_PERCENT = 0.15;

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
    const dynamicReserve = Math.max(policyReserve, money * RESERVE_PERCENT);
    const safeSpendable = Math.max(0, money - dynamicReserve);

    const desiredRam = getBestAffordableRam(ns, safeSpendable, maxRam);

    ns.print(
        `Cloud check | owned=${owned.length}/${limit} | ` +
        `money=${ns.format.number(money)} | ` +
        `reserve=${ns.format.number(dynamicReserve)} | ` +
        `spendable=${ns.format.number(safeSpendable)} | ` +
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
        `Purchased ${purchased} with ${ns.format.ram(desiredRam)}.`
    );
}

function upgradeWeakestServer(ns, owned, desiredRam, safeSpendable) {
    const weakest = getWeakestServer(ns, owned);
    if (!weakest) {
        return noAction("No weakest server found.");
    }

    const cappedDesiredRam = Math.min(
        desiredRam,
        weakest.ram * MAX_UPGRADE_MULTIPLIER
    );

    if (cappedDesiredRam <= weakest.ram) {
        return noAction(
            `No upgrade available. Weakest=${ns.format.ram(weakest.ram)}, desired=${ns.format.ram(cappedDesiredRam)}.`
        );
    }

    const upgradeCost = ns.cloud.getServerUpgradeCost(weakest.name, cappedDesiredRam);

    if (!Number.isFinite(upgradeCost) || upgradeCost <= 0) {
        return noAction(`Invalid upgrade cost for ${weakest.name}.`);
    }

    if (safeSpendable - upgradeCost < MIN_SPENDABLE_AFTER_PURCHASE) {
        return noAction("Upgrade would drain too much cash.");
    }

    ns.killall(weakest.name);

    const upgraded = ns.cloud.upgradeServer(weakest.name, cappedDesiredRam);

    if (!upgraded) {
        return noAction(`Failed to upgrade ${weakest.name}.`);
    }

    return acted(
        "upgrade",
        weakest.name,
        `Upgraded ${weakest.name} from ${ns.format.ram(weakest.ram)} to ${ns.format.ram(cappedDesiredRam)}.`
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

function acted(type, server, message) {
    return {
        acted: true,
        type,
        server,
        message,
    };
}

function noAction(message) {
    return {
        acted: false,
        type: "none",
        server: null,
        message,
    };
}