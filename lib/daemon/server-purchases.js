const DEFAULT_CONFIG = {
    baseName: "HomeServer",
    startingMulti: 3,
    maxRam: Math.pow(2, 20),
    scriptsToCopy: ["/workers/h1.js", "/workers/g1.js", "/workers/w1.js"],
};

export async function runServerPurchaser(ns, policy = {}, config = DEFAULT_CONFIG) {
    if (policy.allowServerPurchases === false) {
        return { acted: false, message: "Server purchases paused." };
    }

    const servers = ns.cloud.getServerNames();
    const limit = ns.cloud.getServerLimit();

    const multi = getCurrentRamMulti(ns, servers, config);
    const ram = Math.min(config.maxRam, Math.pow(2, multi));
    const cost = ns.cloud.getServerCost(ram);
    const money = ns.getPlayer().money;
    const reserve = policy.reserveMoney ?? 1_000_000_000;
    const spendable = Math.max(0, money - reserve);

    if (Math.pow(2, multi) >= config.maxRam && servers.length >= limit) {
        return { acted: false, done: true, message: "Server fleet maxed." };
    }

    if (spendable < cost) {
        return { acted: false, message: `Waiting for server funds. Need ${ns.format.number(cost)}.` };
    }

    if (servers.length < limit) {
        const name = getNextServerName(servers, config.baseName);
        const purchased = ns.cloud.purchaseServer(name, ram);

        if (!purchased) {
            return { acted: false, message: `Failed to purchase ${name}.` };
        }

        await ns.scp(config.scriptsToCopy, purchased, "home");

        return {
            acted: true,
            type: "purchase",
            server: purchased,
            message: `Purchased ${purchased} with ${ns.format.ram(ram)}.`,
        };
    }

    const smallest = getSmallestServer(ns, servers);

    if (!smallest || ram <= smallest.ram) {
        return { acted: false, message: "Waiting for next RAM tier." };
    }

    ns.killall(smallest.name);
    ns.cloud.deleteServer(smallest.name);

    return {
        acted: true,
        type: "delete-upgrade",
        server: smallest.name,
        message: `Deleted ${smallest.name} to upgrade fleet to ${ns.format.ram(ram)}.`,
    };
}

function getCurrentRamMulti(ns, servers, config) {
    let multi = config.startingMulti;

    if (servers.length === 0) return multi;

    const currentMaxRam = servers.reduce(
        (max, server) => Math.max(max, ns.getServerMaxRam(server)),
        config.startingMulti
    );

    while (Math.pow(2, multi) < currentMaxRam) {
        multi++;
    }

    if (servers.length >= ns.cloud.getServerLimit()) {
        multi++;
    }

    return multi;
}

function getSmallestServer(ns, servers) {
    return servers
        .map(name => ({
            name,
            ram: ns.getServerMaxRam(name),
        }))
        .sort((a, b) => a.ram - b.ram)[0] ?? null;
}

function getNextServerName(servers, baseName) {
    let max = 0;

    for (const server of servers) {
        if (!server.startsWith(baseName)) continue;

        const suffix = server.slice(baseName.length);
        const number = Number(suffix);

        if (Number.isFinite(number)) {
            max = Math.max(max, number);
        }
    }

    return `${baseName}${max + 1}`;
}