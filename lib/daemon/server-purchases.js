const SERVER_PREFIX = "HomeServer";
const MIN_SERVER_RAM = 8;

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
    const reserve = policy.reserveMoney ?? 0;
    const spendable = Math.max(0, money - reserve);

    const desiredRam = getBestAffordableRam(ns, spendable, maxRam);

    ns.print(
        `Cloud check | owned=${owned.length}/${limit} | ` +
        `money=${ns.format.number(money)} | ` +
        `reserve=${ns.format.number(reserve)} | ` +
        `spendable=${ns.format.number(spendable)} | ` +
        `maxRam=${ns.format.ram(maxRam)} | ` +
        `desiredRam=${ns.format.ram(desiredRam)}`
    );

    if (desiredRam < MIN_SERVER_RAM) {
        return noAction("No affordable server RAM tier.");
    }

    if (owned.length < limit) {
        const name = getNextServerName(ns);
        const purchased = ns.cloud.purchaseServer(name, desiredRam);

        if (!purchased) {
            return noAction(`Purchase failed for ${name}.`);
        }

        return acted("buy", purchased, `Purchased ${purchased} with ${ns.format.ram(desiredRam)}.`);
    }

    const weakest = getWeakestServer(ns, owned);
    if (!weakest) return noAction("No weakest server found.");

    if (desiredRam <= weakest.ram) {
        return noAction(
            `No upgrade available. Weakest=${ns.format.ram(weakest.ram)}, desired=${ns.format.ram(desiredRam)}.`
        );
    }

    const upgradeCost = ns.cloud.getServerUpgradeCost(weakest.name, desiredRam);
    if (upgradeCost > spendable) {
        return noAction(`Upgrade too expensive: ${ns.format.number(upgradeCost)}.`);
    }

    ns.killall(weakest.name);

    const upgraded = ns.cloud.upgradeServer(weakest.name, desiredRam);

    if (!upgraded) {
        return noAction(`Failed to upgrade ${weakest.name}.`);
    }

    return acted(
        "upgrade",
        weakest.name,
        `Upgraded ${weakest.name} from ${ns.format.ram(weakest.ram)} to ${ns.format.ram(desiredRam)}.`
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
    return { acted: true, type, server, message };
}

function noAction(message) {
    return { acted: false, type: "none", server: null, message };
}