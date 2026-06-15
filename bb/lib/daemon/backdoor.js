// /lib/daemon/backdoor.js

const PROGRESSION_SERVERS = [
    { server: "CSEC", faction: "CyberSec" },
    { server: "avmnite-02h", faction: "NiteSec" },
    { server: "I.I.I.I", faction: "The Black Hand" },
    { server: "run4theh111z", faction: "BitRunners" },
    { server: "w0r1d_d43m0n", faction: "Daedalus" },
];

export function buildBackdoorState(ns) {
    const progressionServers = PROGRESSION_SERVERS.map((entry) =>
        buildServerState(ns, entry)
    );

    return {
        progressionServers,
        nextTarget: progressionServers.find((x) => x.recommended) ?? null,
        readyCount: progressionServers.filter((x) => x.recommended).length,
    };
}

export function findNextBackdoorTarget(ns) {
    return buildBackdoorState(ns).nextTarget;
}

function buildServerState(ns, entry) {
    if (!safeServerExists(ns, entry.server)) {
        return {
            server: entry.server,
            faction: entry.faction,
            exists: false,
            rooted: false,
            backdoored: false,
            hackingEligible: false,
            playerHack: safeHackingLevel(ns),
            requiredHack: null,
            recommended: false,
            path: [],
            reason: "server not discovered or not available yet",
        };
    }

    const server = ns.getServer(entry.server);
    const playerHack = safeHackingLevel(ns);
    const requiredHack = ns.getServerRequiredHackingLevel(entry.server);
    const rooted = ns.hasRootAccess(entry.server);
    const backdoored = server.backdoorInstalled === true;
    const hackingEligible = playerHack >= requiredHack;
    const requiredPorts = safeRequiredPorts(ns, entry.server);
    const availablePorts = countAvailablePortPrograms(ns);

    return {
        server: entry.server,
        faction: entry.faction,
        exists: true,
        rooted,
        backdoored,
        hackingEligible,
        playerHack,
        requiredHack,
        requiredPorts,
        availablePorts,
        portsReady: availablePorts >= requiredPorts,
        recommended: rooted && !backdoored && hackingEligible,
        path: findPath(ns, entry.server),
        reason: buildReason(rooted, backdoored, hackingEligible, availablePorts, requiredPorts),
    };
}

function buildReason(rooted, backdoored, hackingEligible, availablePorts = 0, requiredPorts = 0) {
    if (backdoored) return "already backdoored";
    if (!rooted && availablePorts < requiredPorts) {
        return `needs root access; ports ${availablePorts}/${requiredPorts}`;
    }
    if (!rooted) return "needs root access";
    if (!hackingEligible) return "hacking level too low";
    return "ready for backdoor";
}

function safeServerExists(ns, server) {
    try {
        return ns.serverExists(server);
    } catch {
        return false;
    }
}

function safeHackingLevel(ns) {
    try {
        return ns.getHackingLevel();
    } catch {
        return 1;
    }
}

function safeRequiredPorts(ns, server) {
    try {
        return ns.getServerNumPortsRequired(server);
    } catch {
        return 0;
    }
}

function countAvailablePortPrograms(ns) {
    const programs = [
        "BruteSSH.exe",
        "FTPCrack.exe",
        "relaySMTP.exe",
        "HTTPWorm.exe",
        "SQLInject.exe",
    ];

    return programs.filter(program => {
        try {
            return ns.fileExists(program, "home");
        } catch {
            return false;
        }
    }).length;
}

function findPath(ns, target) {
    if (!safeServerExists(ns, target)) {
        return [];
    }

    const queue = [["home"]];
    const visited = new Set();

    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];

        if (node === target) {
            return path;
        }

        if (visited.has(node)) continue;

        visited.add(node);

        for (const next of ns.scan(node)) {
            if (!visited.has(next)) {
                queue.push([...path, next]);
            }
        }
    }

    return [];
}
