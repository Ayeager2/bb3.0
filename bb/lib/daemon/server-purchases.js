// /lib/daemon/server-purchases.js

const SERVER_PREFIX = "Server";

const MIN_SERVER_RAM = 8;
const MIN_USEFUL_SERVER_RAM = 64;
const MIN_SERVERS_BEFORE_RAM_FLOOR = 8;

const MAX_UPGRADE_MULTIPLIER = 16;

const MIN_SPENDABLE_AFTER_PURCHASE = 1_000_000;

const RESERVE_PERCENT = 0.15;
const EARLY_MIN_RESERVE = 1_000_000;

const PRE_FORMULAS_MAX_UPGRADE_COST = 10_000_000_000;
const DEFAULT_MAX_ACTIONS_PER_CYCLE = 25;

export async function runServerPurchaser(ns, policy = {}) {
    if (!ns.cloud) {
        return noAction("Cloud API unavailable.");
    }

    if (policy.allowServerPurchases !== true) {
        return noAction("Server purchases blocked by policy.");
    }

    const maxActions =
        Math.max(
            1,
            Math.floor(
                Number(policy.maxServerPurchasesPerCycle) ||
                DEFAULT_MAX_ACTIONS_PER_CYCLE
            )
        );
    const purchases = [];
    let lastResult = null;
    let totalCost = 0;

    for (let i = 0; i < maxActions; i++) {
        const result =
            runServerPurchaserOnce(ns, policy);

        lastResult = result;

        if (result?.acted !== true) {
            break;
        }

        purchases.push(result);
        totalCost += Number(result.cost) || 0;

        await ns.sleep(0);
    }

    if (purchases.length === 0) {
        return lastResult ?? noAction("No server purchase action.");
    }

    const lastPurchase =
        purchases[purchases.length - 1];
    const summary =
        summarizePurchases(ns, purchases);

    return {
        acted: true,
        type: lastPurchase.type ?? "server",
        server: lastPurchase.server ?? null,
        item: lastPurchase.item ?? lastPurchase.server ?? "cloud server",
        ram: lastPurchase.ram ?? null,
        previousRam: lastPurchase.previousRam ?? null,
        cost: totalCost,
        message:
            `${purchases.length} cloud action${purchases.length === 1 ? "" : "s"} for ` +
            `${ns.format.number(totalCost)}: ${summary}.`,
        purchases,
        lastResult,
        stoppedReason:
            lastResult?.acted === false
                ? lastResult.message
                : purchases.length >= maxActions
                    ? `Reached max actions per cycle (${maxActions}).`
                    : null,
    };
}

function runServerPurchaserOnce(ns, policy = {}) {
    const hasFormulas =
        ns.fileExists("Formulas.exe", "home");

    const maxUpgradeCost =
        policy.maxServerUpgradeCost ??
        (
            hasFormulas
                ? Number.POSITIVE_INFINITY
                : PRE_FORMULAS_MAX_UPGRADE_COST
        );

    const limit = ns.cloud.getServerLimit();
    const maxRam = ns.cloud.getRamLimit();
    const owned = ns.cloud.getServerNames();

    const money = ns.getPlayer().money;

    const policyReserve =
        policy.reserveMoney ?? 0;

    const reserve =
        getEffectiveReserve(
            money,
            policyReserve
        );

    const safeSpendable =
        Math.max(0, money - reserve);

    const budget =
        Math.max(
            0,
            safeSpendable - MIN_SPENDABLE_AFTER_PURCHASE
        );

    const desiredRamRaw =
        getBestAffordableRam(
            ns,
            budget,
            maxRam
        );

    const desiredRam =
        applyUsefulRamFloor(
            ns,
            desiredRamRaw,
            owned.length,
            budget,
            maxRam
        );

    ns.print(
        `Cloud check | ` +
        `owned=${owned.length}/${limit} | ` +
        `money=${ns.format.number(money)} | ` +
        `reserve=${ns.format.number(reserve)} | ` +
        `spendable=${ns.format.number(safeSpendable)} | ` +
        `budget=${ns.format.number(budget)} | ` +
        `maxRam=${ns.format.ram(maxRam)} | ` +
        `desiredRam=${ns.format.ram(desiredRam)} | ` +
        `formulas=${hasFormulas ? "YES" : "NO"} | ` +
        `upgradeCap=${Number.isFinite(maxUpgradeCost)
            ? ns.format.number(maxUpgradeCost)
            : "NONE"
        }`
    );

    if (safeSpendable < MIN_SPENDABLE_AFTER_PURCHASE) {
        return noAction(
            "Not enough safe spendable cash."
        );
    }

    if (desiredRam < MIN_SERVER_RAM) {
        return noAction(
            "No affordable server RAM tier."
        );
    }

    if (owned.length < limit) {
        return buyNewServer(
            ns,
            desiredRam,
            safeSpendable,
            maxUpgradeCost
        );
    }

    return upgradeWeakestServer(
        ns,
        owned,
        safeSpendable,
        maxRam,
        maxUpgradeCost,
        hasFormulas
    );
}

