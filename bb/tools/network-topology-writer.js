// /tools/network-topology-writer.js

const OUT_FILE = "/data/ui/network-topology.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const flags = ns.flags([
        ["once", false],
        ["refresh", 10000],
    ]);

    const refreshMs = Number(flags.refresh) || 10000;

    while (true) {
        const topology = buildTopology(ns);

        ns.write(OUT_FILE, JSON.stringify(topology, null, 2), "w");

        ns.clearLog();
        ns.print(`Writing ${OUT_FILE}`);
        ns.print(`Servers: ${topology.nodes.length}`);
        ns.print(`Edges: ${topology.edges.length}`);

        if (flags.once) {
            ns.tprint(`Wrote ${OUT_FILE}`);
            return;
        }

        await ns.sleep(refreshMs);
    }
}

function buildTopology(ns) {
    const visited = new Set(["home"]);
    const queue = ["home"];
    const edges = [];

    while (queue.length > 0) {
        const current = queue.shift();

        let neighbors = [];
        try {
            neighbors = ns.scan(current);
        } catch {
            neighbors = [];
        }

        for (const next of neighbors) {
            edges.push({
                source: current,
                target: next,
            });

            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }

    const paths = buildPathsFromHome(edges);
    const nodes = [...visited].map(server => ({
        ...getServerNode(ns, server),
        pathFromHome: paths[server] ?? [],
    }));

    return {
        schemaVersion: 1,
        updatedAt: Date.now(),
        nodes,
        edges: dedupeEdges(edges),
    };
}

function getServerNode(ns, server) {
    let info = {
        id: server,
        label: server,
        rooted: false,
        backdoored: false,
        maxRam: 0,
        requiredHack: 0,
        moneyMax: 0,
        moneyAvailable: 0,
        moneyPercent: 0,
        securityDiff: 0,
        prepWarning: false,
        minSecurity: 0,
        security: 0,
        purchased: false,
        type: "normal",
        factionServer: isFactionServer(server),
        needsBackdoor: false,
    };

    try {
        const s = ns.getServer(server);

        info = {
            ...info,
            rooted: Boolean(s.hasAdminRights),
            backdoored: Boolean(s.backdoorInstalled),
            maxRam: Number(s.maxRam ?? 0),
            requiredHack: Number(s.requiredHackingSkill ?? 0),
            moneyMax: Number(s.moneyMax ?? 0),
            moneyAvailable: Number(s.moneyAvailable ?? 0),
            moneyPercent: getMoneyPercent(s),
            securityDiff: getSecurityDiff(s),
            prepWarning: getPrepWarning(s),
            minSecurity: Number(s.minDifficulty ?? 0),
            security: Number(s.hackDifficulty ?? 0),
            purchased: Boolean(s.purchasedByPlayer),
            type: classifyServer(server, s),
            factionServer: isFactionServer(server),
            needsBackdoor: isFactionServer(server) && !Boolean(s.backdoorInstalled),
        };
    } catch {
        // Keep defaults.
    }

    return info;
}

function classifyServer(server, s) {
    if (server === "home") return "home";
    if (server === "w0r1d_d43m0n") return "world";
    if (s.purchasedByPlayer) return "purchased";
    if (s.backdoorInstalled) return "backdoored";
    if (s.hasAdminRights) return "rooted";
    return "locked";
}

function dedupeEdges(edges) {
    const seen = new Set();
    const result = [];

    for (const edge of edges) {
        const key = [edge.source, edge.target].sort().join("::");
        if (seen.has(key)) continue;

        seen.add(key);
        result.push(edge);
    }

    return result;
}

function buildPathsFromHome(edges) {
    const graph = {};

    for (const edge of edges) {
        if (!graph[edge.source]) graph[edge.source] = [];
        if (!graph[edge.target]) graph[edge.target] = [];

        graph[edge.source].push(edge.target);
        graph[edge.target].push(edge.source);
    }

    const paths = { home: ["home"] };
    const queue = ["home"];

    while (queue.length > 0) {
        const current = queue.shift();

        for (const next of graph[current] ?? []) {
            if (paths[next]) continue;

            paths[next] = [...paths[current], next];
            queue.push(next);
        }
    }

    return paths;
}

function isFactionServer(server) {
    return [
        "CSEC",
        "avmnite-02h",
        "I.I.I.I",
        "run4theh111z",
        "The-Cave",
        "w0r1d_d43m0n",
    ].includes(server);
}

function getMoneyPercent(s) {
    const money = Number(s.moneyAvailable ?? 0);
    const max = Number(s.moneyMax ?? 0);

    if (!Number.isFinite(money) || !Number.isFinite(max) || max <= 0) {
        return 0;
    }

    return money / max;
}

function getSecurityDiff(s) {
    const current = Number(s.hackDifficulty ?? 0);
    const min = Number(s.minDifficulty ?? 0);

    if (!Number.isFinite(current) || !Number.isFinite(min)) {
        return 0;
    }

    return Math.max(0, current - min);
}

function getPrepWarning(s) {
    const moneyPercent = getMoneyPercent(s);
    const securityDiff = getSecurityDiff(s);
    const maxMoney = Number(s.moneyMax ?? 0);

    if (maxMoney <= 0) return false;

    return moneyPercent < 0.8 || securityDiff > 5;
}