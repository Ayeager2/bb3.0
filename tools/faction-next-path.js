const FACTION_STATE_FILE = "/data/faction-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const state = readJson(ns, FACTION_STATE_FILE);
    const target = state?.nextGoal?.server ?? String(ns.args[0] ?? "");

    if (!target) {
        ns.tprint("No next faction server found. Pass one manually:");
        ns.tprint("run /tools/faction-next-path.js avmnite-02h");
        return;
    }

    const path = findPath(ns, "home", target);

    if (!path) {
        ns.tprint(`Could not find server: ${target}`);
        return;
    }

    const connectCommand = path
        .filter(server => server !== "home")
        .map(server => `connect ${server}`)
        .join("; ");

    const fullCommand = `${connectCommand}; backdoor`;

    ns.tprint(`Faction target: ${target}`);
    ns.tprint(path.join(" -> "));
    ns.tprint("");
    ns.tprint("Terminal command:");
    ns.tprint(fullCommand);
}

function findPath(ns, start, target) {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current === target) return path;

        for (const next of ns.scan(current)) {
            if (visited.has(next)) continue;
            if (next.startsWith("box-")) continue;

            visited.add(next);
            queue.push([...path, next]);
        }
    }

    return null;
}

function readJson(ns, file) {
    try {
        if (!ns.fileExists(file, "home")) return {};
        const raw = ns.read(file);
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}