function summarizePurchases(ns, purchases) {
    const counts = new Map();

    for (const purchase of purchases) {
        const key =
            purchase.type === "upgrade"
                ? `${purchase.server} ${ns.format.ram(purchase.previousRam)} -> ${ns.format.ram(purchase.ram)}`
                : `${purchase.server} ${ns.format.ram(purchase.ram)}`;

        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
        .map(([label, count]) => count > 1 ? `${label} x${count}` : label)
        .join("; ");
}

function getEffectiveReserve(
    money,
    policyReserve
) {
    const percentReserve =
        money * RESERVE_PERCENT;

    if (policyReserve > money) {
        return Math.max(
            EARLY_MIN_RESERVE,
            percentReserve
        );
    }

    return Math.max(
        policyReserve,
        percentReserve
    );
}

function buyNewServer(
    ns,
    desiredRam,
    safeSpendable,
    maxUpgradeCost
) {
    const cost =
        ns.cloud.getServerCost(desiredRam);

    if (
        Number.isFinite(maxUpgradeCost) &&
        cost > maxUpgradeCost
    ) {
        return noAction(
            `Purchase blocked by pre-Formulas cap (${ns.format.number(cost)} > ${ns.format.number(maxUpgradeCost)}).`
        );
    }

    if (
        safeSpendable - cost <
        MIN_SPENDABLE_AFTER_PURCHASE
    ) {
        return noAction(
            "Purchase would drain too much cash."
        );
    }

    const name = getNextServerName(ns);

    const purchased =
        ns.cloud.purchaseServer(
            name,
            desiredRam
        );

    if (!purchased) {
        return noAction(
            `Purchase failed for ${name}.`
        );
    }

    return acted(
        "buy",
        purchased,
        desiredRam,
        null,
        cost,
        `Purchased ${purchased} with ${ns.format.ram(desiredRam)}.`
    );
}

function upgradeWeakestServer(
    ns,
    owned,
    safeSpendable,
    maxRam,
    maxUpgradeCost,
    hasFormulas
) {
    const weakest =
        getWeakestServer(ns, owned);

    if (!weakest) {
        return noAction(
            "No weakest server found."
        );
    }

    const desiredRam =
        getBestAffordableUpgradeRam(
            ns,
            weakest.name,
            weakest.ram,
            safeSpendable,
            maxRam,
            maxUpgradeCost
        );

    if (desiredRam <= weakest.ram) {
        return noAction(
            `No affordable upgrade larger than weakest ${ns.format.ram(weakest.ram)}.`
        );
    }

    let targetRam = desiredRam;

    while (targetRam > weakest.ram) {
        const upgradeCost =
            ns.cloud.getServerUpgradeCost(
                weakest.name,
                targetRam
            );

        if (
            Number.isFinite(maxUpgradeCost) &&
            upgradeCost > maxUpgradeCost
        ) {
            if (!hasFormulas) {
                ns.print(
                    `[SERVER PURCHASER] ` +
                    `Skipping ${weakest.name} -> ${ns.format.ram(targetRam)} ` +
                    `(${ns.format.number(upgradeCost)}) until Formulas.exe is purchased.`
                );
            }

            targetRam =
                Math.floor(targetRam / 2);

            continue;
        }

        if (
            Number.isFinite(upgradeCost) &&
            upgradeCost > 0 &&
            safeSpendable - upgradeCost >=
            MIN_SPENDABLE_AFTER_PURCHASE
        ) {
            ns.killall(weakest.name);

            const upgraded =
                ns.cloud.upgradeServer(
                    weakest.name,
                    targetRam
                );

            if (!upgraded) {
                return noAction(
                    `Failed to upgrade ${weakest.name}.`
                );
            }

            return acted(
                "upgrade",
                weakest.name,
                targetRam,
                weakest.ram,
                upgradeCost,
                `Upgraded ${weakest.name} from ${ns.format.ram(weakest.ram)} to ${ns.format.ram(targetRam)}.`
            );
        }

        targetRam =
            Math.floor(targetRam / 2);
    }

    return noAction(
        `No affordable upgrade. Weakest=${ns.format.ram(weakest.ram)}, desired=${ns.format.ram(desiredRam)}.`
    );
}

function getBestAffordableRam(
    ns,
    spendable,
    maxRam
) {
    let best = 0;
    let ram = MIN_SERVER_RAM;

    while (ram <= maxRam) {
        const cost =
            ns.cloud.getServerCost(ram);

        if (
            !Number.isFinite(cost) ||
            cost <= 0
        ) {
            break;
        }

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

        if (!ns.serverExists(name)) {
            return name;
        }
    }

    return `${SERVER_PREFIX}-${Date.now()}`;
}

function acted(
    type,
    server,
    ram,
    previousRam,
    cost,
    message
) {
    return {
        acted: true,
        type,
        server,
        item: server,
        ram,
        previousRam,
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

function applyUsefulRamFloor(
    ns,
    desiredRam,
    ownedCount,
    budget,
    maxRam
) {
    if (
        ownedCount <
        MIN_SERVERS_BEFORE_RAM_FLOOR
    ) {
        return desiredRam;
    }

    if (
        desiredRam >=
        MIN_USEFUL_SERVER_RAM
    ) {
        return desiredRam;
    }

    const floorRam =
        Math.min(
            MIN_USEFUL_SERVER_RAM,
            maxRam
        );

    const floorCost =
        ns.cloud.getServerCost(floorRam);

    if (
        Number.isFinite(floorCost) &&
        floorCost > 0 &&
        floorCost <= budget
    ) {
        return floorRam;
    }

    return desiredRam;
}

function getBestAffordableUpgradeRam(
    ns,
    server,
    currentRam,
    safeSpendable,
    maxRam,
    maxUpgradeCost
) {
    const current =
        Math.max(0, Number(currentRam) || 0);
    const max =
        Math.max(current, Number(maxRam) || current);
    const budget =
        Math.max(
            0,
            Number(safeSpendable) -
            MIN_SPENDABLE_AFTER_PURCHASE
        );

    if (current <= 0 || max <= current || budget <= 0) {
        return current;
    }

    let targetRam =
        Math.min(
            max,
            current * MAX_UPGRADE_MULTIPLIER
        );

    while (targetRam > current) {
        const cost =
            ns.cloud.getServerUpgradeCost(
                server,
                targetRam
            );

        if (
            Number.isFinite(cost) &&
            cost > 0 &&
            cost <= budget &&
            (
                !Number.isFinite(maxUpgradeCost) ||
                cost <= maxUpgradeCost
            )
        ) {
            return targetRam;
        }

        targetRam =
            Math.floor(targetRam / 2);
    }

    return current;
}
